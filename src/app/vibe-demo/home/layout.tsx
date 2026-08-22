// Mục 6 — SEO/meta cho trang public. `home/page.tsx` là 'use client' nên
// KHÔNG thể tự export `metadata` (Next.js chặn export này trong file có
// 'use client') — layout.tsx cùng route segment là server component riêng,
// đứng ngoài client boundary đó, nên đặt metadata ở đây.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Không gian học tập của bạn',
  description:
    'Tiếp tục các không gian học đang làm, xem tiến độ và mở lại bài giảng gần nhất — một nơi duy nhất cho toàn bộ hành trình học của bạn.',
};

export default function VibeHomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
