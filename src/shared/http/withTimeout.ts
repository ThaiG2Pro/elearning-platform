/**
 * Perf (2026-09-06) — timeout wrapper cho các lib không cho set timeout
 * (vd youtube-transcript-plus). Promise gốc vẫn chạy nền tới khi tự kết
 * thúc, nhưng HTTP request của user không bị giữ vô hạn.
 *
 * SSRF/size-cap cho fetch HTML nằm ở shared/security/safeUrl.ts
 * (fetchPublicUrl) — không trùng ở đây.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => {
        if (timer) clearTimeout(timer);
    });
}
