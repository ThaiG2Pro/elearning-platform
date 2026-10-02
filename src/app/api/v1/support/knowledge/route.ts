import { NextResponse } from 'next/server';
import { FAQ_TOPICS } from '@/content/faq';
import { CREDIT_PACKAGES, aiGenerationCreditCost } from '@/modules/billing/domain/CreditLedger';
import { ABOUT, GUIDE_LIMITS, GUIDE_STEPS, PROMISES } from '@/content/siteInfo';

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

    // /guide — mỗi bước một doc để câu "làm thế nào…" kéo đúng bước.
    GUIDE_STEPS.forEach((step, i) => {
        docs.push({
            id: `guide-${step.id}`,
            topic: 'huong-dan',
            topicLabel: 'Hướng dẫn sử dụng',
            title: `Bước ${i + 1}: ${step.title}`,
            body: step.paragraphs.join('\n'),
            keywords: ['hướng dẫn', 'cách dùng', 'làm thế nào', step.title.toLowerCase()],
        });
    });
    docs.push({
        id: 'guide-gioi-han',
        topic: 'huong-dan',
        topicLabel: 'Hướng dẫn sử dụng',
        title: 'Giới hạn của bản hiện tại',
        body: GUIDE_LIMITS.map((l) => `- ${l.label}: ${l.body}`).join('\n'),
        keywords: ['giới hạn', 'playlist', 'chưa hỗ trợ', 'nguồn'],
    });

    // /about — sản phẩm là gì, vì sao có, Space là gì, cam kết với người học.
    docs.push({
        id: 'about-spacely',
        topic: 'gioi-thieu',
        topicLabel: 'Giới thiệu',
        title: 'Spacely là gì và vì sao có',
        body:
            `${ABOUT.slogan} ${ABOUT.intro}\n\n${ABOUT.storyLead} ${ABOUT.story.join(' ')}\n\n` +
            `Space: ${ABOUT.spaceTitle}. ${ABOUT.spaceBody}`,
        keywords: ['giới thiệu', 'về chúng tôi', 'space là gì', 'chế độ tập trung', 'ghi chú', 'founder'],
    });
    docs.push({
        id: 'about-cam-ket',
        topic: 'gioi-thieu',
        topicLabel: 'Giới thiệu',
        title: 'Những điều Spacely giữ với người học',
        body: PROMISES.map((p) => `- ${p.label}: ${p.body}`).join('\n'),
        keywords: ['cam kết', 'quảng cáo', 'dữ liệu', 'xuất dữ liệu', 'miễn phí', 'cùng học'],
    });

    return NextResponse.json({
        brand: 'Spacely',
        generatedAt: new Date().toISOString(),
        docs,
    });
}
