import { PrismaClient } from '@prisma/client';

/**
 * WP2.4 — alerting chi phí AI theo ngày/tuần (mục 6.7). Lớp phòng thủ kỹ
 * thuật thứ 2 (sau rate-limit/user ở WP2.2): phát hiện sớm tăng trưởng đột
 * biến ngoài dự tính trước khi mở rộng thêm cộng đồng.
 *
 * Đo theo SỐ REQUEST/ngày (ticket 06), không chỉ $ — với free tier, cạn
 * quota SHARED_FREE xảy ra trước khi phát sinh chi phí thật, nên $ một
 * mình là chỉ số mù.
 *
 * Chạy: `pnpm ai:usage-report` — in bảng 7 ngày gần nhất theo key_source,
 * cảnh báo nếu SHARED_FREE hôm nay chạm ngưỡng `AI_ALERT_DAILY_REQUESTS`.
 *
 * Kênh báo hiện tại là stdout — chưa nối email/Slack thật (cần quyết định
 * kênh vận hành thật khi triển khai, xem docs/ROADMAP.md WP2.4).
 *
 * Không import từ `src/modules/ai-generation/*`: `ts-node` chạy script này
 * ở ESM mode không resolve được import extension-less từ `src/` (cùng ràng
 * buộc đã ghi nhận ở `prisma/seed-showcase.ts` — xem comment ở đó). Vì
 * logic cần lặp lại ở đây rất nhỏ (1 phép so sánh ngưỡng), tự chứa thay vì
 * import, theo đúng pattern đã có sẵn trong codebase.
 */

const prisma = new PrismaClient();

type KeySource = 'SHARED_FREE' | 'BYOK' | 'PAID_TIER';

async function main() {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 6);

    const rows = await prisma.ai_generations.findMany({
        where: { created_at: { gte: since } },
        select: { created_at: true, key_source: true },
    });

    const buckets = new Map<string, number>();
    for (const row of rows) {
        const date = row.created_at.toISOString().slice(0, 10);
        const key = `${date}|${row.key_source}`;
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const daily = Array.from(buckets.entries())
        .map(([key, count]) => {
            const [date, keySource] = key.split('|');
            return { date, keySource: keySource as KeySource, count };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

    console.log('── AI usage — 7 ngày gần nhất ──');
    if (daily.length === 0) {
        console.log('(chưa có request nào)');
    } else {
        console.log('date       | key_source   | count');
        console.log('-----------|--------------|------');
        for (const row of daily) {
            console.log(`${row.date} | ${row.keySource.padEnd(12)} | ${row.count}`);
        }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayGroups = await prisma.ai_generations.groupBy({
        by: ['key_source'],
        where: { created_at: { gte: startOfToday } },
        _count: { id: true },
    });
    const today: Record<KeySource, number> = { SHARED_FREE: 0, BYOK: 0, PAID_TIER: 0 };
    for (const g of todayGroups) {
        today[g.key_source as KeySource] = g._count.id;
    }

    const threshold = Number(process.env.AI_ALERT_DAILY_REQUESTS ?? 250);
    console.log('\n── Hôm nay ──');
    console.log(`SHARED_FREE: ${today.SHARED_FREE} | BYOK: ${today.BYOK} | PAID_TIER: ${today.PAID_TIER}`);

    if (today.SHARED_FREE >= threshold) {
        console.log(`\n⚠️  CẢNH BÁO: SHARED_FREE hôm nay (${today.SHARED_FREE}) đã chạm ngưỡng cảnh báo (${threshold}).`);
        console.log('   Kiểm tra tăng trưởng đột biến trước khi mở rộng thêm cộng đồng.');
    } else {
        console.log(`\n✅ Trong ngưỡng an toàn (ngưỡng cảnh báo: ${threshold}).`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
