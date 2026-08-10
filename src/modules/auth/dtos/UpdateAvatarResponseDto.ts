export class UpdateAvatarResponseDto {
    constructor(
        public success: boolean,
        public message: string,
        public avatarUrl: string,
    ) { }
}
