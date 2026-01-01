export class ProgressPolicy {
    static checkCompletionCondition(position: number, duration: number): boolean {
        // RULE 19: 80% threshold
        const threshold = 0.8;
        return position >= duration * threshold;
    }
}
