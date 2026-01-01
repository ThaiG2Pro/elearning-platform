import { NavigationAction } from './NavigationAction';
import { UserEntity } from './UserEntity';

export class IdentityPolicy {
    static determineNextAction(user: UserEntity | null): NavigationAction {
        if (!user) {
            return NavigationAction.REGISTER;
        }
        return user.isActive() ? NavigationAction.LOGIN : NavigationAction.REGISTER;
    }
}
