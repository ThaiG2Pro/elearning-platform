export class RegisterDto {
    constructor(
        public email: string,
        public password: string,
        public fullName: string,
        public age?: number,
        public continueUrl?: string,
    ) { }
}
