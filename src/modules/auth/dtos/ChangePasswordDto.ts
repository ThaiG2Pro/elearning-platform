export class ChangePasswordDto {
    constructor(
        public currentPassword: string,
        public newPassword: string,
        public confirmPassword: string,
    ) { }
}
