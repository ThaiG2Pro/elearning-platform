# WP1.5 — Audit nợ core product (trước khi mở Checkpoint 2)

> Nguồn: nghiên cứu trực tiếp source code ngày 2026-08-07, ngay sau khi WP1.1–1.4
> hoàn thành. Mục tiêu: liệt kê cụ thể, có `file:line`, để WP1.5 sửa đúng chỗ
> thay vì làm lại từ đầu. Không đề xuất giải pháp chi tiết ở đây — chỉ mô tả
> hiện trạng thật, việc thiết kế giải pháp thuộc về lúc thực thi từng WP1.5.x.

## 0. Seed data lỗi thời (WP1.5.1)

File: `prisma/seed.ts` (seed file duy nhất trong repo).

- `seed.ts:11` — `TRUNCATE` liệt kê `"questions","learning_progress","enrollments","lessons","chapters","courses","tokens","users","roles"` — **thiếu `"sources"`**, nên seed lại nhiều lần vẫn tồn đọng rác `sources` cũ.
- `seed.ts:104-135` — tạo 3 `courses` với cả `owner_id` lẫn `lecturer_id` cùng trỏ về `jack`, `status: 'ACTIVE'` (chữ hoa) trong khi schema default là `"active"` (chữ thường, `schema.prisma:70`) — sai lệch casing giữa seed và default.
- Không có bất kỳ lệnh `prisma.sources.create` nào — bảng `sources` (nền tảng của WP1.1) chưa từng được seed, không lesson nào có `source_id`.
- Không course nào được set `share_token` — không có link share mẫu để thử WP1.4 ngay sau khi seed.
- Không có `enrollments` hay `learning_progress` nào được tạo dù cả hai đều nằm trong danh sách TRUNCATE — nghĩa là tác giả seed từng định seed nhưng bỏ dở.
- User `john@gmail.com` (STUDENT duy nhất, `seed.ts:48-97`) không được gắn vào course nào — đăng nhập xong không có gì để tương tác.

**Hệ quả cụ thể:** một dev mới clone repo, chạy seed, không thể tự tay thử WP1.1 (không có ví dụ course-from-link), WP1.3 (không có progress mẫu), WP1.4 (không có share_token mẫu) mà không tự tay gọi API trước.

## 1. Avatar dropdown menu không đồng bộ (WP1.5.2)

- `src/components/Header.tsx:58-160` — dropdown thật, dùng chung ở 12 trang (`page.tsx`, `login`, `register`, `join`, `forgot-password`, `reset-password`, `my-learning`, `lecturer/courses`, `courses/[id]`, `courses/[id]/learn` (ẩn khi focus mode), `share/[token]`, `admin/approval-queue`). Menu: Trang chủ → Khóa học đang học → Khóa học đã tạo → (divider) → Sửa hồ sơ → Đổi mật khẩu → (divider) → Đăng xuất (`Header.tsx:110-141`).
- `src/app/profile/page.tsx:82-97` và `src/app/change-password/page.tsx:63-78` — tự dựng thanh header riêng, gần như copy nguyên văn của nhau, nhưng avatar ở đây chỉ là `<div>` tĩnh hiển thị chữ cái đầu (`profile/page.tsx:92-94`, `change-password/page.tsx:73-75`) — **không `onClick`, không state dropdown, không menu item nào**.
- Hệ quả: đứng ở `/profile` hoặc `/change-password`, user không có cách nào bấm vào avatar để về Trang chủ/Khóa học/Đăng xuất — chỉ có logo (về `/`) hoặc nút Hủy (`router.back()`).
- `getInitial`/`avatarInitial` bị copy-paste lặp lại ở cả 2 file thay vì dùng lại logic giống hệt trong `Header.tsx:23`.

## 2. Video learning chưa hoàn thiện (WP1.5.3)

- Thư viện: `react-youtube@10.1.0` (`package.json:47`), bản mới nhất hiện có nhưng phát hành từ 2022-11-22, ~3.7 năm không cập nhật. Chưa deprecated, nhưng gần như không còn maintain.
- Tracking tiến độ: polling `setInterval` 1000ms gọi `getPlayerState()`/`getCurrentTime()` (`src/components/YoutubePlayer.tsx:18-49`), chỉ ghi khi `state === 1` (đang phát). Client throttle ghi API còn 5s/lần (`src/app/courses/[id]/learn/page.tsx:73-90`).
- **Thiếu, đã xác nhận bằng grep không ra kết quả** cho `autoAdvance|playbackRate|caption|chapter|pictureInPicture|keyboard`:
  - Không auto-advance sang bài tiếp theo khi video kết thúc (`onStateChange` không xử lý state `ENDED`, `YoutubePlayer.tsx:98-102`).
  - Không có điều khiển tốc độ phát, không phím tắt, không picture-in-picture, không phụ đề/transcript, không chapter marker.
  - Resume-vị-trí chỉ có ở nhánh YouTube (`YoutubePlayer.tsx:25-34`); nhánh `<video>` thường (non-YouTube) hoàn toàn không resume (`page.tsx:413-429`).
  - **2 ngưỡng "hoàn thành" khác nhau đang tồn tại song song**: 80% ở `ProgressPolicy.ts:2-5` (dùng cho tiến độ thật) vs >90% ở `LearnService.ts:98-104` (dùng cho preview) — không nhất quán, dễ gây hiểu nhầm khi so sánh 2 luồng.
  - Vimeo: `VideoThumbnailUtil.ts:33-38` đã có logic lấy thumbnail Vimeo, nhưng **không có adapter phát Vimeo** — URL Vimeo rơi vào thẻ `<video>` thô, không phát được (`page.tsx:412-429`).

## 3. Note quá sơ sài (WP1.5.4)

- Data model: **không phải bảng riêng** — note được "ăn ké" vào `learning_progress.personal_note` (`prisma/schema.prisma:125-135`), khoá theo `(user_id, lesson_id)` → **đúng 1 note/bài học**, không thể có nhiều note.
- Không có timestamp gắn với vị trí video (`Note.ts:1-21` chỉ có `content`), không markdown/rich text (chỉ `<textarea rows={4}>`, `page.tsx:583-611`), không xoá được (chỉ có save/read, không có `deleteNote` trong `NoteService.ts`/`NoteRepository.ts`), không có trang xem lại toàn bộ note của 1 course.
- `createdAt` bị giả lập bằng `new Date()` mỗi lần đọc (`NoteRepository.ts:24,41`) — không phải giá trị lưu thật trong DB.
- Giới hạn cứng 1000 ký tự (`NoteService.ts:17-19`), không hiện đếm ký tự trên UI.
- Comment trong `route.ts:5` nhắc tới route `/note` "duplicate" nhưng route đó không tồn tại trong repo — comment lỗi thời, nên dọn khi sửa.

## 4. Trang chủ thiếu (WP1.5.5)

- `src/app/page.tsx` chỉ có: Header, hero tĩnh + SearchBar (`86-107`), nút "Tạo khóa học" nếu đã login (`96-104`), danh sách course công khai lọc theo search (`109-146`).
- Không phân biệt rõ trải nghiệm đăng nhập vs chưa đăng nhập ngoài 1 nút CTA — danh sách course luôn là catalog công khai, không cá nhân hoá.
- Thiếu: "học tiếp"/resume bài gần nhất, "mới thêm gần đây", tổng quan tiến độ nhiều course, **ô dán link nổi bật ngay trang chủ** (trong khi dán-link là tính năng lõi WP1.1, hiện chỉ có trong modal ở `/lecturer/courses`), empty-state hướng dẫn cho user hoàn toàn mới.
- `page.tsx:116` còn nguyên placeholder chết: `{/* course count could go here */}`.

## 5. Trang quản lý cá nhân thiếu (WP1.5.6)

- `src/app/profile/page.tsx`: chỉ sửa được họ tên + tuổi (`117-142`), email chỉ đọc (`108-115`), avatar chỉ là chữ cái đầu, không upload ảnh thật (`16-18, 92-94`).
- Không có: xoá tài khoản, export dữ liệu, cài đặt theme, cài đặt thông báo, xem thống kê học tập của chính mình.
- Đổi mật khẩu tách hẳn ra trang riêng `/change-password`, chỉ vào được qua dropdown Header — mà dropdown lại không có mặt ở chính trang profile (xem mục 1) → vòng lặp UX bị đứt.

## 6. UX chuyển trang/lesson/tab kém (WP1.5.7)

- Không có file `loading.tsx` nào trong toàn bộ `src/app` (kiểm tra `find` không ra kết quả) — không dùng cơ chế Suspense/loading route-level của Next.js.
- **Lỗi cụ thể nghiêm trọng nhất**: `src/app/courses/[id]/learn/page.tsx:203-215,333-339` — mỗi lần đổi bài học, `appState` chuyển `'loading'` và component `return` sớm ra spinner giữa màn hình trống, **unmount toàn bộ Header/sidebar/progress bar** rồi mount lại từ đầu khi có dữ liệu mới → cảm giác full-page reload giả dù là SPA.
- Ngược lại, `src/app/courses/[id]/page.tsx:90-97` và `src/app/my-learning/page.tsx:138-147` làm đúng: skeleton `animate-pulse` render **bên trong** layout hiện tại, khung sườn không mất — tức là pattern đúng đã có sẵn trong chính codebase, chỉ cần áp dụng lại cho trang học (và `lecturer/courses/[id]/view|edit/page.tsx` cũng mắc lỗi tương tự).
- `src/components/ui/skeleton.tsx` tồn tại nhưng **0 nơi dùng** (grep import ra 0 kết quả) — mỗi trang tự viết skeleton riêng, hơi khác nhau.
- Spinner cũng không đồng nhất: đa số dùng kiểu `border-2 border-t-transparent animate-spin`, riêng `lecturer/courses/[id]/view/page.tsx:89` dùng `border-b-2` (khác kỹ thuật, khác hiệu ứng xoay), size cũng lệch (`h-8/h-10/h-12/w-4`) không theo scale nào.
- `src/components/ui/tabs.tsx` (Radix-based) tồn tại nhưng không dùng ở đâu — tab filter duy nhất trong app (`my-learning/page.tsx:102-125`) tự viết bằng `<button>` tay, không có transition nội dung khi đổi tab.
- Toast: điểm sáng hiếm hoi — `src/components/Toast.tsx` được dùng nhất quán ở 7+ trang. Nhưng lỗi tải dữ liệu (load) và lỗi hành động (action) lại xử lý 2 kiểu khác nhau tuỳ trang (card đỏ inline vs Toast) — không theo quy tắc rõ ràng nào.

## 7. UI còn generic, chưa có design system thực thi (WP1.5.8)

- `tailwind.config.js` có token semantic kiểu shadcn (`primary/secondary/muted/...`, `21-56`) ánh xạ qua CSS variable (`globals.css:24-56`), nhưng **các trang không dùng token này** — hardcode trực tiếp `bg-blue-600`/`bg-indigo-600`/`bg-emerald-600` theo từng file.
- `globals.css:44-46` định nghĩa biến `--student`/`--lecturer`/`--admin` cho portal accent nhưng **không map vào `tailwind.config.js`** → biến chết, không có class `bg-student` nào tồn tại để dùng.
- Bộ component `src/components/ui/{button,card,dialog,input,alert,badge,skeleton,tabs,textarea}.tsx` đã cài (shadcn) nhưng **grep import ra 0 kết quả ở toàn bộ `src/app`** — mọi nút/modal/input đều viết tay bằng class Tailwind rời rạc.
- Bằng chứng cụ thể về trôi dạt: cùng file `lecturer/courses/[id]/edit/page.tsx` có nút primary màu `indigo-600` ở dòng 340 và nút primary màu `blue-600` ở dòng 379 — không có lý do nghiệp vụ, chỉ là thiếu chuẩn.
- Padding nút cũng trôi dạt không theo scale: `px-3 py-1.5`, `px-2 py-1`, `px-5 py-2.5`, `px-6 py-3` xuất hiện rải rác cho các nút cùng cấp độ quan trọng.
- Modal tự viết tay ở từng nơi dùng (`lecturer/courses/page.tsx:251`) dù `ui/dialog.tsx` đã có sẵn.
- Điểm đã làm đúng: font Inter được cấu hình và áp dụng nhất quán toàn app qua `font-sans` (`layout.tsx:9,12,24,26`); không có hex màu hardcode rải rác (chỉ 1 hit là comment, `globals.css:34`) — nghĩa là ở tầng token thì sạch, vấn đề là các trang **bỏ qua token** để viết Tailwind utility trực tiếp.

## 8. Việc phát sinh trong lúc sửa (WP1.5.9)

Chưa có mục cụ thể — mở khi lộ ra trong lúc thực thi WP1.5.1–1.5.8.

---

## Phụ lục — Kiểm kê toàn bộ 17 màn hình (rà soát bổ sung, 2026-08-07)

> Đợt audit đầu chỉ quét 9 mảng user liệt kê trực tiếp. Đợt này quét **tất
> cả** `page.tsx` dưới `src/app` (17 file) để trả lời 3 câu hỏi: còn thiếu
> màn hình nào, màn hình nào là rác/legacy cần xoá, màn hình nào có lỗi
> logic/UI cụ thể. Dùng 4 agent song song đọc toàn bộ file, không chỉ grep.

### Bảng trạng thái 17 màn hình

| Màn hình | Trạng thái | Ghi chú ngắn |
|---|---|---|
| `/` (home) | OK, còn thiếu tính năng | Xem WP1.5.5, WP1.5.12 |
| `/join` | OK | Cổng identify chung, không có vấn đề pivot |
| `/login` | OK, có bug redirect | Redirect theo `redirectUrl` có thể trỏ route không tồn tại (`/student/dashboard`) |
| `/register` | OK, còn field thừa | `age` bắt buộc — tàn dư model cũ, không cần cho personal-organizer |
| `/forgot-password` | OK | Có 1 dead code nhỏ (rate-limit message không bao giờ trigger được) |
| `/reset-password` | OK, có bug phân loại lỗi | Lỗi "mật khẩu quá ngắn" hiện sai thông báo (xem mục 9) |
| `/activate` | OK, có bug timer | `setTimeout` redirect không bị clear khi unmount |
| `/change-password` | **Legacy UI** | Header tự dựng, avatar không bấm được (đã có ở WP1.5.2) |
| `/profile` | Thiếu tính năng + bug | Xem WP1.5.6, WP1.5.12 |
| `/my-learning` | OK, còn thiếu | Không phân trang, không tái dùng `CourseCard` |
| `/courses/[id]` | Có bug logic | `courseId NaN` treo trắng vĩnh viễn; không hiện nội dung chương/bài |
| `/courses/[id]/learn` | Nhiều bug + thiếu tính năng | Trọng tâm WP1.5.3/1.5.4/1.5.7 |
| `/lecturer/courses` | **Xung đột với pivot** | Nút chính bị 401 cho mọi user STUDENT-role (xem WP1.5.10) |
| `/my-courses/[id]/edit` (đổi tên từ `/lecturer/courses/[id]/edit`) | **Đã refactor — 2026-08-11** | State `'readOnly'` đã bỏ (WP1.5.10); xoá/sắp xếp bài học+chương, lưu tức thời, xem trước quiz, validate URL đã có (xem mục 11) |
| `/lecturer/courses/[id]/view` | **Mồ côi (orphan)** | Không route nào link tới — chỉ vào được bằng gõ URL |
| `/admin/approval-queue` | **Legacy, đã tự-deprecate đúng cách** | Đã là stub "đã bãi bỏ", không cần xoá gấp nhưng nên dọn khỏi namespace `/admin` |
| `/share/[token]` | Có bug race condition | Double-clone khi bấm nhanh/effect double-fire |

**Màn hình còn thiếu hoàn toàn**: trang xoá tài khoản/export dữ liệu.
(`not-found.tsx`/`error.tsx`/`loading.tsx`/`global-error.tsx` và trang
quản lý/thu hồi share link `/my-shares` đã đóng — xem mục 11.)

### 9. Lỗi logic/UI cụ thể theo từng màn hình (WP1.5.12)

Chọn lọc các lỗi có ảnh hưởng người dùng rõ nhất trong số hàng chục lỗi được
2 agent audit tìm ra (danh sách đầy đủ hơn nằm trong báo cáo gốc của agent,
lưu ở lịch sử phiên làm việc):

- **`courses/[id]/page.tsx:17,39`** — `parseInt(params.id)` không có guard
  `isNaN`. URL course-id sai dạng → `courseId` là `NaN` → điều kiện
  `if (courseId)` (falsy với `NaN`) khiến trang không fetch, không lỗi,
  không loading — treo trắng vĩnh viễn.
- **`courses/[id]/page.tsx`** — `CourseDetail.chapters` được fetch nhưng
  **không render ở đâu cả**; `isEnrolled` được fetch nhưng không ảnh hưởng
  nút CTA nào — nghĩa là user xem trước một course hoàn toàn không thấy nội
  dung chương/bài trước khi bấm "Bắt đầu học".
- **`share/[token]/page.tsx:68-73`** — `useEffect` tự động clone khi vừa
  đăng nhập xong thiếu `copying` trong dependency array và không có guard
  chống double-fire; `cloneForOwner` (`CourseRepository.ts:328-372`) phía
  server không có kiểm tra idempotency — bấm 2 lần liền hoặc effect chạy 2
  lần (React StrictMode, back/forward nhanh) ra **2 khóa học giống hệt
  nhau** trong tài khoản.
- **`courses/[id]/learn/page.tsx`** — thanh tiến độ % ở sub-header tính từ
  `lessons[].isCompleted`, mảng này chỉ load 1 lần lúc vào trang và
  **không được cập nhật lại** sau khi hoàn thành bài ngay trong phiên đang
  học — số % hiển thị sai (cũ) cho tới khi tải lại trang.
- **`courses/[id]/learn/page.tsx:73-90`** — ghi nhận tiến độ cập nhật
  `lastSentTimeRef` **trước khi** API xác nhận thành công; nếu API lỗi,
  window 5 giây đó bị mất vĩnh viễn, không retry, không rollback (dòng
  rollback bị comment sẵn nhưng chưa bật).
- **`profile/page.tsx:17` vs `20-35`** — avatar header đọc user từ
  `localStorage` (đồng bộ), còn form đọc từ `getProfile()` API (bất đồng
  bộ) — 2 nguồn có thể lệch nhau nếu tên đã đổi ở nơi khác.
- **`profile/page.tsx:65-73`** — phân loại lỗi bằng cách so khớp chuỗi con
  tiếng Việt trong `error.message`; lỗi hệ thống thật (network timeout...)
  rơi vào nhánh không hiển thị `errorMessage` nào cả — user lưu thất bại mà
  không thấy thông báo gì.
- **`reset-password/page.tsx:43`** — cùng kiểu phân loại lỗi bằng substring
  matching; lỗi "mật khẩu quá ngắn" không chứa các từ khoá được match nên
  rơi vào thông báo chung chung "Có lỗi xảy ra", sai với lỗi thật.
- **`page.tsx` (trang chủ):17,139** — nút "Thử lại" chỉ set lại
  `debouncedSearchQuery` bằng giá trị hiện tại; nếu giá trị không đổi (case
  phổ biến), effect fetch không chạy lại → nút bấm không có tác dụng gì.
- **`page.tsx:96`** — nút "Tạo khóa học" chỉ hiện `hidden md:inline-flex`,
  không có lối tương đương trên mobile.
- **`activate/page.tsx:28-30`** — `setTimeout` redirect 3s sau kích hoạt
  thành công không được `clearTimeout` khi unmount — điều hướng `/join` có
  thể bắn ra sau khi user đã tự chuyển trang khác.
- **`change-password/route.ts:42` vs `AuthService.ts:232`** — thông báo lỗi
  backend nói tối thiểu 8 ký tự, nhưng service thực tế chỉ check < 6 — thông
  báo lỗi của chính API sai lệch với logic thật của nó.

### 10. Màn hình/role legacy còn sót từ mô hình marketplace cũ (WP1.5.10)

- **Xung đột nghiêm trọng nhất**: `GET/POST /api/v1/management/courses`
  (`management/courses/route.ts:8-11,42-45`) chặn cứng
  `user.role !== 'LECTURER'` → 401, nhưng `UserFactory.createInactiveUser`
  (`src/modules/auth/domain/UserFactory.ts:16-21`) gán role `STUDENT` cho
  **mọi** user mới đăng ký. Header (`Header.tsx:48`) và trang chủ
  (`page.tsx:98`) đều dẫn thẳng mọi user tới `/lecturer/courses`, trang này
  gọi đúng API bị chặn đó → **nút "Khóa học đã tạo" bị 401 cho gần như mọi
  user thật**, dù màn hình tạo-course-từ-link (endpoint khác,
  `from-link/route.ts`, không role-check) vẫn hoạt động bình thường — tức
  là user có thể tạo course nhưng không xem lại được danh sách course của
  mình qua đúng lối đi chính.
- **2 màn hình mồ côi** (không route nào trong app link tới, chỉ vào được
  bằng gõ URL tay — xác nhận bằng grep 0 kết quả):
  `/admin/approval-queue` (đã tự-deprecate thành stub, không hại nhưng nên
  dọn khỏi namespace) và `/lecturer/courses/[id]/view` (trang preview đầy
  đủ chức năng — player, share button — nhưng không có lối vào từ UI).
- **Redirect chết**: `LoginNavigationPolicy.ts:10-19` vẫn switch theo
  `roleName` → `/student/dashboard` (không tồn tại trong `src/app`) và
  `/admin/pending` (route thật là `/admin/approval-queue`, tên khác). Hiện
  tại vô hại vì `login`/`join` luôn truyền `continueUrl` khác rỗng nên nhánh
  này hiếm khi được dùng thật, nhưng vẫn là code chết nguy hiểm nếu có luồng
  nào bỏ qua `continueUrl` trong tương lai.
- **Type/copy lỗi thời**: `CourseStructure.status: 'Draft'|'Pending'|'Active'`
  (`src/types/lecturer.types.ts:38`) và copy "chờ duyệt"/"đang chờ duyệt
  hoặc đã được duyệt" trong `edit/page.tsx` (state `'readOnly'`, không route
  nào còn set state này) — toàn bộ vốn từ "duyệt" của mô hình marketplace cũ
  không còn ứng dụng nào tạo ra nhưng vẫn nằm trong code, dễ gây hiểu nhầm
  cho người đọc code sau này.
- Ngược lại, phần lớn endpoint khác (section/lesson CRUD, content sync,
  share-link, progress-tracking) đã pivot đúng sang kiểm tra ownership
  (`course.owner_id === userId`), không còn role-check — nghĩa là việc dọn
  chỉ cần đồng bộ 2 endpoint còn sót (`management/courses` GET/POST,
  `lessons/[id]/quiz/upload`) theo đúng pattern ownership đã đúng ở chỗ khác.

### 11. Màn hình còn thiếu hoàn toàn (WP1.5.11)

- ~~Không có `not-found.tsx`, `error.tsx`, hay `loading.tsx` nào trong toàn
  bộ `src/app` (`find` xác nhận 0 kết quả) — 404/lỗi runtime rơi về trang
  mặc định không thương hiệu của Next.js.~~ **[ĐÃ ĐÓNG]** Cả ba đã có ở
  `src/app/{not-found,error,loading}.tsx` (thêm 2026-08-07). Còn thiếu
  riêng `global-error.tsx` — boundary Next.js dành cho lỗi xảy ra ngay
  trong root `layout.tsx`, mà `error.tsx` (render bên trong layout đó) về
  bản chất không thể bắt được — đã bổ sung 2026-08-11.
- ~~Không có màn hình "quản lý share link của tôi": chỉ có 1 nút "Chia sẻ" duy
  nhất trong toàn app (`lecturer/courses/[id]/view/page.tsx:63`, chính là
  trang mồ côi ở mục 10) tạo/lấy lại token qua `getOrCreateShareLink`
  (`src/lib/lecturer.ts:320-330`). Không có API `DELETE`/revoke ở bất kỳ
  tầng nào (route, service, hay repository) — **một khi đã share, chủ course
  không có cách nào thu hồi link đó**.~~ **[ĐÃ ĐÓNG — 2026-08-07]**
  `src/app/my-shares/page.tsx` liệt kê mọi course sở hữu kèm trạng thái
  share, tạo link tại chỗ, và thu hồi qua `DELETE
  /management/courses/[id]/share` (`ContentManagementService.revokeShareLink`
  → `courseRepository.clearShareToken`, owner-only qua
  `AccessControlPolicy.validateOwnership`) — URL cũ 404 ngay lập tức vì
  token đã bị xoá khỏi DB, không phải soft-revoke. Có lối vào từ dropdown
  Header ("Link chia sẻ của tôi"). Xác nhận lại bằng round-trip trên dữ
  liệu thật 2026-08-11 (tạo → xác nhận trang share công khai 200 → thu hồi
  → xác nhận URL cũ 404 → danh sách quay về đúng trạng thái ban đầu).
- Không có màn hình xoá tài khoản/export dữ liệu (grep toàn repo cho
  "xoá/xóa tài khoản", "delete account", "export data" → 0 kết quả).
- ~~Không có UI xoá/sắp xếp lại bài học sau khi tạo: `deleteLesson` và
  `updateLesson` đã có API hoạt động đầy đủ
  (`api/v1/management/lessons/[id]/route.ts:27,52`) nhưng
  `lecturer/courses/[id]/edit/page.tsx` **không import và không gọi** tới cả
  hai — cách "xoá" bài học duy nhất hiện tại là xoá trắng tiêu đề khiến nó bị
  filter ra khỏi lần lưu tiếp theo (`edit/page.tsx:87`,
  `.filter(l => l.title && l.id)`) — hành vi ẩn, không phải tính năng chủ
  đích. Không có kéo-thả hay nút lên/xuống để sắp xếp lại thứ tự — chỉ có ô
  nhập số `orderIndex` thủ công.~~

  **[ĐÃ ĐÓNG — 2026-08-11]** Trang đã đổi tên/đường dẫn thành
  `src/app/my-courses/[id]/edit/page.tsx` và được refactor theo kế hoạch
  3 bước (`Dialog` xác nhận xoá, nút ↑/↓ sắp xếp cho cả bài học lẫn
  chương, `deleteLesson`/`updateLesson`/`deleteSection`/`updateSection`
  gọi trực tiếp và lưu ngay lập tức thay vì mô hình "lưu tất cả" cũ). Cùng
  đợt refactor này cũng dọn thêm phần lớn nợ liệt kê ở mục 7 (WP1.5.8) cho
  riêng màn hình này: dùng lại `Toast`/`Dialog`/`Button` có sẵn thay vì
  `confirm()`/class Tailwind rời rạc, thêm xem trước quiz đã upload trước
  khi ghi đè, validate URL YouTube inline, breadcrumb chương › bài học, và
  guard chống double-submit cho các nút xoá/tạo nhanh. Xem chi tiết từng
  bước tại lịch sử commit `feat(course-edit)`/`refactor(course-edit)`
  trên `main` quanh mốc 2026-08-11.
