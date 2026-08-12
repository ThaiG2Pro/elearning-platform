---
id: khong-gian-hoc/02
title: Cài đặt "chương tùy chọn" — chương mặc định ẩn hay migration nullable
label: wayfinder:grilling
status: closed
assignee: "claude (session 8c9c7d10)"
blocked_by: [khong-gian-hoc/01]
---
## Question

Khái niệm đã chốt: chương là cách nhóm bài, tùy chọn (ADR-0001). Cài đặt chọn hướng nào: (a) giữ schema `lessons.chapter_id` bắt buộc, dùng chương mặc định ẩn ở UI; (b) migration cho lesson treo trực tiếp vào course (chapter_id nullable / bảng nối); (c) hướng khác. Quyết dựa trên facts từ ticket 01 (mức độ giả định về chapter trong code, chi phí migration, ảnh hưởng share/clone).

## Resolution

Chốt **(a) — chương mặc định ẩn, schema nguyên trạng** (`lessons.chapter_id` giữ NOT NULL). "Chương tùy chọn" là chuyện người dùng nhìn thấy gì, không phải chuyện DB lưu gì — cùng tinh thần ADR-0001. Phương án nullable bị loại vì ~10 điểm đọc phải sửa, trong đó `cloneForOwner` và `GET /courses/[id]/lessons` fail-silent (mất bài không báo lỗi).

Chi tiết đã chốt:

1. **Luật ẩn thuần theo đếm**: course có đúng 1 chương (bất kể tên) → UI ẩn tầng chương; thêm chương thứ 2 → hiện; xóa còn 1 → tự ẩn lại. Không cờ, không so tên, không trạng thái.
2. **Tên chương mặc định giữ `'Chương 1'`** như production hiện tại — khi hiện ra lúc user thêm chương 2, tên này là gợi ý tự nhiên để đổi tên; không tạo lệch data cũ/mới.
3. **Luật ẩn áp dụng mọi bề mặt** vẽ cấu trúc course: editor, sidebar trang học, trang xem share/clone preview — một luật hiển thị dùng chung.
4. Invariant "course luôn ≥1 chương" (`PublishingPolicy` cấm xóa chương cuối) **giữ nguyên** — chính là nền của phương án (a); nút xóa chương không render khi tầng chương ẩn nên lỗi này không bao giờ lộ ở UI.
