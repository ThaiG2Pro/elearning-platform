import { Metadata } from 'next';
import AboutContent from './AboutContent';

// Tách metadata riêng cho /about (page cũ là 'use client' nên không export
// được metadata) — tiêu đề/mô tả cụ thể, đúng nội dung trang, thay vì dùng
// chung metadata chung chung của root layout.
export const metadata: Metadata = {
    title: 'Về chúng tôi | E-Learning Platform',
    description:
        'E-Learning Cá Nhân là công cụ biến video YouTube và tài liệu online thành Không gian học tập (Space): chia chương, thêm quiz, theo dõi tiến độ.',
};

export default function AboutPage() {
    return <AboutContent />;
}
