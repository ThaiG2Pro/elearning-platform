import { PrismaClient } from '@prisma/client';

/**
 * WP4.2 (Checkpoint 4) — policy dọn dữ liệu (mục 6.4 economics doc): archive
 * `Source`/`AIGeneration` không truy cập lâu ngày (>= `DATA_RETENTION_ARCHIVE_DAYS`,
 * mặc định 180 ngày) và không còn course công khai nào tham chiếu (showcase
 * HOẶC có share_token — 2 hình thức "công khai" hiện có trong data model).
 *
 * Archive KHÔNG xoá row — chỉ đánh dấu `archived_at` và null hoá
 * `transcript`/`content` (field nặng nhất, đúng lo ngại "chi phí lưu trữ
 * đáng kể" ở mục 6.4) để giữ nguyên recipe_hash/cache-key/audit trail.
 *
 * Mặc định DRY-RUN — chỉ in ra sẽ archive gì, không đổi gì trong DB. Chạy
 * `pnpm data:archive-stale -- --apply` để thực sự archive.
 *
 * Không import từ `src/modules/*`: cùng ràng buộc ts-node ESM đã ghi nhận ở
 * `prisma/seed-showcase.ts`/`scripts/aiUsageReport.ts` — tự chứa logic query
 * ở đây thay vì import, giữ 1 nơi có query thay vì 2 bản dễ lệch nhau. Luật
 * `isEligibleForArchive` thật (dùng cho test) sống ở
 * `src/modules/data-retention/domain/DataRetentionPolicy.ts` — logic lặp lại
 * ở đây chỉ là 1 phép so sánh ngày rất nhỏ, tự chứa để tránh vỡ ràng buộc ESM.
 */

const prisma = new PrismaClient();

function archiveThresholdDays(): number {
    return Number(process.env.DATA_RETENTION_ARCHIVE_DAYS ?? 180);
}

async function main() {
    const apply = process.argv.includes('--apply');
    const thresholdDays = archiveThresholdDays();
    const now = new Date();
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

    const sources = await prisma.sources.findMany({
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

    const candidates = sources.filter((s) => {
        if (s.courses.length > 0) return false; // còn course công khai tham chiếu
        const referenceDate = s.last_accessed_at ?? s.created_at;
        if (!referenceDate) return false;
        return now.getTime() - referenceDate.getTime() >= thresholdMs;
    });

    console.log(`── WP4.2 archive-stale-data (ngưỡng ${thresholdDays} ngày, ${apply ? 'APPLY' : 'DRY-RUN'}) ──`);
    if (candidates.length === 0) {
        console.log('(không có Source nào đủ điều kiện archive)');
    } else {
        console.log('id   | title                                  | last_accessed/created_at');
        console.log('-----|----------------------------------------|--------------------------');
        for (const c of candidates) {
            const refDate = (c.last_accessed_at ?? c.created_at)?.toISOString().slice(0, 10) ?? '(unknown)';
            console.log(`${c.id.toString().padEnd(4)} | ${(c.title ?? '(no title)').slice(0, 38).padEnd(38)} | ${refDate}`);
        }
    }

    if (!apply) {
        console.log(`\n${candidates.length} Source sẽ bị archive — chạy lại với "-- --apply" để thực sự archive.`);
        return;
    }

    for (const c of candidates) {
        await prisma.$transaction([
            prisma.sources.update({ where: { id: c.id }, data: { archived_at: now, transcript: null } }),
            prisma.ai_generations.updateMany({
                where: { source_id: c.id, archived_at: null },
                data: { archived_at: now, content: null },
            }),
        ]);
    }
    console.log(`\n✅ Đã archive ${candidates.length} Source (và mọi AIGeneration liên quan).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
