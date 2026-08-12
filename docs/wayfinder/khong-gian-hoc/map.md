---
title: Khóa học như không gian học
label: wayfinder:map
created: 2026-08-12
---

## Destination

Spec đã chốt cho mô hình tổ chức nội dung khóa học cá nhân: glossary + ADR + cấu trúc dữ liệu đích (chương tùy chọn, sources ghi xuất xứ playlist) **cộng** các quyết định UX là hệ quả trực tiếp (luồng tạo "dán 1 URL → không gian học"). Xong khi không còn gì phải quyết trước lúc lập kế hoạch triển khai.

## Notes

- Domain: e-learning cá nhân, nguồn chủ yếu YouTube (video lẻ / playlist chủ kênh / playlist tự gom). Vimeo và nguồn khác hưởng ké ở tầng khái niệm, không ticket riêng.
- Skills mỗi session nên dùng: `/grilling` + `/domain-modeling` (glossary tại `CONTEXT.md`, ADR tại `docs/adr/`).
- Ngôn ngữ làm việc: tiếng Việt.
- Tracker: local-markdown theo `docs/wayfinder/TRACKER.md`.

## Decisions so far

- [CONTEXT.md — glossary nền](../../../CONTEXT.md) — "Khóa học" = không gian học cá nhân quanh nội dung nguồn; Chương tùy chọn; Nguồn ghi xuất xứ; Hoàn thành đồng nhất mọi hình thái.
- [ADR-0001 — Một container duy nhất](../../adr/0001-mot-container-duy-nhat-cho-moi-hinh-thai-noi-dung-hoc.md) — không thêm container thứ hai; giữ chữ "khóa học" ở code/DB, nới nghĩa.
- [Hiện trạng luồng tạo course/chapter/lesson](tickets/01-hien-trang-luong-tao.md) — luồng "dán URL → course" đã tồn tại (from-link, 1 API); "Chương 1" mặc định đã là tiền lệ production; chapter bắt buộc 3 tầng nhưng learn page đã tolerant; `sources` write-only, normalize URL copy ≥4 nơi.
- [Cài đặt "chương tùy chọn" — chương mặc định ẩn hay migration nullable](tickets/02-cai-dat-chuong-tuy-chon.md) — chốt chương mặc định ẩn, schema nguyên trạng; luật ẩn thuần theo đếm (đúng 1 chương → ẩn), áp dụng mọi bề mặt; tên default giữ `'Chương 1'`.
- [Ghi xuất xứ playlist trong sources](tickets/03-xuat-xu-playlist-trong-sources.md) — playlist là dòng `sources` riêng + cột mới `courses.source_id` (nullable); chi tiết vào `metadata` JSON; không phân biệt loại playlist bằng `type`; chuẩn hóa `type` = `YOUTUBE_VIDEO`/`YOUTUBE_PLAYLIST`; from-link video lẻ cũng ghi `source_id`, clone copy nguyên.
- [Luồng tạo "dán 1 URL → không gian học"](tickets/04-luong-tao-tu-mot-url.md) — hero dán-URL thay modal from-link; tạo xong vào thẳng trang học (không qua editor, không chèn bước enrichment); trang học có nút "Chỉnh sửa" thường trực + banner giới thiệu quiz/sum một lần; oEmbed fail vẫn tạo với title tạm; URL playlist bị từ chối ở ô nhập; luồng tạo trống/editor giữ nguyên làm đường phụ.

## Not yet specified

(trống — mọi mảng fog đã sắc nét thành ticket, xem frontier)

## Out of scope

- **Tự động hóa import playlist YouTube** (dán URL playlist → tự sinh bài học) — chủ dự án đánh giá khó ở mức lập trình, ngoài phạm vi effort này; mô hình dữ liệu vẫn phải chừa chỗ (ticket 03).
- **Trải nghiệm học / hiển thị tiến độ khác nhau theo hình thái** — quyết định Q10 chốt destination ở domain + UX luồng tạo; ngữ nghĩa "hoàn thành" đã chốt đồng nhất.
