export class LoginDto {
    constructor(
        public email: string,
        public password: string,
        public continueUrl?: string,
    ) { }
}
