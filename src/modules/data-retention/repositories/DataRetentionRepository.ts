import { PrismaClient } from '@prisma/client';

/**
 * WP4.2 (Checkpoint 4) — "touch last-accessed" gọi từ
 * `AIGenerationService.generate()`. Tách riêng khỏi `AIGenerationRepository`
 * vì đây là domain riêng (data retention), dù cùng chạm bảng `sources`.
 *
 * 2026-09-07 — đã xoá `findArchiveCandidates`/`archiveSource` (dead code:
 * không có caller/test nào — job archive thật chạy ở
 * `scripts/archiveStaleData.ts`, tự chứa logic riêng vì ràng buộc ts-node
 * ESM không import được từ `src/modules/*`, xem comment ở đầu file đó).
 */
export class DataRetentionRepository {
    constructor(private prisma: PrismaClient) { }

    /**
     * Gọi mỗi lần Source này được dùng để generate (cache hit hay miss) —
     * tín hiệu "còn ai đang dùng thật", khác hẳn created_at/updated_at (lần
     * tạo/sửa). Best-effort: lỗi ở đây không được phép làm hỏng luồng
     * generate chính, caller tự bọc try/catch.
     */
    async touchLastAccessed(sourceId: bigint): Promise<void> {
        await this.prisma.sources.update({
            where: { id: sourceId },
            data: { last_accessed_at: new Date() },
        });
    }
}
