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

- Mockup tĩnh 3 màn (nhánh "Học ngay"): [prototypes/04-luong-tao-tu-mot-url.html](../prototypes/04-luong-tao-tu-mot-url.html) — mở trực tiếp bằng trình duyệt.

## Resolution

Nền: luồng server đã có sẵn (`POST /management/courses/from-link`, 1 transaction) — ticket này chỉ chốt UX bao quanh nó.

Luồng chốt: **dán URL → card lựa chọn → (học ngay | soạn trước) → trang học có cue tái diễn**. Không đi thẳng "dán → học" tuyệt đối như bản mockup ban đầu — thêm đúng 1 bước lựa chọn để không hy sinh discoverability của quiz/tóm tắt (thứ tạo ra khác biệt so với chỉ xem video + ghi chú trên YouTube).

1. **Điểm vào `/my-courses`**: hero paste-box thay thế cặp nút "Tạo khóa học" / "Tạo từ link YouTube" hiện tại — nhập tối thiểu là 1 URL, không hỏi tên. "Tạo khóa học trống" tụt xuống thành link phụ, **giữ nguyên không sửa** — vẫn là đường cho người muốn tự soạn cấu trúc nhiều chương/bài từ đầu. Chưa đặt thêm ô dán ở trang chủ — thêm sau nếu thấy thiếu.
2. **Sau khi dán, trước khi vào không gian học**: hiện **card lựa chọn** 2 nút — "Học ngay" hoặc "Thêm quiz/tóm tắt trước khi học".
   - "Học ngay" → tạo xong, redirect thẳng `/courses/{id}/learn` (không qua editor).
   - "Thêm quiz/tóm tắt trước khi học" → mở **editor đầy đủ** hiện có (`/my-courses/{id}/edit`) — không dựng UI soạn rút gọn riêng, vì course lúc này chỉ có 1 lesson nên chương ẩn tự động theo luật đếm (ticket 02), khiến editor *tự nhiên* gọn như một màn soạn thu gọn, miễn phí.
3. **Trang học có cue tái diễn**, không phụ thuộc một lần bấm đúng lúc tạo (thay cho ý tưởng banner-một-lần ban đầu):
   - Thẻ tĩnh thường trực trong sidebar: "+ Thêm quiz/tóm tắt cho bài này" — ngang hàng danh sách lesson, luôn ở đó cho ai chủ động ghé.
   - Cue theo thời điểm: khi video kết thúc / lesson được đánh dấu hoàn thành → gợi ý nhỏ "Đã xong video. Tạo quiz để ôn lại?" — đúng lúc nội dung vừa tiếp nhận, việc YouTube không làm được.
   - Cả hai cùng tồn tại, không loại trừ nhau; nội dung/luồng tạo quiz tự nó không đổi — đây chỉ là bề mặt discover, nằm trong phạm vi ticket này. Nhân đây vá luôn lỗ hổng điều hướng hiện tại: trang learn hiện không có bất kỳ link nào về editor.
4. **oEmbed fail**: đổi hành vi hiện tại (422 `YOUTUBE_METADATA_FETCH_FAILED`, không tạo gì) thành **vẫn tạo** với title tạm `"Video YouTube (<videoId>)"` + banner gợi ý đổi tên. Lý do: metadata chỉ là mỹ phẩm (thumbnail thực tế đã suy từ `content_url` bằng regex, không đọc `sources.metadata`), video vẫn phát được qua player — không nên phạt user oan vì một lần gọi oEmbed lỗi. Chỉ từ chối khi URL không phải YouTube hợp lệ.
5. **Dán URL playlist vào ô này**: **từ chối** ngay ở ô nhập, báo rõ "chưa hỗ trợ playlist — dán link từng video". Không tạo không gian học rỗng chờ import — rỗng thì không xem được gì ngay, phản bội đúng lời hứa "Học ngay" của luồng này. Schema đã chừa chỗ (ticket 03); khi effort import playlist tương lai làm thật, đích-đến-learn vẫn đúng (course N bài → sidebar N video, như luồng clone hôm nay).
6. **Cấu trúc sinh ra** theo đúng các ticket trước: `sources` (dedup) → `courses` ghi `source_id` (ticket 03) → chương mặc định `'Chương 1'` ẩn ở UI (ticket 02) → 1 lesson. **Luồng tạo trống + editor giữ nguyên** làm đường phụ cho người tự soạn cấu trúc — effort này không đụng vào.

Mockup 3 màn ở Assets mô tả nhánh "Học ngay"; card lựa chọn và cue tái diễn ở bước 2–3 là quyết định lời (chưa có mockup riêng) — không cần dựng thêm vì đều tái dùng UI có sẵn (editor, sidebar).
