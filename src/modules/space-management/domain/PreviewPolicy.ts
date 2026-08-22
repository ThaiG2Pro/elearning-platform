export class PreviewPolicy {
    static shouldPersist(isPreview: boolean): boolean {
        // Rule 45: Data Isolation - Preview mode should not persist data
        return !isPreview;
    }
}
