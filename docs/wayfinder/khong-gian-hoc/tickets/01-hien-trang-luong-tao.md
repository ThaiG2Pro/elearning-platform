---
id: khong-gian-hoc/01
title: Hiện trạng luồng tạo course/chapter/lesson
label: wayfinder:research
status: closed
assignee: "claude (research subagent)"
blocked_by: []
---
## Question

Khảo sát hiện trạng codebase để các quyết định sau đứng trên facts:
1. Luồng tạo/sửa course → chapter → lesson hiện tại đi qua những màn hình, API, service nào? Bao nhiêu bước bắt buộc trước khi một video xem được?
2. Chapter hiện có bắt buộc ở tầng nào (DB constraint, service validation, UI)? Có chỗ nào đã tự tạo "chương mặc định" chưa?
3. Bảng `sources` đang được ghi/đọc ở đâu, `metadata` đang chứa gì, URL YouTube được normalize thế nào?
4. Share/clone hiện copy cấu trúc course thế nào (có giả định gì về chapter)?

Findings ghi vào `docs/wayfinder/khong-gian-hoc/research/hien-trang-luong-tao.md`.

## Resolution

Findings đầy đủ (kèm file:line cho mọi khẳng định): [research/hien-trang-luong-tao.md](../research/hien-trang-luong-tao.md). Các fact quyết định:

1. **Luồng "dán URL → tạo course" đã tồn tại** (`POST /management/courses/from-link`, 1 transaction tạo source+course+chương+bài) — thiếu sót chỉ là nó đổ về trang editor thay vì trang học.
2. **"Chương mặc định" đã là tiền lệ chạy production** — cả hai đường tạo course đều tự sinh `'Chương 1'` ở tầng service; phương án (a) của ticket 02 chỉ còn là việc *ẩn* nó ở UI editor.
3. **Chapter bắt buộc ở cả 3 tầng** (DB NOT NULL + RESTRICT, service, UI editor) nhưng **trang learn đã tolerant** với chapter rỗng; nếu đi đường nullable có ~10 điểm đọc phải sửa, trong đó `cloneForOwner` và `GET /courses/[id]/lessons` fail-silent (mất bài không báo lỗi).
4. **`sources` gần như write-only**: 1 chỗ ghi, `metadata` chưa từng được đọc lại, lesson tạo tay không có `source_id`; logic normalize URL YouTube đang bị copy ≥4 nơi.
