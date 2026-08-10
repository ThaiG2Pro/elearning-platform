import { UserEntity } from './UserEntity';

export class LoginNavigationPolicy {
    static determineRedirectUrl(user: UserEntity, continueUrl?: string): string {
        if (continueUrl) {
            // Simple validation, in real app check if valid URL
            return continueUrl;
        }
        // WP1.5.10: personal-organizer model has no per-role dashboards — every
        // role lands on the same home page. '/student/dashboard' and
        // '/admin/pending' never existed as routes; '/my-courses' is kept
        // since STUDENT can also own courses now (ownership-based, not role-gated).
        switch (user.roleName) {
            case 'LECTURER':
                return '/my-courses';
            default:
                return '/';
        }
    }
}
