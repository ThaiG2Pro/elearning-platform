export class AccessControlPolicy {
    static validateOwnership(userId: bigint, ownerId: bigint) {
        if (userId !== ownerId) {
            throw new Error('ACCESS_DENIED');
        }
    }
}
