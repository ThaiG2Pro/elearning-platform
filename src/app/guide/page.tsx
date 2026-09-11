import { Metadata } from 'next';
import GuideContent from './GuideContent';

export const metadata: Metadata = {
    title: 'Hướng dẫn sử dụng | E-Learning Platform',
    description:
        'Năm bước dùng E-Learning Platform: dán link tạo Space, soạn chương/bài học/quiz, vào học với chế độ tập trung, theo dõi tiến độ, rồi chia sẻ hoặc sao chép Space.',
};

export default function GuidePage() {
    return <GuideContent />;
}
