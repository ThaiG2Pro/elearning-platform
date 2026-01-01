export class LoginResponseDto {
    constructor(
        public accessToken: string,
        public refreshToken: string,
        public user: {
            id: number;
            email: string;
            role: string;
            fullName: string;
        },
        public redirectUrl: string,
    ) { }
}
