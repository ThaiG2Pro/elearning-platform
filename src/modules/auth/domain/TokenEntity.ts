export class TokenEntity {
    constructor(
        public id: bigint,
        public userId: bigint,
        public code: string,
        public type: string,
        public expiresAt: Date,
        public isUsed: boolean,
    ) { }

    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    isUsedToken(): boolean {
        return this.isUsed;
    }

    markAsUsed(): void {
        this.isUsed = true;
    }
}
