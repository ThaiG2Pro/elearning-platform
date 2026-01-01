import { UserEntity } from './UserEntity';

export class LoginNavigationPolicy {
    static determineRedirectUrl(user: UserEntity, continueUrl?: string): string {
        if (continueUrl) {
            // Simple validation, in real app check if valid URL
            return continueUrl;
        }
        // Role-based default
        switch (user.roleName) {
            case 'STUDENT':
                return '/student/dashboard';
            case 'LECTURER':
                return '/lecturer/courses';
            case 'ADMIN':
                return '/admin/pending';
            default:
                return '/';
        }
    }
}
