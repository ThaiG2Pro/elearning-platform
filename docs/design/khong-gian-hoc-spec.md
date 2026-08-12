# Khóa học như không gian học — spec đã chốt

Nguồn: map wayfinder [Khóa học như không gian học](../wayfinder/khong-gian-hoc/map.md), gom mọi quyết định đã đóng (glossary, ADR, ticket 01–05, 07). Đây là bản bàn giao cho effort triển khai — không mở thêm quyết định mới, chỉ tổng hợp cho dễ đọc một lần.

## 1. Khái niệm nền

Nguồn: [CONTEXT.md](../../CONTEXT.md), [ADR-0001](../adr/0001-mot-container-duy-nhat-cho-moi-hinh-thai-noi-dung-hoc.md).

- **Khóa học (`course` trong code/DB)** = không gian học cá nhân quanh nội dung nguồn, từ 1 video lẻ đến playlist có trình tự đến bộ sưu tập tạp — **một container duy nhất** cho mọi hình thái, không thêm loại thứ hai. Lý do: cả ba hình thái dùng chung trọn bộ tính năng (notes, quiz, tiến độ, share/clone); container thứ hai sẽ nhân đôi mọi luồng đó chỉ để đổi tên.
- **Chương** = cách nhóm bài, thuần tổ chức, **tùy chọn về khái niệm** — khóa học phẳng (không chương) hợp lệ.
- **Bài học** = 1 đơn vị nội dung (video/quiz/text/file), có thể trỏ tới 1 Nguồn.
- **Nguồn (`sources`)** = xuất xứ bên ngoài của nội dung — URL YouTube/Vimeo + metadata, ghi nhận cả xuất xứ playlist.
- **Hoàn thành** = ngữ nghĩa đồng nhất cho mọi hình thái, không phân biệt video lẻ hay giáo trình tuần tự.
- **Chủ sở hữu** = người tạo, toàn quyền; không có khái niệm ghi danh.
- Code/DB/route **giữ nguyên** `course`/`chapter`/`lesson`/`source` — mọi thay đổi trong spec này chỉ ở tầng hiển thị hoặc thêm cột, không đổi tên khái niệm ở code.

## 2. Cấu trúc dữ liệu đích

Nguồn: [ticket 02](../wayfinder/khong-gian-hoc/tickets/02-cai-dat-chuong-tuy-chon.md), [ticket 03](../wayfinder/khong-gian-hoc/tickets/03-xuat-xu-playlist-trong-sources.md).

- **Schema `lessons.chapter_id` giữ NOT NULL** (không migration nullable). "Chương tùy chọn" là chuyện *hiển thị*, không phải chuyện DB lưu — mọi course vẫn có ≥1 chương ở DB, invariant `PublishingPolicy` (cấm xóa chương cuối) giữ nguyên.
- **Luật ẩn chương thuần theo đếm**: course có đúng 1 chương (bất kể tên) → UI ẩn tầng chương, in phẳng danh sách bài; thêm chương thứ 2 → hiện; xóa còn 1 → tự ẩn lại. Không cờ, không so tên, không trạng thái riêng.
- **Áp dụng luật ẩn ở mọi bề mặt vẽ cấu trúc course**: editor, sidebar trang học, và **trang share/clone preview** (hiện đang lệch — xem việc triển khai §5).
- **Tên chương mặc định giữ `'Chương 1'`** — khi lộ ra lúc thêm chương 2, đây là gợi ý tự nhiên để đổi tên.
- **Cột mới `courses.source_id`** (nullable, FK → `sources`) ghi "course này sinh từ nguồn nào" — neo ở tầng course, khớp mô hình "1 URL → 1 không gian học". `lessons.source_id` (đã có) không đổi, cộng course-level là đủ.
- **Playlist là một dòng `sources` riêng** (`url` = URL playlist, dedup bằng `normalized_url` như video) — xuất xứ playlist là thuộc tính của *lần đưa video vào không gian học*, không phải thuộc tính của video (video dùng chung nhiều course/nhiều người).
- **Chi tiết playlist vào `metadata` JSON** (playlistId, kênh/chủ playlist, số video lúc import…) — đúng tiền lệ write-only hiện tại, chỉ nâng lên trường riêng khi có nhu cầu lọc thật.
- **Không phân biệt "playlist chủ kênh" vs "playlist tự gom" bằng `type`** — một type playlist duy nhất; "chủ kênh hay tự gom" là suy diễn hiển thị, không phải hằng số mô hình.
- **Chuẩn hóa `type`**: `YOUTUBE_VIDEO` / `YOUTUBE_PLAYLIST` (nguồn khác thêm giá trị sau) — sửa seed hiện ghi `'VIDEO'` lệch với service `'YOUTUBE'`.
- **Không lưu vị trí gốc trong playlist** — thứ tự lúc import map vào `lessons.order_index` là hết trách nhiệm; sync lại playlist nguồn ngoài phạm vi.
- **Course tạo từ 1 video lẻ cũng ghi `courses.source_id`** — một ngữ nghĩa duy nhất "course sinh từ nguồn nào", không có trường hợp đặc biệt cho video đơn.
- **Clone copy nguyên `source_id`** — xuất xứ nội dung không đổi khi đổi chủ; tách biệt với `cloned_from_course_id` (chuyện "đến từ clone" là fact khác).
- Mức tối thiểu này **không phải migration** khi effort import playlist tự động (ngoài phạm vi) làm thật — chỉ thêm code.

## 3. Luồng tạo "dán 1 URL → không gian học"

Nguồn: [ticket 04](../wayfinder/khong-gian-hoc/tickets/04-luong-tao-tu-mot-url.md) + [mockup 3 màn](../wayfinder/khong-gian-hoc/prototypes/04-luong-tao-tu-mot-url.html).

Nền: server flow đã tồn tại (`POST /management/courses/from-link`, 1 transaction: `sources` dedup → `courses` ghi `source_id` → chương mặc định ẩn → 1 lesson). Ticket này chốt UX bao quanh.

1. **Điểm vào `/my-courses`**: hero paste-box thay cặp nút "Tạo khóa học"/"Tạo từ link YouTube" hiện tại — nhập tối thiểu 1 URL, không hỏi tên. "Tạo khóa học trống" tụt xuống link phụ, giữ nguyên cho người tự soạn cấu trúc nhiều chương/bài.
2. **Sau khi dán → card lựa chọn** 2 nút:
   - **"Học ngay"** → tạo xong, redirect thẳng `/courses/{id}/learn`, không qua editor.
   - **"Thêm quiz/tóm tắt trước khi học"** → mở editor đầy đủ hiện có — không dựng UI soạn rút gọn riêng; vì course chỉ có 1 lesson, chương ẩn tự động (luật §2) khiến editor tự nhiên gọn như 1 màn soạn thu gọn, miễn phí.
3. **Trang học có cue tái diễn** (không phụ thuộc 1 lần bấm đúng lúc tạo):
   - Thẻ tĩnh thường trực trong sidebar: "+ Thêm quiz/tóm tắt cho bài này".
   - Cue theo thời điểm: video kết thúc / lesson hoàn thành → gợi ý nhỏ "Đã xong video. Tạo quiz để ôn lại?".
   - Vá kèm: trang learn hiện **không có link nào về editor** — thêm đường về editor là một phần của cue này.
4. **oEmbed fail**: đổi từ 422 chặn-hoàn-toàn (`YOUTUBE_METADATA_FETCH_FAILED`) thành **vẫn tạo** với title tạm `"Video YouTube (<videoId>)"` + banner gợi ý đổi tên. Chỉ từ chối khi URL không phải YouTube hợp lệ.
5. **URL playlist dán vào ô này** → **từ chối ngay ở ô nhập** ("chưa hỗ trợ playlist — dán link từng video"). Không tạo không gian rỗng chờ import.
6. Luồng tạo trống + editor đầy đủ **giữ nguyên, không sửa** — vẫn là đường phụ cho người tự soạn cấu trúc từ đầu.

## 4. Từ ngữ hiển thị UI

Nguồn: [ticket 05](../wayfinder/khong-gian-hoc/tickets/05-tu-hien-thi-container-tren-ui.md).

- Đổi **"Khóa học" → "Space"** trên **toàn bộ UI**, đồng nhất mọi màn hình (trang chủ, `/my-courses`, `/my-learning`, `/share/{token}`, editor, learn page) — chèn độc lập giữa câu Việt ("Space của tôi", "Tạo Space mới", "Space nổi bật"), không ghép cụm "Learning Space".
- **Code/DB/route không đổi** — `courses`, `/my-courses`, `/courses/[id]`, biến `course` giữ nguyên; đây thuần là quyết định string hiển thị.
- **Badge "N bài"** cạnh tên Space trên các trang liệt kê (`/my-courses`, `/my-learning`) để phân biệt hình thái — ví dụ "1 video · từ YouTube" vs "3 chương · 24 bài". Không đổi danh từ chính theo hình thái, chỉ thêm tín hiệu phụ.

## 5. Container 1-video trên danh sách và share/clone

Nguồn: [ticket 07](../wayfinder/khong-gian-hoc/tickets/07-container-1-video-tren-danh-sach-va-share.md).

- **`/my-courses`, `/my-learning`**: chỉ badge "N bài" (§4) — **không** thêm tab/nhóm/lọc theo hình thái nguồn ("từ YouTube" vs "tự soạn"). Giữ tinh thần ADR-0001: không tái tạo phân biệt container ở tầng UI.
- **`/share/{token}`**: **fix để nhất quán** — trang này hiện *luôn* in tiêu đề chương cho mọi chương, chưa áp dụng luật ẩn-chương-đơn (§2). Cần sửa để container 1-video hiện đúng 1 bài phẳng, không lộ "Chương 1" thừa.
- **`/share/{token}`**: không cần badge "N bài" — chỉ có 1 course/trang, danh sách chương/bài liệt kê trực tiếp đã đủ.
- **Nhãn "Khóa học được chia sẻ"** và mọi chuỗi "khóa học" khác trên trang share → đổi theo "Space" (§4).
- **"Sao chép về học"**: giữ nguyên hành vi hiện tại — copy xong luôn redirect `/courses/{id}/learn` bất kể hình thái.

## 6. Danh sách việc triển khai gợi ý

Không theo thứ tự ưu tiên — effort triển khai tự sắp lịch.

**Schema/migration**
- [ ] Thêm cột `courses.source_id` (nullable, FK → `sources`).
- [ ] Chuẩn hóa `sources.type` = `YOUTUBE_VIDEO` / `YOUTUBE_PLAYLIST`; sửa `prisma/seed.ts` đang ghi `'VIDEO'` lệch với service `'YOUTUBE'`.

**Backend**
- [ ] `POST /management/courses/from-link`: bỏ 422 khi oEmbed fail → tạo với title tạm `"Video YouTube (<videoId>)"`.
- [ ] Cùng endpoint: từ chối URL playlist ở tầng validate (báo lỗi rõ, không tạo course rỗng).
- [ ] Ghi `courses.source_id` cho mọi course tạo từ from-link (video lẻ và playlist tương lai).
- [ ] Chuẩn hóa lại logic normalize URL YouTube đang copy ≥4 nơi (`YouTubeOEmbedAdapter`, `prisma/seed.ts`, `VideoThumbnailUtil`, learn/edit page) — dọn kỹ thuật, không phải quyết định mới nhưng đáng làm cùng lúc đụng vào vùng này.

**Frontend — luồng tạo (§3)**
- [ ] `/my-courses`: hero paste-box thay 2 nút hiện tại; "Tạo khóa học trống" tụt xuống link phụ.
- [ ] Card lựa chọn "Học ngay" / "Thêm quiz/tóm tắt trước khi học" sau khi dán URL.
- [ ] Banner đổi tên khi oEmbed fail (title tạm).

**Frontend — trang học**
- [ ] Thêm link về editor trên trang learn (lỗ hổng điều hướng hiện tại — 0 link).
- [ ] Thẻ sidebar thường trực "+ Thêm quiz/tóm tắt cho bài này".
- [ ] Cue khi video kết thúc/lesson hoàn thành: gợi ý tạo quiz.

**Frontend — luật ẩn chương (§2, §5)**
- [ ] Áp dụng luật ẩn-chương-đơn nhất quán ở mọi bề mặt: editor (đã có?), sidebar learn page, **và `/share/{token}`** (đang lệch — luôn in tiêu đề chương).

**Frontend — từ ngữ (§4)**
- [ ] Đổi mọi chuỗi "Khóa học"/"khóa học" hiển thị → "Space", đồng nhất mọi màn hình đã liệt kê ở §4 (không đổi code/route).
- [ ] Thêm badge "N bài" trên card ở `/my-courses`, `/my-learning`.

## 7. Ngoài phạm vi (không làm trong effort này)

- **Tự động hóa import playlist YouTube** — mô hình dữ liệu đã chừa chỗ (§2), nhưng code import thật ngoài phạm vi.
- **Trải nghiệm học / hiển thị tiến độ khác nhau theo hình thái** — ngữ nghĩa "hoàn thành" đồng nhất mọi hình thái, không phân biệt.
- **Đổi tên route/URL** (ví dụ `/my-spaces`) — §4 chỉ đổi string hiển thị, không đổi route.
