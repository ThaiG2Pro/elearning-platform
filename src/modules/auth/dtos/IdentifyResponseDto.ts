import { NavigationAction } from '../domain/NavigationAction';

export class IdentifyResponseDto {
    constructor(
        public action: NavigationAction,
        public continueUrl?: string,
    ) { }
}
