---
id: khong-gian-hoc/05
title: Từ hiển thị container trên UI
label: wayfinder:grilling
status: closed
assignee: "claude (session 8c9c7d10)"
blocked_by: []
---
## Question

Đã chốt giữ "khóa học" ở code/DB và nới nghĩa trong glossary (Q7: "b trước mắt"). Còn mở: từ hiển thị trên UI — giữ nguyên "Khóa học" hay đổi sang từ trung tính hơn ("Không gian học", "Sổ học"...) ở những màn hình nào? Quyết định rẻ, đảo ngược được, nhưng chạm mọi màn hình nên cần chốt một lần cho nhất quán.

## Resolution

**Từ hiển thị đổi thành "Space"** (tiếng Anh, chèn độc lập giữa câu Việt — không ghép cụm "Learning Space"): "Space của tôi", "Tạo Space mới", "Space nổi bật", "Lỗi khi tạo Space", v.v. Lý do chọn "Space" thay vì "Không gian học" (dù từ đó đã có sẵn trong glossary/tên effort): ngắn gọn, và là một từ định danh riêng — giống cách app hiện đại chèn 1 từ tiếng Anh làm brand-term giữa câu ngữ cảnh Việt (kiểu "Workspace") — dễ phân biệt với các app học online khác dùng nguyên "khóa học"/"course".

- **Phạm vi**: đồng nhất trên **mọi** màn hình — trang chủ (discover), `/my-courses` (owner soạn), `/my-learning` (learner), `/share/{token}`, editor, learn page. Không phân hóa theo owner-soạn vs learner-học; một thực thể không mang 2 tên tùy màn hình.
- **Code/DB/route**: **không đổi** — đây thuần là quyết định string hiển thị. `courses`, route `/my-courses`, `/courses/[id]`, biến `course` trong code giữ nguyên đúng theo ADR-0001 ("giữ chữ 'khóa học' ở code/DB, nới nghĩa"). Rebrand tên route (ví dụ `/my-spaces`) không nằm trong ticket này.
- **Phân biệt hình thái nội dung**: **có** — thêm badge/dòng phụ dạng "N bài" cạnh tên Space trên các trang liệt kê chung (`/my-courses`, `/my-learning`), ví dụ "1 video · từ YouTube" vs "3 chương · 24 bài" (đã thấy tự nhiên trong mockup ticket Luồng tạo "dán 1 URL → không gian học"). Không đổi danh từ chính theo hình thái — chỉ thêm tín hiệu phụ rẻ, đảo ngược được. Đây là input trực tiếp cho ticket "Container 1-video trên danh sách khóa học và share/clone".

Có một câu hỏi ngoài lề nảy ra giữa phiên (so sánh với template "Learning Space" trên Notion) — không phải quyết định của ticket này, chỉ là thảo luận định hướng; kết luận: bộ tính năng tự động hóa + gắn chặt nội dung (auto-metadata từ URL, resume theo giây thực, quiz/tóm tắt sinh từ nội dung, share/clone giữ tiến độ tách biệt) là thứ Notion generic không có sẵn — đúng như lý do ADR-0001 đã loại phương án đổi hẳn khái niệm kiểu NotebookLM.
