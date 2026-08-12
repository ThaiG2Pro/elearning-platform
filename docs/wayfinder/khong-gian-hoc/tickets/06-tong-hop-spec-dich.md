---
id: khong-gian-hoc/06
title: Tổng hợp spec đích
label: wayfinder:task
status: closed
assignee: "claude (session 8c9c7d10)"
blocked_by: [khong-gian-hoc/02, khong-gian-hoc/03, khong-gian-hoc/04, khong-gian-hoc/05, khong-gian-hoc/07]
---
## Question

Gom mọi quyết định đã đóng (glossary, ADR, các ticket 02–05, 07) thành một spec duy nhất sẵn sàng bàn giao cho effort triển khai: cấu trúc dữ liệu đích, luồng tạo, từ ngữ UI, và danh sách việc triển khai gợi ý. Đây là artifact destination của map.

## Assets

- Spec tổng hợp: [docs/design/khong-gian-hoc-spec.md](../../design/khong-gian-hoc-spec.md) — 7 mục: khái niệm nền, cấu trúc dữ liệu đích, luồng tạo dán-URL, từ ngữ hiển thị, container 1-video trên danh sách/share, danh sách việc triển khai gợi ý (checklist), ngoài phạm vi.

## Resolution

Đã gom toàn bộ quyết định (glossary `CONTEXT.md`, ADR-0001, ticket 01–05, 07) thành một tài liệu bàn giao duy nhất — xem Assets. Không có quyết định mới ở ticket này, chỉ tổng hợp + rút ra checklist việc triển khai (mục 6 của spec) từ những gì đã chốt rải rác qua các ticket.

**Đây là ticket cuối của map — không còn quyết định nào phải chốt trước khi lập kế hoạch triển khai. Destination đã đạt, map đóng.**

**Cập nhật sau khi đóng map** (theo yêu cầu, cùng pattern checkpoint2-feasibility ticket "Fold confirmed/changed conclusions"): spec đã fold vào `docs/ROADMAP.md` thành **WP1.10** (6 sub-item, ứng với 6 mục của spec) — Checkpoint 1, đứng ngay sau WP1.9. Không sửa `VISION.md` — nội dung ở đó dùng "khóa học" ở mức chiến lược/prose, không phải UI copy, không mâu thuẫn với quyết định đổi từ hiển thị.
