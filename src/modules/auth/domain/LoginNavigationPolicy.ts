import { UserEntity } from './UserEntity';

export class LoginNavigationPolicy {
    static determineRedirectUrl(_user: UserEntity, continueUrl?: string): string {
        if (continueUrl) {
            return continueUrl;
        }
        // Personal organizer model: all users land on the main home page by default.
        return '/';
    }
}
