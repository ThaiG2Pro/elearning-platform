---
id: khong-gian-hoc/01
title: Hiện trạng luồng tạo course/chapter/lesson
label: wayfinder:research
status: open
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
