import { PrismaClient } from '@prisma/client';
import { CreditRepository } from '../src/modules/billing/repositories/CreditRepository';

/**
 * 2026-09-15 — điều chỉnh credit tay, có dấu vết (MANUAL_ADJUSTMENT + note).
 * Dùng khi job đối soát cảnh báo "cần xử lý tay" (refund/dispute không khớp
 * gói, sổ cái lệch đã tìm ra nguyên nhân…). KHÔNG BAO GIỜ sửa
 * users.credit_balance bằng SQL tay — job đối soát sẽ báo lệch ngay lần sau.
 *
 *   pnpm credits:adjust -- --user 7 --amount -10 --note "Stripe re_123 hoàn tay, gói mua trước khi có payment_intent"
 *   pnpm credits:adjust -- --user 7 --amount 30 --note "Thắng dispute dp_1 nhưng không khớp gói"
 *
 * LƯU Ý: note HIỆN CHO NGƯỜI DÙNG ở trang /billing (dòng "Điều chỉnh bởi đội
 * hỗ trợ") — viết như đang nói với khách, không ghi nhận xét nội bộ.
 *
 * Chạy từ máy dev với DATABASE_URL trỏ VPS (SSH tunnel), như các script khác.
 */
const prisma = new PrismaClient();

function arg(name: string): string | undefined {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
    const userRaw = arg('user');
    const amountRaw = arg('amount');
    const note = arg('note');
    if (!userRaw || !amountRaw || !note) {
        console.error('Dùng: pnpm credits:adjust -- --user <id> --amount <±n> --note "<lý do>"');
        process.exitCode = 2;
        return;
    }
    const userId = BigInt(userRaw);
    const amount = Number(amountRaw);
    const repo = new CreditRepository(prisma);
    const before = await repo.getBalance(userId);
    const after = await repo.adjustCreditsManually(userId, amount, note);
    console.log(`user #${userId}: ${before} → ${after} (${amount > 0 ? '+' : ''}${amount}) — "${note}"`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
