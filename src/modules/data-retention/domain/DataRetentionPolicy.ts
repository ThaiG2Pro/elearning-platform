/**
 * WP4.2 (Checkpoint 4) — policy dọn dữ liệu, mục 6.4 economics doc: archive
 * `Source`/`AIGeneration` không truy cập lâu ngày và không còn space công
 * khai nào tham chiếu. Pure logic — không chạm DB, test được không cần
 * fixture, đúng pattern AIGenerationPolicy.ts.
 */

export interface ArchiveEligibilityInput {
    /** WP4.2 — cập nhật mỗi lần AIGenerationService.generate() chạm tới Source này. */
    lastAccessedAt: Date | null;
    /** Fallback khi chưa từng generate AI cho Source này (last_accessed_at null). */
    createdAt: Date | null;
    /**
     * true nếu còn ít nhất 1 space công khai (showcase HOẶC có share_token)
     * đang tham chiếu Source này — không bao giờ archive khi còn ai dựa vào.
     */
    hasPublicSpaceReference: boolean;
    now: Date;
    thresholdDays: number;
}

export class DataRetentionPolicy {
    /**
     * Không bao giờ archive nếu còn space công khai nào tham chiếu — dù đã
     * lâu không truy cập, archive sẽ null hoá transcript/content, phá nội
     * dung đang hiển thị thật cho người khác qua share link.
     */
    static isEligibleForArchive(input: ArchiveEligibilityInput): boolean {
        if (input.hasPublicSpaceReference) {
            return false;
        }
        const referenceDate = input.lastAccessedAt ?? input.createdAt;
        if (!referenceDate) {
            // Không có mốc thời gian nào để so — an toàn là không archive
            // (tránh archive nhầm dữ liệu chưa kịp gán created_at).
            return false;
        }
        const ageMs = input.now.getTime() - referenceDate.getTime();
        const thresholdMs = input.thresholdDays * 24 * 60 * 60 * 1000;
        return ageMs >= thresholdMs;
    }
}
