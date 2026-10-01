import { NextResponse } from 'next/server';
import { FAQ_TOPICS } from '@/content/faq';
import { CREDIT_PACKAGES, aiGenerationCreditCost } from '@/modules/billing/domain/CreditLedger';

/**
 * Kho tri thức cho AI agent CSKH (repo ai-agent-sale-v2,
 * scripts/ingest_spacely_faq.py kéo JSON này về rồi nạp vào RAG).
 *
 * Nguồn duy nhất vẫn là src/content/faq.ts (dùng chung trang /faq + menu
 * widget) cộng bảng gói credit thật ở CreditLedger — không chép tay sang
 * repo agent để hai bên không lệch. Toàn bộ nội dung đã công khai ở /faq
 * và /pricing nên endpoint này không cần auth.
 *
 * Số credit mỗi lượt lấy từ env lúc gọi → agent chỉ "biết" con số tại thời
 * điểm ingest; đổi env thì chạy lại ingest.
 */

export const dynamic = 'force-dynamic';

interface KnowledgeDoc {
    id: string;
    topic: string;
    topicLabel: string;
    title: string;
    body: string;
    keywords: string[];
}

function stripEmoji(label: string): string {
    return label.replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

export async function GET() {
    const docs: KnowledgeDoc[] = FAQ_TOPICS.flatMap((topic) =>
        topic.questions.map((q) => ({
            id: q.id,
            topic: topic.id,
            topicLabel: stripEmoji(topic.label),
            title: q.label,
            body: q.answer,
            keywords: q.keywords,
        })),
    );

    const packageLines = CREDIT_PACKAGES.map(
        (p) => `- ${p.credits} credit: $${(p.priceUsdCents / 100).toFixed(2)} (gói "${p.id}")`,
    ).join('\n');
    docs.push({
        id: 'goi-credit-hien-ban',
        topic: 'gia-credit',
        topicLabel: 'Giá & Credit AI',
        title: 'Các gói credit AI đang bán và giá mỗi lượt',
        body:
            `Mỗi lượt AI tạo nội dung theo yêu cầu riêng (quiz tuỳ biến) trừ ${aiGenerationCreditCost()} credit. ` +
            `Các gói credit mua qua Stripe (thanh toán thẻ quốc tế):\n${packageLines}\n` +
            'Mua ở trang Giá (/pricing) sau khi đăng nhập. Credit không hết hạn. ' +
            'Giá hiển thị trên trang Giá là giá chính thức tại thời điểm mua.',
        keywords: ['gói credit', 'giá credit', 'mua credit', 'bao nhiêu tiền', 'stripe', 'thanh toán'],
    });

    return NextResponse.json({
        brand: 'Spacely',
        generatedAt: new Date().toISOString(),
        docs,
    });
}
