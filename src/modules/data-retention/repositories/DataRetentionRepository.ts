import { PrismaClient } from '@prisma/client';

export interface SourceArchiveCandidate {
    id: bigint;
    title: string | null;
    lastAccessedAt: Date | null;
    createdAt: Date | null;
    hasPublicCourseReference: boolean;
}

/**
 * WP4.2 (Checkpoint 4) — truy vấn cho `scripts/archiveStaleData.ts` +
 * "touch last-accessed" gọi từ `AIGenerationService.generate()`. Tách riêng
 * khỏi `AIGenerationRepository` vì đây là domain riêng (data retention), dù
 * cùng chạm bảng `sources`/`ai_generations`.
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

    /**
     * Mọi Source chưa archive, kèm cờ "còn course công khai nào tham chiếu
     * không" (showcase HOẶC có share_token — 2 hình thức "công khai" hiện có
     * trong data model, xem courses.is_showcase/share_token).
     */
    async findArchiveCandidates(): Promise<SourceArchiveCandidate[]> {
        const sources = await this.prisma.sources.findMany({
            where: { archived_at: null },
            select: {
                id: true,
                title: true,
                last_accessed_at: true,
                created_at: true,
                courses: {
                    where: { OR: [{ is_showcase: true }, { share_token: { not: null } }] },
                    select: { id: true },
                    take: 1,
                },
            },
        });
        return sources.map((s) => ({
            id: s.id,
            title: s.title,
            lastAccessedAt: s.last_accessed_at,
            createdAt: s.created_at,
            hasPublicCourseReference: s.courses.length > 0,
        }));
    }

    /**
     * Archive thật: đánh dấu archived_at, null hoá transcript (field nặng
     * nhất — mục 6.4) trên Source, và archived_at + content trên mọi
     * AIGeneration của Source đó (giữ nguyên recipe_hash/key_source/
     * visibility cho cache-key/audit, chỉ mất nội dung — regenerate lại nếu
     * ai đó quay lại dùng).
     */
    async archiveSource(sourceId: bigint): Promise<void> {
        const now = new Date();
        await this.prisma.$transaction([
            this.prisma.sources.update({
                where: { id: sourceId },
                data: { archived_at: now, transcript: null },
            }),
            this.prisma.ai_generations.updateMany({
                where: { source_id: sourceId, archived_at: null },
                data: { archived_at: now, content: null },
            }),
        ]);
    }
}
