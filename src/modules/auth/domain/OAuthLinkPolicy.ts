import { UserEntity } from './UserEntity';

// 2026-09-15 — cùng vai trò với RegistrationPolicy nhưng cho nhánh OAuth.
// Quyết định sản phẩm: email OAuth trùng tài khoản password có sẵn (kể cả
// đang INACTIVE) thì TỰ ĐỘNG LIÊN KẾT, không chặn/không cần màn hình riêng —
// Google/GitHub đã verify email hộ nên rủi ro chiếm nhầm tài khoản thấp hơn
// nhiều so với chấp nhận 1 password bất kỳ.
export class OAuthLinkPolicy {
    static resolve(
        existingByOAuth: UserEntity | null,
        existingByEmail: UserEntity | null,
    ): 'LOGIN_EXISTING_OAUTH' | 'LINK_TO_EMAIL' | 'CREATE_NEW' {
        if (existingByOAuth) return 'LOGIN_EXISTING_OAUTH';
        if (existingByEmail) return 'LINK_TO_EMAIL';
        return 'CREATE_NEW';
    }
}
