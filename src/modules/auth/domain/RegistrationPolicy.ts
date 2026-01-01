import { UserEntity } from './UserEntity';

export class RegistrationPolicy {
    static validateRegistrationEligibility(user: UserEntity | null): 'ALLOW_NEW' | 'OVERWRITE' | 'REJECT' {
        if (!user) {
            return 'ALLOW_NEW';
        }
        if (user.status === 'INACTIVE') {
            return 'OVERWRITE';
        }
        return 'REJECT'; // ACTIVE user
    }
}
