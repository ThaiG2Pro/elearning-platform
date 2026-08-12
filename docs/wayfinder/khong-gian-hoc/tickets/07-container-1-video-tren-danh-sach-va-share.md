---
id: khong-gian-hoc/07
title: Container 1-video trên danh sách khóa học và share/clone
label: wayfinder:grilling
status: closed
assignee: "claude (session 8c9c7d10)"
blocked_by: [khong-gian-hoc/05]
---
## Question

Luồng "dán 1 URL → không gian học" (ticket 04) sẽ sinh ra nhiều container chỉ 1 video. Chốt cách chúng xuất hiện giữa các course nhiều chương/bài: (a) trang `/my-courses` — có badge/nhóm/lọc theo hình thái ("từ YouTube" vs tự soạn) không, hay đối xử đồng nhất; (b) trang share `/share/{token}` và luồng "Sao chép về học" — hiển thị không gian 1-video có gì khác không (sidebar 1 mục, tầng chương đã ẩn theo ticket 02)? Từ ngữ hiển thị dùng theo quyết định ticket 05.

## Resolution

Nền đã khảo (đọc code thật `src/app/my-courses/page.tsx`, `src/app/share/[token]/page.tsx`): `/my-courses` hiện chỉ có thumbnail + title + status badge, chưa có tín hiệu số bài nào; `/share/{token}` hiện **luôn** in tiêu đề chương cho mọi chương — chưa áp dụng luật ẩn-chương-đơn của ticket "Cài đặt 'chương tùy chọn'" (lệch thực sự với learn page/editor, không phải chủ ý thiết kế).

1. **`/my-courses`, `/my-learning`**: chỉ thêm badge "N bài" (đã chốt sẵn ở ticket "Từ hiển thị container trên UI") — **không** thêm tab/nhóm/lọc riêng theo hình thái nguồn ("từ YouTube" vs "tự soạn"). Giữ đúng tinh thần ADR-0001: không có container thứ hai, nên UI không tái tạo phân biệt đó bằng tab/filter — chỉ một tín hiệu phụ rẻ trên card.
2. **`/share/{token}`**: **fix để nhất quán** — áp dụng luật ẩn-chương-đơn (ticket "Cài đặt 'chương tùy chọn'") vào phần "Nội dung khóa học": khi course chỉ có 1 chương, ẩn tiêu đề chương, in phẳng danh sách bài. Container 1-video từ luồng dán URL sẽ hiện đúng 1 bài, không lộ "Chương 1" thừa.
3. **`/share/{token}`**: **không** thêm badge "N bài" — trang này chỉ có 1 course, danh sách chương/bài liệt kê trực tiếp đã đủ thông tin; badge chỉ có giá trị khi lướt nhanh một lưới nhiều course.
4. **Nhãn "Khóa học được chia sẻ"** (và mọi chuỗi "khóa học" khác trên trang share): đổi theo quyết định "Space" đã chốt ở ticket "Từ hiển thị container trên UI" — áp dụng thẳng, không phải quyết định mới của ticket này.
5. **Luồng "Sao chép về học"**: giữ nguyên hành vi hiện tại — copy xong luôn redirect `/courses/{id}/learn` bất kể hình thái, đã đồng nhất từ trước, không cần đổi.
