import * as crypto from 'crypto';

/**
 * CSRF guard cho flow OAuth redirect (2026-09-15): route /oauth/<provider>
 * sinh 1 state ngẫu nhiên, set vào cookie httpOnly; route callback so khớp
 * state trên URL (Google/GitHub trả lại nguyên vẹn) với cookie này trước khi
 * tin bất kỳ `code` nào — nếu không, 1 kẻ tấn công có thể tự khởi tạo login
 * OAuth của chính hắn rồi dụ nạn nhân bấm link callback, gắn tài khoản OAuth
 * của hắn vào phiên của nạn nhân (login CSRF).
 */
export const OAUTH_STATE_COOKIE = 'oauthState';
export const OAUTH_STATE_MAX_AGE_SEC = 5 * 60;

export function createOAuthState(): string {
    return crypto.randomBytes(24).toString('hex');
}
