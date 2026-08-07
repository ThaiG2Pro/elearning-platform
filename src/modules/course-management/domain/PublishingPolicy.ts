export class PublishingPolicy {
    /**
     * A course must always keep at least one section — the owner can delete
     * any other section freely (no approval gate: courses are always
     * editable by their owner post Checkpoint-0 pivot).
     */
    static validateDeletionEligibility(currentCount: number) {
        if (currentCount <= 1) {
            throw new Error('CANNOT_DELETE_LAST_SECTION');
        }
    }
}
