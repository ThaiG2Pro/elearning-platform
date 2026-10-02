---
id: khong-gian-hoc/03
title: Ghi xuất xứ playlist trong sources
label: wayfinder:grilling
status: closed
assignee: "claude (session 8c9c7d10)"
blocked_by: []
---
## Question

Mô hình phải ghi nhận được "video này thuộc playlist nào" (chủ kênh tạo hay tự gom) mà không cam kết tự động hóa import (out of scope). Chốt: hình dạng dữ liệu trong `sources` (trường riêng vs `metadata` JSON: playlist_id, playlist_title, position?), phân biệt hai loại playlist có cần thiết không, và mức tối thiểu để import tự động sau này không phải migration.

## Resolution

Điểm neo quyết định mọi thứ: `sources` dedup theo `normalized_url` — mỗi video đúng 1 dòng, dùng chung mọi course/mọi người. Xuất xứ playlist vì thế **không phải thuộc tính của video** mà của *lần đưa video vào không gian học* — nhét vào `metadata` dòng video sẽ vỡ khi cùng video được import từ hai playlist khác nhau.

Chốt:

1. **Playlist là một dòng `sources` riêng** (`url` = URL playlist, dedup bằng `normalized_url` như video) + **cột mới `courses.source_id` (nullable, FK → sources)** ghi "course này sinh từ nguồn nào". Xuất xứ neo ở tầng course, khớp mô hình "1 URL → 1 không gian học". Không neo tầng lesson — `lessons.source_id` (đã có, trỏ dòng video) cộng course-level là đủ; nhớ-xuất-xứ-từng-bài cho course trộn là chi phí trả trước cho nhu cầu chưa thấy.
2. **Chi tiết playlist để trong `metadata` JSON** (playlistId, kênh/chủ playlist, số video lúc import…) — đúng tiền lệ write-only hiện tại; chỉ nâng lên trường riêng khi có nhu cầu lọc thật.
3. **Không phân biệt "playlist chủ kênh" vs "playlist tự gom" bằng `type`** — một type playlist duy nhất; thông tin kênh vào `metadata` nếu lấy được, "chủ kênh hay tự gom" là suy diễn hiển thị, không phải hằng số mô hình (URL/oEmbed không cho biết chắc).
4. **Chuẩn hóa bộ giá trị `type` ngay trong spec**: `YOUTUBE_VIDEO` / `YOUTUBE_PLAYLIST` (nguồn khác thêm giá trị sau); sửa seed (`prisma/seed.ts` đang ghi `'VIDEO'`, lệch với service `'YOUTUBE'`) về cùng bộ.
5. **Không lưu vị trí gốc trong playlist** — thứ tự lúc import map vào `lessons.order_index` là hết trách nhiệm; sau đó không gian học là của người dùng, sync lại playlist đã ngoài phạm vi.
6. **Course tạo từ 1 video lẻ (from-link hiện tại) cũng ghi `courses.source_id`** trỏ dòng video — một ngữ nghĩa duy nhất "course sinh từ nguồn nào", không có trường hợp đặc biệt.
7. **Clone copy nguyên `source_id`** — xuất xứ nội dung không đổi khi đổi chủ; chuyện "đến từ clone" đã có `cloned_from_course_id` lo, hai fact độc lập.

Mức tối thiểu để import tự động sau này **không phải migration** = đúng những gì ở trên: type playlist + cột `courses.source_id`. Luồng import tương lai chỉ thêm code, không thêm schema.
