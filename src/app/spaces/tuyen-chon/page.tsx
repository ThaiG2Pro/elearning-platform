import { Metadata } from 'next';
import ShowcaseContent from './ShowcaseContent';

export const metadata: Metadata = {
    title: 'Space tuyển chọn | E-Learning Platform',
    description:
        'Toàn bộ Space do đội ngũ chọn tay từ các playlist YouTube tiếng Việt: nội dung đầy đủ, bài học theo thứ tự, học ngay không cần tạo mới.',
};

export default function ShowcasePage() {
    return <ShowcaseContent />;
}
