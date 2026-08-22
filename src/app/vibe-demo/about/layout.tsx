// Mục 6 — SEO/meta cho trang public. Cùng lý do như home/layout.tsx: trang
// about là 'use client' nên metadata phải đặt ở layout.tsx server-side của
// route segment này, không đặt được ngay trong page.tsx.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description:
    'Vì sao nền tảng này được thiết kế như một không gian học tập thật — mực xanh trên giấy trắng, không phải một app đầy tính năng.',
};

export default function VibeAboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
