import { Metadata } from 'next';
import FaqContent from './FaqContent';

export const metadata: Metadata = {
    title: 'Hỏi đáp | E-Learning Platform',
    description:
        'Câu hỏi thường gặp về Space, chia sẻ/sao chép, giá & credit AI, tài khoản — trả lời đúng với cách nền tảng hoạt động thật.',
};

export default function FaqPage() {
    return <FaqContent />;
}
