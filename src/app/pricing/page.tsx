import { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
    title: 'Bảng giá | E-Learning Platform',
    description:
        'Học, tạo Space, làm quiz, xem tiến độ, chia sẻ và sao chép Space — miễn phí không giới hạn. Chỉ trả phí (credit) khi muốn AI tự soạn quiz/tóm tắt theo yêu cầu riêng; dùng API key AI của bạn thì luôn miễn phí.',
};

export default function PricingPage() {
    return <PricingContent />;
}
