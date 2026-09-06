'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2026-09-05 — gộp vào /my-shares (xem audit "cơ cấu lại khu vực quản lý
// chia sẻ" 2026-09-05): 2 trang riêng cho 2 domain chia sẻ khác nhau (link
// Space vs bản AI/quiz share bằng BYOK) giờ là 2 tab trong CÙNG 1 trang, thay
// vì 2 URL rời không biết nhau tồn tại. Giữ route này lại làm redirect thay
// vì xoá hẳn — tránh 404 cho bookmark/link cũ đã trỏ /my-ai-shares.
export default function MyAISharesRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/my-shares?tab=ai');
    }, [router]);

    return null;
}
