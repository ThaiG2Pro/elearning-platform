import { promises as dns } from 'dns';
import net from 'net';
import axios, { AxiosResponse } from 'axios';

/**
 * SSRF guard for every server-side request whose target URL comes from a user
 * (web sources pasted into a space, BYOK base URLs, …).
 *
 * Layers:
 *  1. `isPublicHttpUrlSyntax` — cheap, sync: scheme, no credentials, hostname
 *     not localhost / *.internal / *.local / an IP literal in a private range.
 *  2. `assertPublicHttpUrl` — async: also resolves the hostname and rejects
 *     when ANY resolved address is non-public (blocks DNS names that point at
 *     127.0.0.1, 169.254.169.254, Docker service IPs, …).
 *  3. `fetchPublicUrl` — axios GET with redirects disabled at the transport
 *     level; each hop is re-validated through (2) before being followed, the
 *     body is size-capped and the request times out.
 *
 * Known limitation: resolve-then-connect leaves a small DNS-rebinding window
 * (TOCTOU). Closing it needs a custom agent that pins the resolved IP; not
 * done here.
 */

export const UNSAFE_URL = 'UNSAFE_URL';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback']);
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.internal', '.local', '.localdomain', '.home.arpa'];

function ipv4ToInt(ip: string): number {
    return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function inCidr4(ip: number, base: string, bits: number): boolean {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ip & mask) === (ipv4ToInt(base) & mask);
}

/** RFC1918, loopback, link-local, CGNAT, multicast, reserved, "this" network… */
export function isPrivateIPv4(ip: string): boolean {
    const n = ipv4ToInt(ip);
    return (
        inCidr4(n, '0.0.0.0', 8) ||
        inCidr4(n, '10.0.0.0', 8) ||
        inCidr4(n, '100.64.0.0', 10) ||
        inCidr4(n, '127.0.0.0', 8) ||
        inCidr4(n, '169.254.0.0', 16) ||
        inCidr4(n, '172.16.0.0', 12) ||
        inCidr4(n, '192.0.0.0', 24) ||
        inCidr4(n, '192.0.2.0', 24) ||
        inCidr4(n, '192.168.0.0', 16) ||
        inCidr4(n, '198.18.0.0', 15) ||
        inCidr4(n, '198.51.100.0', 24) ||
        inCidr4(n, '203.0.113.0', 24) ||
        inCidr4(n, '224.0.0.0', 4) ||
        inCidr4(n, '240.0.0.0', 4)
    );
}

/** Expand an IPv6 textual address into 8 16-bit groups. */
function expandIPv6(ip: string): number[] | null {
    let addr = ip.toLowerCase();
    // Strip zone id (fe80::1%eth0)
    addr = addr.split('%')[0];
    // IPv4-mapped tail: ::ffff:1.2.3.4
    const v4Match = addr.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
    if (v4Match) {
        const v4 = ipv4ToInt(v4Match[2]);
        addr = `${v4Match[1]}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
    }
    const halves = addr.split('::');
    if (halves.length > 2) return null;
    const head = halves[0] ? halves[0].split(':') : [];
    const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const missing = 8 - head.length - tail.length;
    if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
    const groups = [...head, ...Array(missing).fill('0'), ...tail].map((g) => parseInt(g || '0', 16));
    return groups.some((g) => Number.isNaN(g)) ? null : groups;
}

export function isPrivateIPv6(ip: string): boolean {
    const g = expandIPv6(ip);
    if (!g) return true; // unparsable → treat as unsafe
    // :: (unspecified) and ::1 (loopback)
    if (g.slice(0, 7).every((x) => x === 0) && (g[7] === 0 || g[7] === 1)) return true;
    // ::ffff:a.b.c.d — IPv4-mapped: defer to the v4 rules
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
        const v4 = `${g[6] >>> 8}.${g[6] & 0xff}.${g[7] >>> 8}.${g[7] & 0xff}`;
        return isPrivateIPv4(v4);
    }
    // 64:ff9b::/96 (NAT64) — the embedded v4 decides
    if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
        const v4 = `${g[6] >>> 8}.${g[6] & 0xff}.${g[7] >>> 8}.${g[7] & 0xff}`;
        return isPrivateIPv4(v4);
    }
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site local (deprecated)
    if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
    return false;
}

export function isPrivateIp(ip: string): boolean {
    const kind = net.isIP(ip);
    if (kind === 4) return isPrivateIPv4(ip);
    if (kind === 6) return isPrivateIPv6(ip);
    return true;
}

export interface SafeUrlOptions {
    /** Only accept https (used for BYOK endpoints that carry the user's API key). */
    requireHttps?: boolean;
}

/**
 * Sync syntax check. Returns the parsed URL or null. Does NOT resolve DNS.
 */
export function parsePublicHttpUrl(input: string, opts: SafeUrlOptions = {}): URL | null {
    let url: URL;
    try {
        url = new URL(input.trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && (opts.requireHttps || url.protocol !== 'http:')) return null;
    if (url.username || url.password) return null;

    const host = url.hostname.toLowerCase();
    if (!host) return null;
    if (BLOCKED_HOSTNAMES.has(host)) return null;
    if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) return null;
    // Single-label hostnames (litellm, db, redis…) are Docker/K8s service names.
    if (!host.includes('.') && !host.startsWith('[')) return null;

    // IP literals: v6 arrive wrapped in [] from URL.hostname
    const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
    if (net.isIP(bare) && isPrivateIp(bare)) return null;
    // Decimal / octal / hex IPv4 disguises (e.g. "2130706433", "0x7f000001", "017700000001"):
    // URL normalises numeric hosts to dotted form, so a purely numeric leftover means it failed.
    if (/^[0-9x.]+$/i.test(bare) && !net.isIP(bare)) return null;

    return url;
}

export function isPublicHttpUrlSyntax(input: string, opts: SafeUrlOptions = {}): boolean {
    return parsePublicHttpUrl(input, opts) !== null;
}

/**
 * Full check: syntax + DNS. Throws Error(UNSAFE_URL) on any failure.
 * Returns the parsed URL on success.
 */
export async function assertPublicHttpUrl(input: string, opts: SafeUrlOptions = {}): Promise<URL> {
    const url = parsePublicHttpUrl(input, opts);
    if (!url) throw new Error(UNSAFE_URL);

    const bare = url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname;
    if (net.isIP(bare)) return url; // literal already vetted

    let addresses: { address: string }[];
    try {
        addresses = await dns.lookup(bare, { all: true, verbatim: true });
    } catch {
        throw new Error(UNSAFE_URL);
    }
    if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
        throw new Error(UNSAFE_URL);
    }
    return url;
}

export interface FetchPublicUrlOptions {
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
    userAgent?: string;
}

/**
 * GET a user-supplied URL safely. Redirects are followed manually so every
 * hop passes `assertPublicHttpUrl`. Resolves to the final text body.
 */
export async function fetchPublicUrl(input: string, opts: FetchPublicUrlOptions = {}): Promise<{ data: string; finalUrl: string }> {
    const timeoutMs = opts.timeoutMs ?? 15_000;
    const maxBytes = opts.maxBytes ?? 5 * 1024 * 1024;
    const maxRedirects = opts.maxRedirects ?? 3;
    const userAgent = opts.userAgent ?? 'Mozilla/5.0 (compatible; elearning-platform-bot/1.0)';

    let current = input;
    for (let hop = 0; hop <= maxRedirects; hop++) {
        const url = await assertPublicHttpUrl(current);
        const response: AxiosResponse<string> = await axios.get(url.toString(), {
            headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5' },
            timeout: timeoutMs,
            maxRedirects: 0,
            maxContentLength: maxBytes,
            maxBodyLength: maxBytes,
            responseType: 'text',
            // We handle 3xx ourselves; everything else non-2xx should throw.
            validateStatus: (s) => (s >= 200 && s < 300) || (s >= 300 && s < 400),
        });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers['location'];
            if (!location || hop === maxRedirects) throw new Error(UNSAFE_URL);
            current = new URL(String(location), url).toString();
            continue;
        }
        return { data: typeof response.data === 'string' ? response.data : String(response.data ?? ''), finalUrl: url.toString() };
    }
    throw new Error(UNSAFE_URL);
}
