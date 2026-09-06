import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('dns', () => ({
    promises: { lookup: vi.fn() },
}));
vi.mock('axios', () => ({ default: { get: vi.fn() } }));

import { promises as dns } from 'dns';
import axios from 'axios';
import { isPrivateIp, parsePublicHttpUrl, assertPublicHttpUrl, fetchPublicUrl, UNSAFE_URL } from '../safeUrl';

const lookup = dns.lookup as unknown as ReturnType<typeof vi.fn>;
const get = axios.get as unknown as ReturnType<typeof vi.fn>;

describe('isPrivateIp', () => {
    it.each([
        '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
        '0.0.0.0', '100.64.0.1', '224.0.0.1', '255.255.255.255',
        '::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', 'fe80::1%eth0', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '64:ff9b::7f00:1',
    ])('%s is private', (ip) => expect(isPrivateIp(ip)).toBe(true));

    it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '172.15.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
        '%s is public', (ip) => expect(isPrivateIp(ip)).toBe(false));

    it('treats garbage as private', () => expect(isPrivateIp('not-an-ip')).toBe(true));
});

describe('parsePublicHttpUrl (syntax layer)', () => {
    it.each([
        'https://example.com/a?b=1',
        'http://blog.example.org/post',
        'https://8.8.8.8/',
    ])('accepts %s', (u) => expect(parsePublicHttpUrl(u)).not.toBeNull());

    it.each([
        'ftp://example.com', 'file:///etc/passwd', 'javascript:alert(1)', 'not a url',
        'http://localhost/', 'http://LOCALHOST:3000', 'http://foo.localhost/', 'http://db/', 'http://litellm:4000/',
        'http://app.internal/', 'http://printer.local/', 'http://127.0.0.1/', 'http://10.0.0.1/', 'http://169.254.169.254/latest/meta-data',
        'http://[::1]/', 'http://[fe80::1]/', 'http://[::ffff:127.0.0.1]/',
        'http://2130706433/', 'http://0x7f000001/', 'http://017700000001/', 'http://127.1/',
        'http://user:pass@example.com/',
    ])('rejects %s', (u) => expect(parsePublicHttpUrl(u)).toBeNull());

    it('requireHttps rejects plain http', () => {
        expect(parsePublicHttpUrl('http://example.com', { requireHttps: true })).toBeNull();
        expect(parsePublicHttpUrl('https://example.com', { requireHttps: true })).not.toBeNull();
    });
});

describe('assertPublicHttpUrl (DNS layer)', () => {
    beforeEach(() => lookup.mockReset());

    it('rejects a hostname that resolves to a private address', async () => {
        lookup.mockResolvedValue([{ address: '93.184.216.34' }, { address: '10.0.0.5' }]);
        await expect(assertPublicHttpUrl('https://evil.example.com')).rejects.toThrow(UNSAFE_URL);
    });

    it('rejects when DNS fails or returns nothing', async () => {
        lookup.mockRejectedValue(new Error('ENOTFOUND'));
        await expect(assertPublicHttpUrl('https://nope.example.com')).rejects.toThrow(UNSAFE_URL);
        lookup.mockResolvedValue([]);
        await expect(assertPublicHttpUrl('https://empty.example.com')).rejects.toThrow(UNSAFE_URL);
    });

    it('accepts a hostname whose every address is public', async () => {
        lookup.mockResolvedValue([{ address: '93.184.216.34' }, { address: '2606:2800:220:1:248:1893:25c8:1946' }]);
        await expect(assertPublicHttpUrl('https://example.com/x')).resolves.toBeInstanceOf(URL);
    });

    it('does not consult DNS for a vetted IP literal', async () => {
        await assertPublicHttpUrl('https://8.8.8.8/');
        expect(lookup).not.toHaveBeenCalled();
    });
});

describe('fetchPublicUrl (transport layer)', () => {
    beforeEach(() => { lookup.mockReset(); get.mockReset(); lookup.mockResolvedValue([{ address: '93.184.216.34' }]); });
    afterEach(() => vi.clearAllMocks());

    it('disables axios redirects and caps the body', async () => {
        get.mockResolvedValue({ status: 200, headers: {}, data: '<title>x</title>' });
        const res = await fetchPublicUrl('https://example.com/');
        expect(res.data).toContain('<title>');
        const cfg = get.mock.calls[0][1];
        expect(cfg.maxRedirects).toBe(0);
        expect(cfg.maxContentLength).toBeGreaterThan(0);
    });

    it('re-validates each redirect hop and refuses one that lands on a private host', async () => {
        get.mockResolvedValueOnce({ status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' }, data: '' });
        await expect(fetchPublicUrl('https://example.com/')).rejects.toThrow(UNSAFE_URL);
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('follows a safe redirect', async () => {
        get.mockResolvedValueOnce({ status: 301, headers: { location: '/moved' }, data: '' });
        get.mockResolvedValueOnce({ status: 200, headers: {}, data: 'ok' });
        const res = await fetchPublicUrl('https://example.com/');
        expect(res.data).toBe('ok');
        expect(res.finalUrl).toBe('https://example.com/moved');
    });

    it('gives up after maxRedirects', async () => {
        get.mockResolvedValue({ status: 302, headers: { location: 'https://example.com/loop' }, data: '' });
        await expect(fetchPublicUrl('https://example.com/', { maxRedirects: 2 })).rejects.toThrow(UNSAFE_URL);
        expect(get).toHaveBeenCalledTimes(3);
    });
});
