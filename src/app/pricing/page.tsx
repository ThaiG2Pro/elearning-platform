import { Metadata } from 'next';
import { Suspense } from 'react';
import PricingContent from './PricingContent';
import { aiGenerationCreditCost } from '@/modules/billing/domain/CreditLedger';

export const metadata: Metadata = {
    title: 'Bảng giá | E-Learning Platform',
    description:
        'Học, tạo Space, làm quiz, xem tiến độ, chia sẻ và sao chép Space — miễn phí không giới hạn. Chỉ trả phí (credit) khi muốn AI tự soạn quiz/tóm tắt theo yêu cầu riêng; dùng API key AI của bạn thì luôn miễn phí.',
};

export default function PricingPage() {
    // Server component đọc đúng chi phí đang áp dụng (env AI_GENERATION_CREDIT_COST,
    // mặc định 1) và truyền xuống — không chép tay số ở client để tránh lệch.
    // Suspense: PricingContent dùng useSearchParams (?buy=<gói> sau đăng nhập)
    // — trang render tĩnh cần ranh giới này để build không lỗi.
    return (
        <Suspense fallback={null}>
            <PricingContent creditCostPerGeneration={aiGenerationCreditCost()} />
        </Suspense>
    );
}
