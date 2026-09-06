import { UserEntity } from './UserEntity';
import { sanitizeRedirectPath } from '../../../shared/security/safeRedirect';

export class LoginNavigationPolicy {
    /**
     * `continueUrl` is user-controlled (query string -> identify -> login).
     * Only same-origin paths are honoured; anything else lands on "/".
     */
    static determineRedirectUrl(_user: UserEntity, continueUrl?: string): string {
        // Personal organizer model: all users land on the main home page by default.
        return sanitizeRedirectPath(continueUrl, '/');
    }
}
