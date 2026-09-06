'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2026-09-06 — gộp vào /my-learning (xem "quy hoạch /my-learning vs
// /my-spaces"): 2 trang trước đó đọc CÙNG 1 tập space (owner_id = userId),
// chỉ khác annotate (quản lý/lưu trữ vs. tiến độ học) — giờ là 1 danh sách
// duy nhất, hành động Sửa/Lưu trữ chuyển vào menu "⋮" trên mỗi card. Giữ
// route này lại làm redirect thay vì xoá hẳn — tránh 404 cho bookmark/link
// cũ đã trỏ /my-spaces (cùng nguyên tắc đã áp cho /my-ai-shares → /my-shares).
// Lưu ý: /my-spaces/[id]/edit (trang soạn nội dung) KHÔNG đổi, chỉ trang
// danh sách gốc /my-spaces này redirect.
export default function MySpacesRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/my-learning');
    }, [router]);

    return null;
}
