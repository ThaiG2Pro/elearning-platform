# Roadmap — Checkpoint & Milestone

> **Tài liệu liên quan** (không lặp lại nội dung nhau):
> 1. `docs/VISION.md` — nguồn sự thật về hướng đi sản phẩm; roadmap này hiện
>    thực hoá Vision mục 4 (lộ trình người dùng) và mục 10 (lộ trình giai đoạn)
>    thành các checkpoint quản lý được.
> 2. `ARCHITECTURE_NOTES.md` — nợ kỹ thuật & gap giữa code hiện tại và Vision.
> 3. `docs/design/ai-personalization-economics.md` — thiết kế chi tiết lớp AI,
>    được hiện thực hoá dần ở Checkpoint 2–3 dưới đây.
> 4. `docs/design/checkpoint-0-1-ux-audit.md` — audit code thật đối chiếu
>    Checkpoint 0/1, chi tiết hoá gap UI/UX ở 2 checkpoint đó.
> 5. `docs/design/ai-integration-plan.md` — kế hoạch kỹ thuật "làm thế nào" cho
>    lớp AI ở Checkpoint 2 (thư viện, kiến trúc module, rủi ro cụ thể).
>
> Đây là roadmap ở mức **work package (WP) level 2** — đủ để quản lý sản phẩm
> theo từng giai đoạn, **không chứa thời gian/deadline cụ thể**. Chuyển
> checkpoint theo **tín hiệu thật**, đúng tinh thần Vision mục 10, không theo lịch.

## Nguyên tắc xuyên suốt — không mất user một cách tự nhiên khi upgrade

Đây là câu trả lời cho yêu cầu cốt lõi: vừa ra demo sớm, vừa upgrade dần mà
không mất user. 4 quy tắc áp dụng cho **mọi** checkpoint từ Checkpoint 1 trở đi
(sau khi đã có người dùng ngoài):

1. **Breaking change chỉ được phép ở Checkpoint 0** — lúc chưa có user ngoài
   (Vision giai đoạn 0, chỉ founder dùng). Đây là cơ hội duy nhất để đổi data
   model/role model mạnh tay mà không ai bị ảnh hưởng. Từ Checkpoint 1 trở đi,
   mọi thay đổi schema phải **additive** (thêm cột/bảng nullable), không xoá
   hoặc đổi ý nghĩa field cũ mà course/tiến độ của user đang tham chiếu.
2. **Feature mới luôn optional, không chặn luồng cũ** — đúng nguyên tắc đã có
   sẵn ở `ai-personalization-economics.md` mục 8 (`aiGenerationId` luôn có thể
   `null`): AI, BYOK, thu phí đều là lớp cộng thêm, tắt được, không bao giờ là
   điều kiện bắt buộc để tiếp tục dùng phần đã có.
3. **Share link/URL đã phát ra không được vô hiệu khi nâng cấp** — vì lan
   truyền tự nhiên qua share link là kênh tăng trưởng chính (Vision mục 9),
   link cũ đổi/gãy sau 1 lần upgrade sẽ trực tiếp giết kênh tăng trưởng đó.
4. **Đổi giới hạn free phải báo trước, không âm thầm siết** — nếu sau này
   giảm quota AI free hoặc bật giới hạn mới, luôn thông báo rõ cho user đang
   dùng, không để họ phát hiện bằng cách... bị chặn giữa chừng.

---

## Checkpoint 0 — Nền móng kỹthuật & Pivot data model

**Mô tả sản phẩm:** Chưa có gì để demo cho user ngoài. Đây là bước dọn nền bắt
buộc trước khi build tiếp, tận dụng việc **chưa ai ngoài dùng** để đổi mạnh tay
mà không phá vỡ trải nghiệm của ai (nguyên tắc #1 ở trên).

**Vấn đề cần giải quyết** (theo `ARCHITECTURE_NOTES.md`): code hiện tại là mô
hình marketplace giảng viên cũ (LECTURER tạo course, ADMIN duyệt qua
approval-queue, STUDENT enroll) — không khớp Vision (course cá nhân từ link tự
chọn, không cần ai duyệt).

**Chi tiết audit code thật:** `docs/design/checkpoint-0-1-ux-audit.md`.

**WP:**
- **WP0.1 — Tập trung hoá auth/request-context.** Thay ~20+ route tự
  decode JWT + check role rời rạc bằng 1 điểm chung (`middleware.ts` hoặc
  `getRequestContext()`). Ưu tiên cao nhất vì mọi checkpoint sau (quota AI,
  feature flag, BYOK...) đều cần điểm neo này — làm sau sẽ phải sửa lại từng
  route một lần nữa.
- **WP0.2 — Pivot data model sang course cá nhân.** Thêm `Source` (dedup theo
  URL chuẩn hoá), đổi `Course` sang sở hữu cá nhân (`ownerId`, không cần
  duyệt). Gỡ approval-queue/enrollment-giữa-user khỏi luồng chính.
- **WP0.3 — Quyết định số phận dữ liệu cũ.** Vì đang ở giai đoạn cá nhân
  (Vision phase 0), dữ liệu marketplace cũ (courses/enrollments demo) nhiều
  khả năng không cần giữ — quyết định rõ: seed lại từ đầu hay migrate, tránh
  vừa giữ vừa pivot dở dang.

**Điều kiện qua checkpoint tiếp theo:** schema mới + auth-context tập trung
chạy ổn định cho chính founder dùng (Vision giai đoạn 0 tiếp tục tự kiểm chứng
trên nền mới).

---

## Checkpoint 1 — Demo lõi cho nhóm nhỏ (Vision giai đoạn 1)

**Mô tả sản phẩm:** Người dùng tự dán link (YouTube/blog) → nền tảng tạo
thành 1 course cá nhân có cấu trúc chương/bài → học trong giao diện tập trung,
không xao nhãng → theo dõi tiến độ. Có thể **share link course cho bạn bè
dùng ngay**. Chưa có AI, chưa thu phí. **Đây là bản demo sớm nhất đưa được
cho người ngoài.**

**Chi tiết audit code thật:** `docs/design/checkpoint-0-1-ux-audit.md`.

**WP:**
- **WP1.1 — CRUD course/course-item cá nhân từ link.** Nhập link → parse
  metadata cơ bản (tiêu đề, thumbnail, thời lượng nếu là video) → sắp xếp
  thành chương/bài.
- **WP1.2 — Trình học tập trung (focus mode).** Phát video/hiển thị bài viết
  trong khung nhìn tách khỏi môi trường gốc — không đề xuất/autoplay lạc đề.
- **WP1.3 — Theo dõi tiến độ.** Đánh dấu đã học/chưa học từng bài, % hoàn
  thành course.
- **WP1.4 — Share/invite course.** Tạo link chia sẻ course cho người khác
  dùng thử ngay, không cần thao tác phức tạp. **Bắt buộc có ở checkpoint này,
  không để sau** — đây chính là kênh đo tín hiệu retention/lan truyền thật
  theo Vision mục 9, và theo nguyên tắc #3 ở trên link này phải ổn định lâu dài.
- **WP1.5 — Dọn nợ core product trước khi mở Checkpoint 2.** WP1.1–1.4 chứng
  minh luồng đi được, nhưng audit code thật (sau khi WP1 xong) cho thấy phần
  lõi (video, note, home, profile, UX, UI) còn quá sơ sài để mời người ngoài
  vào dùng thật và đo retention có ý nghĩa — thêm AI (Checkpoint 2) lên nền
  này chỉ khuếch đại nợ, không sửa được nó. Đợt rà soát thứ hai quét **toàn bộ
  17 màn hình** của app (không chỉ 9 mảng ban đầu) để tìm thêm: màn hình
  legacy/mồ côi cần xoá, màn hình còn thiếu, và lỗi logic/UI cụ thể theo từng
  màn — gộp thẳng vào WP1.5.10–1.5.12 bên dưới. Chi tiết từng hạng mục, có
  file:line dẫn chứng: `docs/design/wp1.5-core-product-debt-audit.md`.
  - **WP1.5.1 — Seed data đồng bộ với model hiện tại.** `prisma/seed.ts` hiện
    không tạo `sources`, không set `share_token`, không có
    `learning_progress`, và `TRUNCATE` bỏ sót bảng `sources` — dev mới clone
    repo không seed ra được dữ liệu để tự tay thử WP1.1/1.3/1.4. User cuối
    không thấy ảnh hưởng trực tiếp, nhưng đây là rủi ro chặn tốc độ sửa các
    mục còn lại trong WP1.5.
  - **WP1.5.2 — Hợp nhất avatar dropdown menu.** `Header.tsx` là dropdown thật
    dùng chung ở 12 trang, nhưng `profile/page.tsx` và `change-password/page.tsx`
    tự dựng thanh header riêng với avatar **không bấm được** — đứng ở 2 trang
    này, user mất hoàn toàn lối vào "Trang chủ/Khóa học của tôi/Đăng xuất".
  - **WP1.5.3 — Video player: vá lỗ hổng chức năng, không đổi thư viện ngay.**
    `react-youtube` (3+ năm không cập nhật) vẫn dùng được, nhưng thiếu tối
    thiểu: auto-advance sang bài kế khi hết video, resume-vị-trí cho nhánh
    `<video>` thường (chỉ YouTube có), thống nhất lại ngưỡng "hoàn thành"
    (đang lệch 80% vs 90% giữa 2 code path), và xử lý URL Vimeo (đã có
    thumbnail nhưng phát không được, rơi vào thẻ `<video>` không chạy).
  - **WP1.5.4 — Note: từ "1 ô text" thành tính năng ghi chú thật.** Hiện mỗi
    bài học chỉ có đúng 1 note dạng text thô (ràng buộc unique
    `(user_id, lesson_id)`), không gắn mốc thời gian video, không có nhiều
    note/bài, không xoá được. Tối thiểu cho Checkpoint 1 thật sự dùng được:
    cho nhiều note/bài + gắn timestamp (bấm note → tua video tới đó).
  - **WP1.5.5 — Trang chủ: thêm lối vào và ngữ cảnh cho user quay lại.**
    `/` hiện chỉ là catalog công khai tĩnh, không có "học tiếp", không có ô
    dán link nổi bật (trong khi dán-link là tính năng lõi của WP1.1), không
    có empty-state cho user mới — ai đăng nhập xong quay lại `/` không thấy
    gì khác biệt so với chưa đăng nhập.
  - **WP1.5.6 — Trang cá nhân: bổ sung các thao tác cơ bản còn thiếu.** Hiện
    chỉ sửa được tên/tuổi; chưa có đổi avatar thật (chỉ chữ cái đầu), chưa có
    xoá tài khoản, và đổi mật khẩu nằm tách rời hoàn toàn khỏi trang hồ sơ
    (chỉ vào được qua dropdown — mà dropdown lại không có ở WP1.5.2).
  - **WP1.5.7 — UX chuyển trang/lesson: bỏ full-page reload giả.** Trang học
    (`learn/page.tsx`) khi đổi bài unmount toàn bộ layout (header, sidebar,
    progress) và chỉ còn spinner giữa màn hình trống — trong khi
    `courses/[id]/page.tsx` và `my-learning` đã làm đúng (skeleton trong
    layout, không mất khung sườn). Áp dụng lại đúng pattern đã có sẵn trong
    chính codebase, không cần công nghệ mới.
  - **WP1.5.8 — Chuẩn hoá UI: dùng lại component đã có sẵn nhưng bị bỏ quên.**
    `src/components/ui/{button,card,dialog,tabs,skeleton,...}` đã được cài
    (shadcn) nhưng **0 nơi nào import** — mỗi trang tự viết lại nút/modal/tab
    bằng class Tailwind rời rạc (cùng 1 màn `edit/page.tsx` có cả nút
    `bg-blue-600` lẫn `bg-indigo-600` cho hành động tương đương). Việc cần làm
    là bắt đầu thay dần bằng bộ component có sẵn, không phải thiết kế mới từ
    đầu.
  - **WP1.5.9 — Theo dõi phát sinh khi làm các mục trên.** Audit chỉ quét các
    mảng user chỉ ra trong goal; nếu trong lúc sửa WP1.5.1–1.5.8 lộ thêm vấn
    đề tương tự (route khác dùng chung pattern lỗi), gộp thẳng vào đây thay vì
    mở lại audit — tránh WP1.5 kéo dài vô hạn.
  - **WP1.5.10 — Gỡ sạch màn hình/role legacy còn sót từ mô hình marketplace
    cũ.** Rà soát toàn bộ 17 màn hình (`docs/design/wp1.5-core-product-debt-audit.md`
    phụ lục kiểm kê) cho thấy pivot Checkpoint 0 mới xong ~90% ở tầng dữ liệu,
    còn để lọt: (a) `GET/POST /management/courses` vẫn chặn cứng
    `role !== 'LECTURER'` trong khi mọi user mới đăng ký đều mặc định
    `STUDENT` — nghĩa là nút "Khóa học đã tạo" ở Header/Trang chủ dẫn thẳng
    tới màn hình 401 cho gần như mọi user thật; (b) `/admin/approval-queue`
    (trang deprecation-stub) và `/lecturer/courses/[id]/view` (trang preview
    không còn được link từ đâu cả) là 2 màn hình mồ côi, không ai tới được
    trừ gõ URL tay; (c) `LoginNavigationPolicy` vẫn redirect theo role tới
    `/student/dashboard` và `/admin/pending` — cả hai route đều không tồn
    tại; (d) type `CourseStructure.status: 'Draft'|'Pending'|'Active'` và
    copy "chờ duyệt" còn sót trong `edit/page.tsx` dù không route nào còn
    tạo ra state đó. Việc cần làm: thống nhất toàn bộ theo ownership-based
    (đã đúng ở hầu hết endpoint khác), xoá routes/state không dùng, sửa nút
    "Khóa học đã tạo" hoạt động cho mọi user.
  - **WP1.5.11 — Bổ sung màn hình còn thiếu.**
    ~~Không có `not-found.tsx`, `error.tsx`, hay bất kỳ `loading.tsx` nào
    trong toàn bộ `src/app` — 404 và lỗi runtime rơi về trang mặc định
    không thương hiệu của Next.js.~~ **[Đã đóng — `not-found.tsx`/`error.tsx`/
    `loading.tsx` thêm 2026-08-07; `global-error.tsx` (bắt lỗi ngay trong
    root layout — boundary riêng mà `error.tsx` không phủ tới) bổ sung
    2026-08-11 để đóng nốt phần còn thiếu]**.
    ~~Không có màn hình "quản lý share link của tôi" (xem lại/thu hồi link đã
    tạo) dù `WP1.4` đã có API tạo link — hiện chỉ tạo được, không xem lại
    được trừ vào đúng trang `view` (đã mồ côi, xem WP1.5.10) và **không có
    cách thu hồi link** ở bất kỳ tầng nào.~~ **[Đã đóng — cùng đợt 2026-08-07
    với mục trên]** `/my-shares` (`src/app/my-shares/page.tsx`) liệt kê toàn
    bộ course sở hữu kèm trạng thái share hiện tại, tạo link
    (`getOrCreateShareLink`) và thu hồi (`revokeShareLink` →
    `DELETE /management/courses/[id]/share`, xoá token nên URL cũ 404 ngay
    lập tức), có lối vào từ dropdown Header ("Link chia sẻ của tôi"). Xác
    nhận lại bằng round-trip trực tiếp trên dữ liệu thật 2026-08-11: tạo
    link cho 1 course, xác nhận trang share công khai trả 200, thu hồi, xác
    nhận URL cũ trả 404 và danh sách quay về đúng trạng thái ban đầu.

    ~~Không có màn hình xoá tài khoản/
    export dữ liệu (thuộc phạm vi rộng hơn WP1.5.6) — mục còn mở duy nhất
    của WP1.5.11.~~ **[Đã đóng — 2026-08-11]** Xoá tài khoản hoá ra đã có
    sẵn từ WP1.5.6 (`f5734f5`): `DELETE /auth/account`, soft-delete qua
    `UserEntity.markDeleted()` (status → `DELETED`, giữ nguyên row vì
    `courses.owner_id` là RESTRICT FK), yêu cầu xác nhận mật khẩu, có UI ở
    `/profile`. Phần thực sự còn thiếu là export dữ liệu — đã thêm mới:
    `GET /auth/export-data` (`AuthService.exportUserData`,
    `DataExportRepository`) trả về JSON tải xuống gồm hồ sơ, toàn bộ course
    sở hữu (cây chương → bài học → câu hỏi), tiến độ học, ghi chú; nút "Tải
    xuống dữ liệu (JSON)" trên `/profile` cạnh khối xoá tài khoản. Xác nhận
    trực tiếp trên dữ liệu thật của jack@gmail.com: gọi API trả 200 kèm
    `Content-Disposition: attachment`, JSON chứa đúng 6 course sở hữu với
    cây chương/bài học lồng nhau, request không kèm token trả 401. ~~Không
    có UI xoá/sắp xếp lại bài học sau khi tạo course (`deleteLesson`/
    `updateLesson` đã có API nhưng không nơi nào trong `edit/page.tsx` gọi
    tới).~~ **[Đã đóng — 2026-08-11]** Refactor
    `src/app/my-courses/[id]/edit/page.tsx` (3 bước, chi tiết ở
    `docs/design/wp1.5-core-product-debt-audit.md#11`) đã thêm: xoá/sắp xếp
    bài học và chương (nút ↑/↓, xác nhận qua `Dialog` thay `confirm()`), lưu
    tức thời theo từng hành động (bỏ mô hình "lưu tất cả" cũ, đồng bộ 2 mô
    hình lưu về một), xem trước nội dung quiz đã tải lên trước khi ghi đè,
    validate URL YouTube inline, và breadcrumb chương › bài học. WP1.5.11
    nay đã đóng toàn bộ.
  - **WP1.5.12 — Vá các lỗi logic cụ thể phát hiện qua rà soát toàn màn
    hình.** Danh sách đầy đủ có file:line ở phụ lục audit; các lỗi ảnh hưởng
    trực tiếp tới user, ưu tiên cao nhất. **[Đã đóng toàn bộ — audit lại
    2026-08-12, vá nốt mục avatar/API còn mở]**
    - `courses/[id]/page.tsx` — `courseId = parseInt(...)` không kiểm tra
      `NaN`, URL course-id sai dạng làm trang treo trắng vĩnh viễn (không
      loading, không error, không gì cả). **[Đã đóng]** Dòng 18 parseInt,
      dòng 42-46 check `Number.isNaN(courseId)` → set `appState('error')` +
      thông báo "Đường dẫn khóa học không hợp lệ." trước khi fetch; dòng
      282-297 render banner lỗi + nút "Quay lại". Không còn treo trắng.
    - `share/[token]/page.tsx` — clone-khi-đăng-nhập-xong không có
      idempotency/guard chống double-submit, và backend `cloneForOwner`
      không chặn trùng — bấm 2 lần (hoặc double-fire effect) ra 2 khóa học
      giống hệt nhau trong tài khoản user. **[Đã đóng]** Frontend:
      `isCopyingRef` (dòng 58) chặn double-click/double-fire đồng bộ (state
      React không đủ nhanh nên dùng ref); reset về `false` chỉ ở nhánh lỗi
      để cho retry. Backend: `CourseRepository.cloneForOwner` (dòng
      294-304) có fast-path check `(owner_id, cloned_from_course_id)` trả
      lại clone cũ nếu đã có, cộng bắt lỗi `P2002` (unique constraint) cho
      race thật ở DB layer.
    - `courses/[id]/learn/page.tsx` — % tiến độ trên thanh sub-header không
      cập nhật lại sau khi hoàn thành bài trong chính phiên đang học (chỉ
      đúng sau khi tải lại trang); ghi nhận tiến độ có thể mất im lặng khi
      API lỗi (không rollback, không retry). **[Đã đóng]** `markLessonCompleted`
      (dòng 118-120) patch trực tiếp state `lessons` local, `calculateCourseProgress()`
      (dòng 518-522) tính % ngay trên state đó → cập nhật realtime không cần F5.
      Lỗi API không còn im lặng: `progressSyncError` set `true` trong catch
      (dòng 147, 366), hiện banner "Chưa lưu được tiến độ, đang thử lại..."
      (dòng 671-678), có rollback `lastSentTimeRef` để tick kế tiếp tự retry.
    - `profile/page.tsx` — 2 nguồn dữ liệu user khác nhau hiển thị cùng lúc
      (avatar từ `localStorage` cache, form từ API fetch mới) có thể lệch
      nhau; lỗi hệ thống khi lưu profile không hiện thông báo gì cho user
      (nuốt lỗi im lặng). **[Đã đóng — 2026-08-12]** Phần "nuốt lỗi im
      lặng" đã đóng trước: `handleSubmit` catch (dòng 177-189) set
      `appState('system_error')` + thông báo lỗi, hiện ở dòng 306-308. Phần
      "2 nguồn dữ liệu lệch nhau" vừa vá: `getProfile()`
      (`src/lib/auth.ts:130`, `AuthService.getProfile`) thật ra đã trả sẵn
      `avatarUrl` từ trước — chỉ là `loadProfile()` trong `profile/page.tsx`
      chưa dùng tới, chỉ set `email`/`fullName`/`age` từ response rồi bỏ
      qua avatar, để `user` state (nguồn hiển thị avatar) đứng yên ở snapshot
      `localStorage` lúc mount. Thêm 1 dòng gọi `mergeIntoCurrentUser({
      avatarUrl: profile.avatarUrl, fullName: profile.fullName })` ngay sau
      khi fetch xong để đồng bộ lại avatar/tên từ API mới nhất — không cần
      đổi backend/type vì field đã sẵn có, chỉ là chưa được đọc ra.
    - `page.tsx` (trang chủ) — nút "Thử lại" khi tìm kiếm lỗi có thể là
      no-op nếu state tìm kiếm không đổi; không có lối tạo khóa học nào trên
      mobile. **[Đã đóng]** `fetchCourses` (dòng 51-68) tách riêng thành hàm
      gọi trực tiếp ở nút retry (dòng 278-283: `onClick={() =>
      fetchCourses(debouncedSearchQuery)}`), không còn phụ thuộc
      state-update bail-out của React. Khối dán-link (dòng 168-199) dùng
      `flex-col md:flex-row`, không có `hidden`/`md:block` nào ẩn nó — luôn
      hiển thị được trên mobile.

- **WP1.6 — Dọn nốt tầng "legacy marketplace" (enrollment/role) còn trà trộn
  với ownership model, phát sinh khi tự dùng thật sau WP1.5.** **[Đã đóng —
  2026-08-10, commit `c072720` + follow-up `c5e9798`]** WP0.2 pivot
  `Course` sang sở hữu cá nhân (`owner_id`), và WP1.5.9–1.5.10 đã sửa vài route
  theo hướng đó, nhưng đó là sửa **điểm**, chưa quét hết — nhánh `enrollments`
  (bảng + domain `Enrollment`/`EnrollmentPolicy`/`EnrollmentFactory` + repo/
  service/controller riêng) từ mô hình marketplace cũ (STUDENT enroll vào
  course của LECTURER) vẫn còn tồn tại **song song** với ownership model mới,
  không đồng bộ với nhau — đây chính là nguồn gốc các log 200-nhưng-rỗng và
  403-khó-hiểu người dùng gặp phải khi tự test lại toàn luồng. Toàn bộ nhánh
  `Enrollment*` (domain/repo/service/controller) đã bị **xoá hẳn** khỏi
  codebase, bảng `enrollments` bị drop qua migration
  `20260810133700_drop_legacy_enrollments`, và mọi route/UI phụ thuộc đã
  chuyển hẳn sang ownership-based. Audit lại trực tiếp trên code (2026-08-12)
  xác nhận cả 5 mục con dưới đây đều đã đóng, không còn phần nào treo.
  - **WP1.6.1 — Catalog công khai kiểu marketplace cũ đứng cạnh learn/lessons
    ownership-only mới → tự tạo "bẫy 403".** `GET /api/v1/courses`
    (`CourseController.getCourses` → `findActiveCoursesWithThumbnails`) trả
    về **toàn bộ** course `ACTIVE` của **mọi** user, không lọc theo owner —
    đúng kiểu catalog marketplace cũ. Trang chủ (`page.tsx`) hiển thị catalog
    này cho bất kỳ ai đăng nhập, và `courses/[id]/page.tsx` chỉ dựa vào
    `user` có tồn tại hay không (không dựa vào owner có khớp không) để quyết
    định hiện nút "Bắt đầu học" → bấm vào course của người khác vẫn ra nút,
    dẫn thẳng tới `/courses/[id]/learn` rồi 403 `NOT_ENROLLED` ở
    `GET /courses/[id]/lessons` (gate ownership-based đúng, đã fix ở WP1.5.9).
    Đây chính là log user báo: *"vào trùng khóa 403? ko hiểu tại sao"* — không
    phải bug ở gate 403 (gate đúng), mà là catalog phía trước gate đó vẫn quảng
    cáo course người dùng không có quyền vào. Cần chọn 1 hướng: (a) catalog chỉ
    show course của chính user (nhất quán ownership-based toàn app), hoặc (b)
    giữ browse công khai nhưng nút hành động phải phản ánh đúng quyền thật
    (dùng `isEnrolled`/so khớp `ownerId` đã có sẵn ở `CourseService.getCourseDetail`)
    trước khi cho bấm — không để user tự nhảy vào bẫy. **[Đã đóng —
    2026-08-10]** Đi theo hướng (b): nút hành động ở `courses/[id]/page.tsx`
    rẽ theo `course.isOwner` (đổi tên từ `isEnrolled` cho khớp semantics),
    tính từ `CourseService.getCourseDetail` — `!user` → "Tham gia để học",
    `isOwner` → "Bắt đầu học"/"Tiếp tục học", không phải owner → "Sao chép".
    Catalog vẫn browse công khai, gate đúng ở nút hành động.
  - **WP1.6.2 — `/my-learning` luôn rỗng: đọc từ bảng `enrollments` không ai
    còn viết vào.** `GET /api/v1/courses/enrolled` (dùng bởi
    `my-learning/page.tsx` qua `lib/course.ts:getEnrolledCourses`, đúng log
    user báo `filter=in_progress`/`completed` đều trả rỗng) đi qua
    `EnrollmentController → EnrollmentService.getEnrolledCourses →
    EnrollmentRepository.getEnrolledCoursesWithDetails`, query thẳng bảng
    `enrollments`. Từ khi pivot ownership (WP0.2), không còn nơi nào trong
    luồng chính tạo dòng `enrollments` cho course sở hữu — user có N course
    thật (owner_id khớp) nhưng "Khóa học của tôi" luôn hiện empty-state, dù
    dữ liệu không hề mất, chỉ là route đang đọc nhầm nguồn. Việc cần làm:
    viết lại route/`EnrollmentRepository` để lấy danh sách theo `owner_id`
    (giống cách `ContentManagementService.getLecturerCourses` đã làm), không
    còn phụ thuộc bảng `enrollments` cho luồng hiển thị chính. **[Đã đóng —
    2026-08-10]** Route đổi `GET /api/v1/courses/enrolled` →
    `GET /api/v1/courses/owned`; `EnrollmentController/Service/Repository`
    đổi tên hẳn thành `OwnedCoursesController/Service/Repository`, query
    theo `owner_id` (join `learning_progress` để tính `completionRate`),
    không còn động tới bảng `enrollments`.
  - **WP1.6.3 — Hai định nghĩa "đã sở hữu/đã học" tồn tại song song, không
    khớp nhau.** `POST/GET /api/v1/courses/[id]/enroll`
    (`EnrollmentController.enrollStudent`/`checkEnrollmentStatus`) và hàm
    client tương ứng `lib/courses.ts:enrollCourse` — **không có UI nào gọi
    tới** (0 usage trong `src/app`) — vẫn ghi/đọc bảng `enrollments` độc lập,
    tách biệt hoàn toàn khỏi `ownerId` là nguồn sự thật thật sự đang dùng ở
    `CourseService.getCourseDetail`. Route này còn sống là rủi ro: ai vô tình
    nối lại UI vào đây (hoặc AI code-gen sau này gợi ý dùng lại) sẽ tạo ra
    luồng "enrolled nhưng vẫn 403" hoặc ngược lại. **[Đã đóng — 2026-08-10]**
    Route `/courses/[id]/enroll` và `lib/courses.ts:enrollCourse` đã bị xoá
    hẳn (không chỉ ngừng gọi). Cùng đợt phát hiện + xoá thêm 1 route mồ côi
    cùng bản chất: `GET /lessons/[id]/play` (`LessonController.getVideoContext`,
    luôn 403 `NOT_ENROLLED` cho mọi user).
  - **WP1.6.4 — Role-gate legacy còn sót ngoài phạm vi đã quét ở WP1.5.10.**
    `management/lessons/[id]/quiz/upload/route.ts:18` vẫn chặn cứng
    `user.role !== 'LECTURER' && user.role !== 'ADMIN'` → user role
    `STUDENT` (role mặc định khi đăng ký, đã ghi nhận ở WP1.5.10) sở hữu
    course thật vẫn bị 403 khi tải file quiz lên bài học **của chính mình**,
    trong khi các route quản lý nội dung khác (`management/courses`,
    content/sections) đã chuyển ownership-based. Và
    `lecturer/courses/page.tsx:199` — nút "Tạo khóa học đầu tiên" ở
    empty-state chỉ render khi `user?.role === 'LECTURER'`; STUDENT có 0
    course vào đúng trang quản lý course của mình lại không thấy cách nào để
    tạo course đầu tiên tại đây (phải biết đường vòng qua ô dán link ở trang
    chủ). Sửa cả hai theo cùng nguyên tắc ownership đã áp dụng nơi khác.
    **[Đã đóng — 2026-08-10]** `quiz/upload/route.ts` không còn chặn theo
    role — chỉ check `!user` (401), lỗi ownership do controller/service ném
    `ACCESS_DENIED` → 403 "Bạn không sở hữu bài học này". Trang
    `lecturer/courses/page.tsx` đổi tên thành `my-courses/page.tsx`, điều
    kiện `role === 'LECTURER'` ở nút "Tạo khóa học đầu tiên" đã bị bỏ. (Lưu
    ý: không nhầm với việc khác cùng tên "WP1.6.4 — Hướng B" đang làm dở
    song song — three-state `not_started`/`lastWatchedPositionSec` cho
    owned-courses, không liên quan role-gate.)
  - **WP1.6.5 — Quyết định dứt điểm số phận nhánh Enrollment.** Sau khi
    1.6.1–1.6.4 xong, bảng `enrollments` + domain (`Enrollment`,
    `EnrollmentPolicy`, `EnrollmentFactory`) + repo/service/controller riêng
    sẽ không còn nơi nào cần trong luồng chính — quyết định rõ: xoá hẳn (nếu
    ownership đã đủ cho mọi nhu cầu hiện tại), hay giữ lại có chủ đích khác
    (vd sau này "theo dõi" course người khác mà không sở hữu — concept khác
    ownership, cần thiết kế lại tên/API rõ ràng, không tái dùng nhánh cũ mập
    mờ như hiện tại). Không để vừa tồn tại vừa sai — đây là mẫu số chung gây
    ra cả 1.6.1–1.6.3, và sẽ tiếp tục gây bug tương tự nếu không chốt.
    **[Đã đóng — 2026-08-10]** Quyết định = xoá hẳn. Toàn bộ domain
    `Enrollment`/`EnrollmentPolicy`/`EnrollmentFactory` + repo/service/
    controller riêng đã xoá khỏi `src`; bảng `enrollments` bị drop qua
    migration `20260810133700_drop_legacy_enrollments`. Ghi nhận ở commit
    message `c072720`/`c5e9798`, comment trong code
    (`OwnedCoursesRepository.ts`, `CourseService.ts`) và migration SQL —
    không có ADR riêng nhưng không còn treo.

- **WP1.7 — View "cùng học" (shared-course companions).** Trên course có
  share lineage: hiển thị ai khác đang học *cùng* course gốc (owner gốc +
  mọi người đã clone) và % tiến độ của họ — read-only, chỉ thấy trong phạm
  vi lineage đó (không phải leaderboard công khai), mặc định hiển thị (đối
  tượng Checkpoint 1 là nhóm bạn thật, và "thấy nhau" chính là giá trị).
  Tái dùng `Course.cloned_from_course_id` đã có sẵn trong data model (roadmap
  trước đó ghi sai tên field là `forkedFromCourseId`; xác nhận qua audit
  2026-08-12 — field thật khai báo ở `prisma/schema.prisma:82`, hiện chỉ dùng
  ở đường write để dedupe khi clone, chưa có đường đọc ngược nào cho
  lineage) — chỉ thêm một đường đọc mới trên cùng join. **Đây là cơ chế giữ chân chủ lực
  của sản phẩm** (Vision mục 9, quyết định wayfinder ticket 07/13): sản
  phẩm wrapper thuần đều chững; đối thủ "Notion + Sheet + ý chí" thua ở
  cấu trúc nhưng không thua ở "một mình" — WP này đánh đúng trục đó.
  **[Đã đóng — 2026-08-14]** Backend: `GET /api/v1/courses/[id]/companions`
  (`CourseController.getCompanions` → `CourseService`) trả 401 nếu chưa đăng
  nhập, 403 (`FORBIDDEN`) nếu caller không thuộc lineage (không phải owner
  gốc và không có clone nào của course này), 404 nếu course không tồn tại;
  ngược lại trả danh sách `CompanionDto` (tên, `completionRate`, `isSelf`)
  cho owner gốc + mọi clone cùng `cloned_from_course_id`, sắp theo % hoàn
  thành giảm dần. Frontend: `lib/courses.ts:getCompanions` gọi API, hiển thị
  ở `courses/[id]/page.tsx` (mục "cùng học", ẩn hẳn nếu lineage chỉ có 1
  người — không lộ khái niệm cho course chưa ai share/clone). Unit test
  riêng `CourseService.test.ts` (3 case: chặn người ngoài lineage, lineage
  chỉ 1 người trả rỗng, nhiều người trả đủ kèm progress) — `pnpm test`
  64/64 xanh.
- **WP1.8 — Migrate hosting khỏi free-tier trước khi mở cho người ngoài.**
  $0 tuyệt đối chỉ đúng ở giai đoạn founder-only (Oracle Always Free —
  đã bị thu hẹp một lần trong 2026, rủi ro nền tảng thật). Ngay khi
  Checkpoint 1 mở cho người ngoài: chuyển sang host ổn định ~$5–12/tháng
  do founder tự gánh (quyết định wayfinder ticket 05/09 — bền vững vô thời
  hạn, không gate trên retention). Kèm **nút donate thụ động** (Ko-fi/
  GitHub Sponsors, khung chữ "ủng hộ" trung tính, không logic
  subscription) — bật từ ngày đầu theo Vision mục 7. **[Cập nhật 2026-08-12
  — ✅ phần code xong, ❌ migrate hosting thật còn cần người vận hành]**
  Nút donate: `Header.tsx` đọc `NEXT_PUBLIC_DONATE_URL` (mới thêm vào
  `.env.example`), khung chữ "Ủng hộ" trung tính, không gate feature nào —
  ẩn hẳn nếu chưa cấu hình (không trỏ link giả). Hosting: `Dockerfile` sẵn
  production-ready từ trước; thêm `fly.toml` (build trực tiếp từ Dockerfile
  có sẵn, region Singapore) + `docs/DEPLOY.md` ghi rõ từng lệnh để chuyển
  sang Fly.io ~$5–7/tháng. Phần còn lại — tạo tài khoản, gắn thẻ thanh
  toán, `fly launch`/`fly deploy` thật, trỏ DNS — là thao tác vận hành cần
  người có quyền thanh toán của dự án, nằm ngoài phạm vi agent code (không
  tự động hoá được từ trong sandbox này). **[Xác nhận 2026-08-12]** Host
  thật hiện tại là **Vercel free tier** (không phải Oracle Always Free như
  giả định gốc — sửa lại cho đúng), và **Checkpoint 1 chưa mở cho người
  ngoài** tại thời điểm này. Theo đúng điều kiện gate của ticket, migrate
  hosting **chưa cần làm ngay** — chỉ bắt buộc trước/ngay khi mở Checkpoint
  1 ra ngoài. Domain `tech.com` đã có DNS cấu hình sẵn (chưa trỏ vào host
  compute nào, vì chưa có host compute thật) — có thể trỏ vào bất kỳ lựa
  chọn nào ở trên khi tới lúc migrate; `fly.toml`/`docs/DEPLOY.md` là một
  phương án đã chuẩn bị sẵn, không phải quyết định cuối cùng bắt buộc.
- **WP1.9 — Seed artifact: 3–5 course công khai dựng sẵn từ các playlist
  YouTube free phổ biến.** Là deliverable của Checkpoint 1, không phải chi
  tiết marketing (quyết định wayfinder ticket 08): đây là thứ làm bài post
  ra mắt ở cộng đồng trở nên cụ thể/chia sẻ được thay vì "tôi làm ra một
  tool" trừu tượng — mọi outreach ở Checkpoint 2 đứng trên artifact này.
  **[Cập nhật 2026-08-12 — ✅ làm xong theo phạm vi code có thể tự động hoá]**
  Tách seed artifact công khai ra file riêng `prisma/seed-showcase.ts`
  (script mới `pnpm seed:showcase`) — không đụng vào `prisma/seed.ts` (vẫn là
  dev/QA data, vẫn truncate). Thêm cột `courses.is_showcase` (migration
  `20260812180000_add_courses_is_showcase`) để đánh dấu course nào là
  showcase, tách khỏi dev/test/user data. 5 course thật, chủ sở hữu là một
  tài khoản showcase riêng (`showcase@elearning-platform.local`, không phải
  login test `jack@gmail.com`), nội dung xác minh thật qua YouTube oEmbed
  trước khi ghi vào seed (không tự bịa video ID): Java/C++ (Bro Code —
  `xTtL8E4LzTQ`, `-TkoO8Z07hI`), Python/JavaScript/HTML-CSS (freeCodeCamp.org
  — `rfscVS0vtbw`, `jS4aFq5-91M`, `mU6anWqZJcc`). Script idempotent (upsert
  theo slug, an toàn chạy nhiều lần lên DB thật đã có data). Đã chạy thật
  trên DB dev local, smoke-test `/share/<token>` trả 200, `tsc --noEmit` và
  `pnpm test` (64/64) sạch. **Lệch có chủ đích với chữ "playlist" trong mô
  tả ticket:** dùng video full-course đơn thay vì playlist nhiều video thật,
  vì luồng from-link của sản phẩm chưa hỗ trợ URL playlist (WP1.10.2 từ
  chối playlist ở tầng validate) — seed một "playlist" mà sản phẩm không tự
  tạo được từ link thật sẽ là artifact giả.
- **WP1.10 — Khóa học như "không gian học": sửa luồng tạo từ link, ẩn chương
  nhất quán, đổi từ hiển thị.** WP1.1 đã ship luồng "dán URL → course", nhưng
  đổ về trang editor thay vì trang học, chưa xử lý oEmbed fail/playlist, và
  chương mặc định `'Chương 1'` lộ ra khắp nơi dù course chỉ có 1 bài — không
  khớp lời hứa "1 video lẻ cũng là một không gian học nhẹ nhàng, không phải
  giáo trình". Nguồn quyết định: wayfinder map [Khóa học như không gian
  học](../wayfinder/khong-gian-hoc/map.md), gom lại tại
  [`docs/design/khong-gian-hoc-spec.md`](design/khong-gian-hoc-spec.md).
  - **WP1.10.1 — Schema.** Thêm cột `courses.source_id` (nullable, FK →
    `sources`) ghi course sinh từ nguồn nào (video lẻ hay playlist); chuẩn
    hoá `sources.type` = `YOUTUBE_VIDEO`/`YOUTUBE_PLAYLIST` (sửa
    `prisma/seed.ts` đang ghi `'VIDEO'` lệch với service `'YOUTUBE'`).
  - **WP1.10.2 — Backend from-link.** oEmbed fail không còn trả 422 chặn
    hoàn toàn — vẫn tạo course với title tạm `"Video YouTube (<videoId>)"`;
    từ chối URL playlist ở tầng validate (chưa hỗ trợ, báo lỗi rõ); ghi
    `courses.source_id` cho mọi course tạo từ from-link.
  - **WP1.10.3 — Luồng tạo ở `/my-courses`.** Hero paste-box thay 2 nút
    "Tạo khóa học"/"Tạo từ link YouTube" hiện tại; sau khi dán URL, card lựa
    chọn "Học ngay" (→ thẳng `/courses/{id}/learn`) hoặc "Thêm quiz/tóm tắt
    trước khi học" (→ editor đầy đủ hiện có, tự nhiên gọn vì course chỉ 1
    bài). "Tạo khóa học trống" giữ nguyên làm đường phụ.
  - **WP1.10.4 — Trang học: link về editor còn thiếu + cue tái diễn.** Vá lỗ
    hổng hiện tại (0 link từ `learn/page.tsx` về editor); thêm thẻ sidebar
    thường trực "+ Thêm quiz/tóm tắt cho bài này" và gợi ý khi video kết
    thúc/lesson hoàn thành.
  - **WP1.10.5 — Luật ẩn chương nhất quán ở mọi bề mặt.** Course có đúng 1
    chương (bất kể tên) → ẩn tầng chương, in phẳng danh sách bài — đã đúng ở
    editor/sidebar learn page, nhưng **`share/[token]/page.tsx` hiện luôn in
    tiêu đề chương cho mọi chương**, lệch thật với phần còn lại; fix để nhất
    quán.
  - **WP1.10.6 — Từ ngữ hiển thị: "Khóa học" → "Space".** Đổi mọi chuỗi
    hiển thị (không đổi code/DB/route `course`) trên toàn bộ UI — trang chủ,
    `/my-courses`, `/my-learning`, `/share/{token}`, editor, learn page.
    Thêm badge "N bài" trên card ở `/my-courses`/`/my-learning` để phân biệt
    hình thái (1 video vs nhiều chương) — không thêm tab/lọc riêng theo
    nguồn.

**[Audit 2026-08-14 — ✅ đã làm]**
- **WP1.10.1 (schema)**: thêm `courses.source_id` (nullable, FK → `sources`,
  migration `20260812184000_add_courses_source_id`) + quan hệ 2 chiều trong
  `schema.prisma`. Chuẩn hóa `sources.type` → `YOUTUBE_VIDEO` (sửa cả
  `ContentManagementService` đang ghi `'YOUTUBE'` và `prisma/seed.ts`/
  `seed-showcase.ts` đang ghi `'VIDEO'`).
- **WP1.10.2 (backend from-link)**: `YouTubeOEmbedAdapter.isPlaylistUrl()`
  mới — từ chối playlist ở validate layer (`PLAYLIST_URL_NOT_SUPPORTED`,
  400), không tạo course rỗng. oEmbed fail không còn throw
  `YOUTUBE_METADATA_FETCH_FAILED`/422 — tạo course với title tạm
  `"Video YouTube (<id>)"`. Mọi course từ from-link ghi `source_id`.
  `createCourseFromLink` đổi return type thành `{courseId, title,
  titleIsPlaceholder}` để UI hiện banner đổi tên khi cần.
- **WP1.10.3 (luồng tạo /my-courses)**: hero paste-box thay 2 nút cũ; "Tạo
  Space trống" tụt xuống link phụ (modal cũ giữ nguyên). Sau khi tạo, card
  lựa chọn "Học ngay" / "Thêm quiz/tóm tắt trước khi học" / "Dán link
  khác" — không còn redirect thẳng vào editor. Chặn URL playlist ngay ở ô
  nhập (client-side, khớp luật server) trước khi round-trip. Áp dụng cùng
  mẫu ở hero paste-box trang chủ (`src/app/page.tsx`, đã có từ WP1.5.5) để
  hai nơi nhất quán.
- **WP1.10.4 (trang học)**: thêm nút "Chỉnh sửa" trong sub-header (route
  này chỉ owner truy cập, không public) → `/my-courses/{id}/edit`. Thẻ
  sidebar thường trực "+ Thêm quiz/tóm tắt cho bài này" + cue dismissible
  "Đã xong video. Tạo quiz để ôn lại?" xuất hiện khi `markLessonCompleted`
  fire (mọi loại player: YouTube/Vimeo/`<video>`).
- **WP1.10.5 (luật ẩn chương)**: audit thực tế (đọc code, không suy đoán từ
  spec) cho thấy **editor và sidebar learn page cũng chưa áp dụng luật ẩn**
  — giả định gốc trong spec ("đã đúng ở editor/sidebar learn page") sai.
  Đã fix ở `share/[token]/page.tsx` và sidebar `learn/page.tsx` (course có
  đúng 1 chương → ẩn tầng chương, in phẳng bài). **Editor cố ý giữ nguyên**:
  header chương ở đó không chỉ là label mà còn là toolbar hành động
  (move up/down, xóa chương, + Bài học) — ẩn hẳn sẽ mất luôn cách quản lý
  chương duy nhất còn lại của course, khác hẳn 2 bề mặt kia (thuần đọc cấu
  trúc, không có control nào phía sau chương).
- **WP1.10.6 (từ ngữ + badge)**: quét toàn bộ `src/` cho "Khóa học"/"khóa
  học" hiển thị — đổi hết thành "Space" (trang chủ, `/my-courses`,
  `/my-learning`, `/share/{token}`, editor, learn page, `Header.tsx`,
  `SearchBar.tsx`, `CourseList.tsx`, lib error strings). Badge "N bài"
  thêm ở `CourseSummaryDto`/`OwnedCourseDto` (lessonCount, tính từ mọi
  lesson kể cả QUIZ) → hiện trên card ở `/my-courses` và `/my-learning`.
  Không thêm tab/lọc riêng theo nguồn.
- **Verify**: `npx tsc --noEmit` chỉ còn lỗi `globals.css` có từ trước;
  `pnpm test` 64/64; `npx prisma migrate deploy` áp thành công vào DB local
  (2 migration WP1.9+WP1.10.1); `pnpm seed` và `pnpm seed:showcase` chạy lại
  thành công sau migration (backward-compatible).

**Điều kiện qua checkpoint tiếp theo:** có người ngoài thật sự quay lại học
tiếp (retention có ý nghĩa) — đúng exit signal Vision giai đoạn 1. **WP1.5 và
WP1.6 phải xong trước khi bắt đầu WP2** — mời người ngoài vào một sản phẩm còn
lỗi avatar menu, mất note, mất focus khi chuyển bài, hoặc "Khóa học của tôi"
luôn trống/catalog dẫn thẳng vào bẫy 403, sẽ làm hỏng chính phép đo retention
mà checkpoint này cần, bất kể AI ở Checkpoint 2 tốt đến đâu.

---

## Checkpoint 2 — Cộng đồng hẹp VN + lớp AI tích hợp tối thiểu (Vision giai đoạn 2)

**Mô tả sản phẩm:** Mở cho wedge cụ thể: **người Việt tự học lập trình qua
YouTube** (Vision mục 4, quyết định wayfinder ticket 08). Mỗi course/bài có
thêm **tóm tắt & quiz tự sinh bằng AI** theo cấu hình mặc định — tự động có,
không cần user làm gì, không tốn phí cho user lẫn nền tảng (trong giới hạn
kiểm soát được). **Phạm vi AI chốt là integration-only** (Vision mục 6, ticket
13): đúng 2 recipe mặc định, không mở rộng mindmap/flashcard/chat — điểm bán
là kết quả nằm ngay trong vỏ course/tiến độ, không phải năng lực AI.

**Kế hoạch outreach** (thứ tự, theo ticket 08/15): (1) FB group "Tự học lập
trình miễn phí" → (2) J2TEAM Community (theo rules.j2team.org) — post seed
artifact WP1.9 + câu chuyện; (3) bài viết Viblo / thread VOZ nhẹ nhàng.
Kênh global chờ cổng retention bên dưới.

**Chi tiết kỹ thuật:** `docs/design/ai-integration-plan.md`.

**WP:**
- **WP2.1 — Data model `Source`/`AIGeneration`.** Theo
  `ai-personalization-economics.md` mục 3, gồm cả 2 ghi chú mới
  (`modelVersion` trong `recipeHash`, `generatedByUserId` → NULL khi xoá tài
  khoản). **Bước chuẩn bị (ticket 14):** trước khi code `TranscriptProvider`
  và 2 recipe mặc định, dành ~nửa ngày đọc tham khảo Notex (Apache-2.0 —
  được phép mượn code có ghi công: yt-dlp fallback, prompt, cách chunk
  transcript dài) và PageLM (license cấm dùng thương mại — **chỉ đọc lấy ý
  tưởng** thiết kế prompt/schema output, tuyệt đối không port code).
  **[Đã đóng — 2026-08-14]** Bảng `ai_generations` (migration
  `20260814180000_add_ai_generations`, additive) đúng theo mục 3: `recipe_hash`
  gồm cả `model_version` (ghi chú 1), `generated_by_user_id` nullable với
  `onDelete: SetNull` (ghi chú 2 — xoá tài khoản không cascade-delete bản
  `SHARED`), `key_source`/`visibility`/`is_default_recipe`/`status` (enqueue
  nhẹ PENDING/READY/FAILED theo `ai-integration-plan.md` mục 4). Ràng buộc 1
  (`unique(source_id, recipe_hash) WHERE key_source = 'SHARED_FREE'`) là
  partial unique index viết tay trong migration SQL (Prisma schema syntax
  không biểu diễn được partial index). `lessons.ai_generation_id` nullable —
  AI luôn optional (mục 8), gán là bước UI riêng, generate không tự gán.
  Đã verify: `prisma migrate deploy` áp sạch vào DB local, `\d ai_generations`
  xác nhận partial unique index đúng, `tsc --noEmit` sạch. **Chưa làm**:
  đọc Notex/PageLM tham khảo (bước chuẩn bị ticket 14) — hoãn tới khi thật sự
  code `TranscriptProvider`/prompt ở WP2.2.
- **WP2.2 — Pipeline generate AI mặc định có kiểm soát chi phí.** Lazy-generate
  (chỉ chạy khi user thật sự bấm dùng, không tự động khi thêm Source), cache
  theo `(sourceId, recipeHash mặc định)`, rate-limit Source mới/user/ngày (mục
  6.1), quota tính theo token thực chứ không theo lượt (mục 6.3).
  **[Cập nhật 2026-08-17 — ✅ pipeline code xong, ✅ verify thật end-to-end
  (không mock), ✅ đổi sang LiteLLM đa provider]** Domain thuần: `RecipeHash.ts`
  (hash ổn định bất kể thứ tự key) + `AIGenerationPolicy.ts` — 4 nhánh
  routing chi phí (mục 4), fix free-rider ép `PAID_TIER` luôn `PRIVATE`
  (mục 5), ranh giới default/custom theo segment (mục 2), chặn kế thừa
  `PAID_TIER` khi fork/clone, ngưỡng rate-limit/ngày (mục 6.1) và token
  budget theo ký tự transcript ước lượng (mục 6.3). Providers:
  `TranscriptProvider` interface + `YoutubeTranscriptPlusProvider`
  (`youtube-transcript-plus`); `LLMProvider` interface + **`LiteLLMProvider`**
  — gọi qua LiteLLM proxy self-host (`ghcr.io/berriai/litellm`, service mới
  trong `docker-compose.yml`, cấu hình đa provider ở `litellm/config.yaml`:
  Groq/OpenAI/Anthropic/OpenRouter/tự host qua 1 endpoint OpenAI-compatible
  duy nhất) thay vì khoá cứng vào 1 SDK provider — đổi provider mặc định chỉ
  sửa `AI_DEFAULT_MODEL` + 1 entry config, không đụng code TS. Lỗi provider
  bọc riêng thành `LLMGenerationError`, không tự fallback ngầm sang nguồn
  khác (mục 6.2). `AIGenerationRepository` (cache lookup theo
  `(sourceId, recipeHash)`, đếm activation/ngày) + `AIGenerationService` nối
  domain → transcript (lazy-fetch, lưu 1 lần ở `sources.transcript` — mục
  6.5) → LLM → lưu `ai_generations` (enqueue nhẹ PENDING→READY/FAILED, đúng
  ai-integration-plan.md mục 4). Route `POST/GET
  /api/v1/sources/[sourceId]/ai-generations`. 10 unit test service-level
  (mock transcript/LLM provider) + 23 test domain, tổng `pnpm test` 100/100
  xanh, `tsc --noEmit` sạch. **Verify thật (không mock) 2026-08-17**: chạy
  LiteLLM proxy local qua Docker với key Groq thật, gọi trực tiếp
  `LiteLLMProvider` → nhận output LLM thật; chạy toàn bộ
  `AIGenerationService.generate` với 1 Source thật (video "Me at the zoo") —
  transcript fetch thật từ YouTube → lưu vào `sources.transcript` → gọi
  Groq qua proxy → `ai_generations` status `READY` với nội dung tóm tắt
  tiếng Việt hợp lý; gọi lại lần 2 xác nhận `servedFromCache: true` (không
  gọi LLM lại). Env mới trong `.env.example`: `LITELLM_BASE_URL`,
  `LITELLM_MASTER_KEY`, `AI_DEFAULT_MODEL`, cùng key riêng từng provider
  (`GROQ_API_KEY`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`/`OPENROUTER_API_KEY`/
  `SELFHOST_LLM_*`) — chỉ cần set key của provider thực sự dùng. Migration
  đi kèm: `20260814190000_add_sources_transcript` (transcript lưu ở Source,
  không lặp lại ở AIGeneration).
  **Chưa làm**: (a) đọc Notex/PageLM tham khảo (bước chuẩn bị ticket 14,
  WP2.1) — bỏ qua vì đã tự thiết kế xong prompt/pipeline, không còn chặn
  đường; (b) UI gắn `CourseItem.aiGenerationId`/nút bấm dùng AI — đã làm
  tiếp ngay dưới đây ở WP2.3; (c) test thật các provider khác ngoài Groq
  (OpenAI/Anthropic/OpenRouter/tự host) — config đã sẵn sàng nhưng chưa có
  key để verify, chỉ Groq đã xác nhận chạy thật; (d) auth DB-backed cho
  proxy (`general_settings.master_key` của LiteLLM cần Postgres riêng) —
  đang dùng bearer-token đơn giản qua env, đủ cho Checkpoint 2 nhưng cần
  xem lại nếu mở proxy ra ngoài mạng nội bộ Docker.
  **Chưa mở Checkpoint 2 ra ngoài** — code này là chuẩn bị kỹ thuật trước,
  không đồng nghĩa gate retention ở cuối Checkpoint 1 đã đạt.
- **WP2.3 — UI hiển thị AI mặc định gắn vào course-item.** Luôn optional —
  generate lỗi/chưa xong không chặn việc học. **Gồm nhánh UX quota-cạn
  (ticket 06):** khi quota SHARED_FREE toàn nền tảng (~250 req/ngày) cạn,
  hiển thị rõ "thêm key miễn phí của bạn hoặc chờ ngày mai" — không âm thầm
  chặn, không tự fallback.
  **[Bắt đầu — 2026-08-14]** `AIGenerationPanel` (`src/components/`) — card
  riêng biệt trên trang học (`courses/[id]/learn/page.tsx`), chỉ render khi
  lesson có `sourceId` (lesson thêm thủ công không có gì để tóm tắt). 2 nút
  "Tóm tắt bài này"/"Tạo quiz 10 câu" gọi
  `POST /api/v1/sources/[sourceId]/ai-generations`, hiện kết quả inline.
  Luôn optional đúng nghĩa: card này độc lập hoàn toàn với video/note/tiến
  độ phía trên — lỗi API chỉ hiện banner amber trong chính card, không ảnh
  hưởng phần còn lại của trang. Nhánh UX quota-cạn (ticket 06): lỗi
  `AI_DAILY_RATE_LIMIT_EXCEEDED` hiện message rõ "Đã dùng hết lượt tạo AI
  miễn phí hôm nay — thử lại vào ngày mai" thay vì âm thầm chặn/tự fallback.
  Để đưa `sourceId` tới UI phải thêm `Lesson.sourceId`/`LessonDto.sourceId`
  xuyên suốt domain → DTO → route `/courses/[id]/lessons` → type
  `Lesson.sourceId` ở frontend (field mới, optional, không phá vỡ chỗ nào
  đang dùng `Lesson`/`LessonDto` cũ). Verify: `pnpm test` 100/100,
  `tsc --noEmit` sạch, `next build` qua (route mới hiện đúng trong build
  output). Backend phía sau panel này đã verify thật (không mock) qua
  LiteLLM/Groq — xem chi tiết ở WP2.2. **Chưa làm**: click thật qua browser
  (test ở WP2.2 gọi thẳng `AIGenerationService`, chưa qua UI/route HTTP);
  UI cho nhánh BYOK (nhập key riêng) — hiện panel chỉ gọi SHARED_FREE mặc
  định, chưa có ô nhập key.
  **[Bổ sung — 2026-08-20, chưa từng có trong ROADMAP/wayfinder trước đó]**
  Gap phát hiện qua audit thật với founder: luồng "dán link → chọn 'Thêm
  quiz/tóm tắt trước khi học' → vào editor" (WP1.10.3/1.10.4) đưa user tới
  `/my-courses/[id]/edit`, nhưng editor trước đó **chỉ hỗ trợ tạo quiz qua
  upload file Excel thủ công** — không có đường AI nào ở đây, trái với hình
  dung ban đầu (AI tự sinh quiz ngay tại editor, không phải chỉ ở trang học).
  Đã nối AI vào editor: lesson VIDEO có `sourceId` hiện thêm khối "Dùng AI
  cho bài này" (nút "AI tóm tắt bài này"/"AI tạo quiz 10 câu", tái dùng
  nguyên `generateAIContent`/`AIGenerationError` — cùng key/quota/BYOK/
  PAID_TIER routing với trang học, không phải luồng thứ 2 tách biệt). Điểm
  mới thật sự: quiz AI trả về nay **parse được thành câu hỏi có cấu trúc**
  (`parseAIQuizContent`, `src/lib/aiGeneration.ts` — trước đây
  `AIGenerationPanel` chỉ hiện `content` như văn bản thô, không parse) và có
  nút "Tạo bài quiz mới từ đây" tạo thẳng 1 lesson QUIZ mới trong cùng
  chương + lưu câu hỏi qua endpoint mới
  `POST /api/v1/management/lessons/[id]/quiz/questions` (JSON, không cần
  xuất Excel trước) — validate bằng đúng 1 bộ luật với đường Excel
  (`QuizValidationPolicy.validateParsedQuestion`, tách ra dùng chung, không
  tạo bộ luật lỏng hơn riêng cho nội dung AI). Prompt quiz ở
  `AIGenerationService.buildPrompt` đổi sang yêu cầu schema JSON cố định
  (`content`/`options`/`correctAnswer`) thay vì "trả về JSON array" chung
  chung — cần thiết để parse được, không phải đổi hành vi generate. Luôn do
  user chủ động bấm, không có gì tự chạy khi mở editor/thêm lesson mới (đúng
  nguyên tắc lazy-generate ở WP2.2). Verify: `pnpm test` 151/151 (thêm 15
  test mới — `QuizValidationPolicy.validateParsedQuestion` + parse quiz),
  `tsc --noEmit` sạch, `next build` compile qua (bước collect-page-data
  timeout riêng, môi trường sandbox, không liên quan thay đổi này).
- **WP2.4 — Alerting chi phí AI theo ngày/tuần** (mục 6.7). Bắt buộc trước khi
  mở rộng thêm cộng đồng, để phát hiện sớm tăng trưởng đột biến ngoài dự tính.
  **Đo cả số request/ngày, không chỉ $** (ticket 06) — với free tier, cạn
  quota xảy ra trước khi phát sinh chi phí, nên $ một mình là chỉ số mù.
  **[Bắt đầu — 2026-08-14]** `scripts/aiUsageReport.ts` (`pnpm ai:usage-report`)
  — in bảng số request/ngày theo `key_source` cho 7 ngày gần nhất, cộng dồn
  hôm nay, so với ngưỡng `AI_ALERT_DAILY_REQUESTS` (mặc định 250, khớp con
  số ước lượng ở ticket gốc) và in cảnh báo rõ ràng khi chạm/vượt ngưỡng.
  `AIGenerationPolicy.exceedsAlertThreshold` (pure, 3 test riêng) giữ logic
  so ngưỡng; truy vấn thật nằm thẳng trong script (không qua
  `AIGenerationRepository`) vì `ts-node` chạy script ở chế độ ESM không
  resolve được import extension-less từ `src/` — cùng ràng buộc đã có sẵn ở
  `prisma/seed-showcase.ts`, giữ 1 nơi có query thay vì 2 bản dễ lệch nhau.
  Verify thật: chạy `pnpm ai:usage-report` trên DB local (0 request, in
  đúng "✅ Trong ngưỡng an toàn"). `pnpm test` 100/100, `tsc --noEmit` sạch.
  **Chưa làm**: kênh báo thật (email/Slack/push) — hiện chỉ in ra stdout,
  cần chạy thủ công hoặc cron thật trên host production; quyết định kênh cụ
  thể là việc vận hành khi triển khai thật (giống WP1.8), ngoài phạm vi
  code-only của phiên này. Dashboard/route admin xem số liệu qua UI cũng
  chưa làm — script CLI là đủ cho quy mô "cộng đồng hẹp" của Checkpoint 2.

**Điều kiện qua checkpoint tiếp theo:** retention tốt ở cộng đồng hẹp **và**
chi phí AI mặc định nằm trong ngân sách quan sát được, ổn định (không phải chờ
"có tiền" mà chờ số liệu ổn định để tự tin mở rộng).

**Cổng mở kênh global (ticket 08 — con số thật, không phải hình thức, đã
được founder chốt 2026-08):** **≥30% người dùng ngoài (không phải founder)
quay lại học trong tuần thứ 2–4 sau lần học đầu, trên cỡ mẫu ≥30 người**.
Chưa đạt thì chưa đụng Show HN / r/learnprogramming, tránh VN-first trượt
dần thành "làm cả hai cùng lúc".

---

## Checkpoint 3 — Tuỳ biến AI qua BYOK + bước đệm kiếm tiền nhẹ

**Mô tả sản phẩm:** User muốn tuỳ biến AI (độ khó, độ dài, giọng văn, tự chia
segment) → nhập API key miễn phí của riêng họ (BYOK), dùng không giới hạn.
Thêm hỗ trợ nguồn web/blog (không chỉ YouTube).

**WP:**
- **WP3.1 — Luồng BYOK. ✅ Đã làm.** UI nhập/validate key, generate qua key
  riêng của user, tuyệt đối không đụng cache/quota chung. Đúng 4 nhánh UX ở
  `ai-personalization-economics.md` mục 4. Lỗi BYOK luôn hiện rõ, không tự
  fallback âm thầm sang ngân sách chung (mục 6.2).
  BYOK bắt buộc đủ cả 3 field (`apiKey` + `baseUrl` + `model`) — không đoán
  giúp provider/model nào, thiếu 1 trong 3 báo lỗi `BYOK_CONFIG_INCOMPLETE`
  rõ ràng thay vì âm thầm rơi về nhánh khác (`AIGenerationPolicy.byokConfigStatus`).
  Tuỳ biến tham số (độ dài/độ khó/ngôn ngữ) + `segmentRange` giờ chảy thật từ
  UI (`AIGenerationPanel` — toggle "Tuỳ biến") → route → `AIGenerationService`
  → `RecipeHash`/`isDefaultRecipe`, làm 2 nhánh trước đây chết
  (`CHOICE_REQUIRED`, `findSharedByokMatch`) lần đầu tiên có thể chạm tới được.
  `LiteLLMProvider` route tới đúng `baseUrl`/`model` của user khi BYOK, không
  chỉ đổi bearer token trên cùng proxy nền tảng.
- **WP3.2 — Cơ chế chia sẻ bản AI tuỳ biến + fix free-rider. ✅ Đã làm.** Cho
  phép user chọn `SHARED` cho bản BYOK của họ để người khác tái dùng free; xây
  sẵn ràng buộc `PAID_TIER` luôn `PRIVATE` (mục 5) **ngay cả khi chưa bán
  thật** — để không phải sửa lại data model khi tới Checkpoint 4.
  `AIGenerationPolicy.inheritOnClone` (viết sẵn từ trước nhưng chưa gọi ở đâu)
  giờ được gọi thật trong `CourseRepository.cloneForOwner`: clone 1 course chỉ
  kế thừa `ai_generation_id` của lesson nếu bản gốc là `SHARED_FREE`/`BYOK`,
  không bao giờ kế thừa bản `PAID_TIER` — đúng tinh thần fix free-rider thay
  vì chỉ nằm trên giấy. `generated_by_user_id → NULL` khi xoá tài khoản: đã
  đúng sẵn từ WP2.1 qua `ON DELETE SET NULL` trong migration, không cần sửa.
- **WP3.3 — Hỗ trợ nguồn web/blog. ✅ Đã làm** (mục 6.8): `WebPageAdapter`
  nhận diện URL không phải YouTube, fetch title tại thời điểm tạo course/nguồn
  (nhánh mới trong `ContentManagementService.createCourseFromLink`, không chặn
  tạo course nếu fetch metadata lỗi — cùng pattern với nhánh YouTube).
  `ReadabilityWebContentProvider` (mới, dùng `@mozilla/readability` + `jsdom`)
  trích xuất nội dung chính của trang, wired vào `AIGenerationService` qua
  interface `WebContentProvider` — cùng pattern cô lập thư viện dễ vỡ như
  `TranscriptProvider` cho YouTube. Tái dùng nguyên `transcript`/
  `transcript_fetched_at` sẵn có làm tín hiệu cache/staleness — không thêm
  cột mới.
  **Chưa làm:** rate-limit riêng theo domain nguồn (chỉ có rate-limit theo
  user/ngày, dùng chung với YouTube) — quy mô cộng đồng hẹp hiện tại chưa cần
  tách riêng; UI đọc bài viết web dạng "article reader" chuyên biệt (hiện
  lesson `type: 'ARTICLE'` dùng chung layout ẩn nội dung phía trên
  `AIGenerationPanel`, panel tóm tắt/quiz vẫn hoạt động qua `sourceId`).
- ~~WP3.4 — Nút donate/ủng hộ~~ **Đã chuyển lên WP1.8** (quyết định
  wayfinder ticket 09: link donate thụ động bật từ ngày đầu là vô hại;
  chỉ khung chữ "cầu cứu" mới gây hại — xem Vision mục 7).

**Điều kiện qua checkpoint tiếp theo:** 1 trong các tín hiệu thu phí ở Vision
mục 7 xảy ra thật (retention ổn định + chi phí AI dùng chung chạm giới hạn
thường xuyên, hoặc user chủ động đòi hỏi thêm, hoặc đủ quy mô).

---

## Checkpoint 4 — Bật `PAID_TIER` thật + mở rộng công khai (Vision giai đoạn 3–4)

**Mô tả sản phẩm:** Khi tín hiệu thu phí xảy ra thật, cắm thanh toán thật vào
nhánh UX đã có sẵn từ Checkpoint 3 (không phải xây lại). Sau khi ổn định, mở
đăng ký công khai cho bất kỳ ai.

**WP:**
- **WP4.1 — Tích hợp thanh toán thật. ✅ Đã làm.** Bán theo gói credit cố định
  (`starter`/`standard`/`bulk` — 20/120/300 credit, `$1.99`/`$9.99`/`$19.99`),
  **không** pay-per-generation lẻ tẻ (phí xử lý thanh toán ăn mòn doanh thu
  nhỏ lẻ — đúng mục 7 economics doc). Cắm thẳng vào nhánh UX #4 đã có sẵn từ
  Checkpoint 3 — data model không đổi, chỉ additive.
  Data model: `users.credit_balance`/`stripe_customer_id` (additive, default
  0/null) + bảng `credit_transactions` (ledger đầy đủ, `unique(stripe_reference)`
  chống Stripe webhook gửi trùng cộng credit 2 lần) — migration
  `20260818140000_add_billing_credits`. `CreditLedger.ts` (pure domain: tính
  số dư sau mua/tiêu/hoàn, `AI_INSUFFICIENT_CREDITS` nếu tiêu vượt số dư) →
  `CreditRepository` (mọi thay đổi `credit_balance` đi qua `$transaction`
  đọc-rồi-ghi, chống race 2 request đồng thời) → `BillingService` (nối
  `PaymentProvider` với ledger) → `StripePaymentProvider` (Stripe Checkout
  hosted page, verify chữ ký `Stripe-Signature` bằng raw body trước khi xử lý
  webhook — không tin payload chưa xác thực). Routes
  `GET/POST /api/v1/billing/{balance,checkout}` +
  `POST /api/v1/billing/webhook`, trang `/billing` (mua credit, xem số dư).
  Routing PAID_TIER nối vào `AIGenerationPolicy`/`AIGenerationService` có sẵn:
  chỉ kích hoạt khi 3 nhánh rẻ hơn (BYOK/SHARED_FREE/SHARED-BYOK-match) đều
  không khớp (lẽ ra `CHOICE_REQUIRED`) và user chủ động chọn "Trả phí để nền
  tảng tạo giúp" — trừ credit trước khi gọi LLM, hoàn lại nếu LLM lỗi sau khi
  đã trừ. `AIGenerationPanel` hiện nút "Trả phí" khi gặp
  `AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID`, dẫn sang `/billing` khi
  `AI_INSUFFICIENT_CREDITS` (HTTP 402). **Verify (2026-08-20)**:
  `npx prisma migrate deploy` áp sạch vào DB local, `pnpm test` 136/136 xanh
  (11 test `CreditLedger` mới), `tsc --noEmit` sạch. **Chưa làm**: tạo tài
  khoản Stripe thật/lấy key production — thao tác vận hành ngoài phạm vi
  agent code (giống WP1.8); để trống `STRIPE_SECRET_KEY` chỉ tắt route billing
  (503 `STRIPE_NOT_CONFIGURED`), không chặn phần còn lại của app; subscription
  (thay vì gói credit 1 lần) nếu sau này cần mô hình định kỳ.
- **WP4.2 — Policy dọn dữ liệu. ✅ Đã làm** (mục 6.4): archive
  `Source`/`AIGeneration` không truy cập lâu ngày và không còn course công
  khai nào tham chiếu. `sources.last_accessed_at`/`archived_at` +
  `ai_generations.archived_at` (additive, migration
  `20260818141000_add_data_retention_columns`).
  `DataRetentionPolicy.isEligibleForArchive` (pure domain: không bao giờ
  archive nếu còn course công khai — showcase hoặc có `share_token` — tham
  chiếu, dù đã lâu không dùng) + `DataRetentionRepository`
  (`touchLastAccessed` gọi mỗi lần `AIGenerationService.generate()` chạm tới
  1 Source — best-effort, lỗi không chặn generate chính).
  `scripts/archiveStaleData.ts` (`pnpm data:archive-stale`, mặc định dry-run,
  `-- --apply` để archive thật) — archive KHÔNG xoá row, chỉ đánh dấu
  `archived_at` + null hoá `transcript`/`content` (field nặng nhất), giữ
  nguyên `recipe_hash`/audit trail. Ngưỡng `DATA_RETENTION_ARCHIVE_DAYS`
  (mặc định 180 ngày) đọc từ env. **Verify (2026-08-20)**: migration áp sạch,
  `pnpm test` xanh (6 test `DataRetentionPolicy`), `tsc --noEmit` sạch.
  **Chưa làm**: chạy `pnpm data:archive-stale` định kỳ thật (cron) trên host
  production — thao tác vận hành khi triển khai thật, ngoài phạm vi code-only
  của phiên này (giống WP2.4).
- **WP4.3 — Mở đăng ký công khai.** Gỡ giới hạn invite-only, chuyển từ cộng
  đồng hẹp sang public free (Vision giai đoạn 4). **Audit code
  (2026-08-20): không có cơ chế invite-only nào trong code hiện tại** (đăng
  ký `/auth/register` mở sẵn, không gate theo mã mời/whitelist) — nghĩa là
  không có gì để "gỡ" ở tầng code. Đây là **quyết định mở kênh** (dừng coi
  cộng đồng là "hẹp" trong outreach/marketing, không phải thay đổi kỹ thuật),
  đúng nghĩa gate ở điều kiện chuyển checkpoint bên dưới — chưa bấm vì tín
  hiệu retention/lan truyền ổn định ở quy mô nhỏ (Checkpoint 2/3) chưa được
  founder xác nhận đạt.

**Điều kiện:** có bằng chứng retention + lan truyền ổn định ở quy mô nhỏ trước
khi mở public — không mở rộng khi tín hiệu ở checkpoint trước còn mơ hồ.

---

## Backlog phát sinh (ngoài checkpoint)

Gap/bug nghiệp vụ phát hiện dọc đường, không thuộc WP nào — ghi lại để không
trôi, đánh dấu khi xử lý xong.

- [x] **Clone Space không copy câu hỏi quiz** (phát hiện 2026-08-21, fix cùng
  ngày). `CourseRepository.cloneForOwner` copy row lesson (title/type/url +
  link `ai_generation_id` không-PAID theo luật free-rider WP3.2) nhưng bỏ sót
  bảng `questions` — người "Sao chép về học" một Space có bài quiz nhận lesson
  QUIZ rỗng ruột. Gap có từ trước tính năng AI composer, nhưng nghiêm trọng
  hơn từ khi quiz AI thành lesson thật (2026-08-21). **Fix:** include
  `questions` khi đọc course nguồn và `createMany` bản sao câu hỏi cho từng
  lesson mới trong cùng transaction clone. Lưu ý phân tầng: câu hỏi là nội
  dung đã "vật chất hoá" nên copy nguyên vẹn, không dính luật kế thừa
  `ai_generation_id` (PAID_TIER vẫn bị cắt link cache như cũ).

## Bảng tổng quan

| Checkpoint | Ai dùng được | Có AI? | Có thu phí? | Rủi ro chính nếu bỏ qua thứ tự |
|---|---|---|---|---|
| 0 | Chỉ founder | Không | Không | Pivot dở dang, nợ kỹ thuật dồn sang mọi checkpoint sau |
| 1 | Nhóm bạn bè | Không | Donate thụ động (WP1.8) | Ra mắt AI/thu phí trước khi core ổn định → phân tán nguồn lực, chưa có gì để giữ chân user |
| 2 | Cộng đồng hẹp VN | Có (2 recipe mặc định, free) | Donate thụ động | Bỏ qua rate-limit/alerting (6.1, 6.7) → cost-DoS âm thầm trước khi kịp phát hiện |
| 3 | Cộng đồng hẹp (mở rộng) | Có (tuỳ biến qua BYOK) | Donate thụ động | Không xây sẵn fix free-rider (mục 5) → `PAID_TIER` tự triệt tiêu ngay khi bật ở Checkpoint 4 |
| 4 | Public | Có (đủ 3 tier) | Có (khi feature-pull thật) | Mở public/thu phí trước khi có tín hiệu retention thật → đốt chi phí hosting nhanh hơn doanh thu (mục 6.7) |
