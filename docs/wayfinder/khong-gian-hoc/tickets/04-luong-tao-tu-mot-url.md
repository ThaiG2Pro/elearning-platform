---
id: khong-gian-hoc/04
title: Luồng tạo "dán 1 URL → không gian học"
label: wayfinder:prototype
status: closed
assignee: "claude (session 8c9c7d10)"
blocked_by: [khong-gian-hoc/01, khong-gian-hoc/02]
---
## Question

Nếu "khóa học" là không gian học quanh nội dung nguồn thì việc tạo nó từ 1 video lẻ phải nhẹ tương xứng: dán URL → có ngay chỗ học, không đi qua 3 tầng form course/chapter/lesson. Prototype luồng tạo (mockup/stub UI) để chốt: bước nhập tối thiểu là gì, title/metadata lấy từ đâu, cấu trúc sinh ra thế nào (theo quyết định ticket 02), và luồng hiện tại giữ lại cho ai. Link prototype làm asset của ticket.

## Assets

- Mockup tĩnh 3 màn: [prototypes/04-luong-tao-tu-mot-url.html](../prototypes/04-luong-tao-tu-mot-url.html) — mở trực tiếp bằng trình duyệt.

## Resolution

Nền: luồng server đã có sẵn (`POST /management/courses/from-link`, 1 transaction) — ticket này chỉ chốt UX bao quanh nó. Prototype 3 màn ở Assets là hình dạng đã được duyệt.

1. **Điểm vào**: ô dán URL là **hero mặc định của `/my-courses`** ("dán link → Học ngay"), thay thế modal "Tạo từ link YouTube"; "Tạo khóa học trống" tụt xuống làm link phụ. Bước nhập tối thiểu = **đúng 1 trường** (URL), không hỏi tên. Chưa đặt thêm ô dán ở trang chủ — thêm sau nếu thấy thiếu.
2. **Đích đến = thẳng `/courses/{id}/learn`**, KHÔNG qua editor và KHÔNG chèn bước "thêm quiz/artifact" ở giữa — lời hứa của luồng là "dán → học ngay", nhu cầu enrichment phát sinh trong lúc học chứ không phải lúc dán link. Đổi lại, trang learn phải có: (i) **nút "Chỉnh sửa" thường trực cho owner** — vá luôn lỗ hổng điều hướng hiện tại (learn page đang không có bất kỳ link nào về editor); (ii) **toast/banner một lần sau khi tạo** giới thiệu quiz/tóm tắt/ghi chú trong trình chỉnh sửa. "Learn là nhà, enrichment là cánh cửa mở sẵn trong nhà." Gợi ý ngữ cảnh mạnh hơn (ví dụ "tạo quiz?" khi xem xong video) là tối ưu về sau, ngoài ticket.
3. **Title/metadata lấy từ oEmbed như hiện tại, nhưng oEmbed fail không còn chặn tạo**: thay hành vi 422 `YOUTUBE_METADATA_FETCH_FAILED` hiện tại bằng vẫn-tạo với title tạm `"Video YouTube (<videoId>)"` + banner gợi ý đổi tên — metadata là mỹ phẩm, video vẫn phát được. Chỉ từ chối khi URL không phải YouTube hợp lệ.
4. **URL playlist bị từ chối ngay ở ô nhập** với thông báo rõ ("chưa hỗ trợ playlist — dán link từng video"): không tạo không gian rỗng vì nó phản bội lời hứa "Học ngay". Schema đã chừa chỗ (ticket 03); khi effort import playlist tương lai làm thật, đích-đến-learn vẫn đúng (course N bài → sidebar N video, như luồng clone hôm nay).
5. **Cấu trúc sinh ra** theo đúng các ticket trước: `sources` (dedup) → `courses` ghi `source_id` (ticket 03) → chương mặc định `'Chương 1'` ẩn ở UI (ticket 02) → 1 lesson. **Luồng tạo trống + editor giữ nguyên** làm đường phụ cho người tự soạn cấu trúc — effort này không đụng vào.
