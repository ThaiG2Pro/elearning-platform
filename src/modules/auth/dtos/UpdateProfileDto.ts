export class UpdateProfileDto {
    constructor(
        public fullName: string,
        public age?: number,
    ) { }
}
