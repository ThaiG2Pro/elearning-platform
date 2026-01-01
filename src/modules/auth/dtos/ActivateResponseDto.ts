export class ActivateResponseDto {
    constructor(
        public success: boolean,
        public redirectUrl?: string,
    ) { }
}
