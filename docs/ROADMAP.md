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
  - **WP1.5.11 — Bổ sung màn hình còn thiếu.** Không có `not-found.tsx`,
    `error.tsx`, hay bất kỳ `loading.tsx` nào trong toàn bộ `src/app` — 404
    và lỗi runtime rơi về trang mặc định không thương hiệu của Next.js.
    Không có màn hình "quản lý share link của tôi" (xem lại/thu hồi link đã
    tạo) dù `WP1.4` đã có API tạo link — hiện chỉ tạo được, không xem lại
    được trừ vào đúng trang `view` (đã mồ côi, xem WP1.5.10) và **không có
    cách thu hồi link** ở bất kỳ tầng nào. Không có màn hình xoá tài khoản/
    export dữ liệu (thuộc phạm vi rộng hơn WP1.5.6). Không có UI xoá/sắp xếp
    lại bài học sau khi tạo course (`deleteLesson`/`updateLesson` đã có API
    nhưng không nơi nào trong `edit/page.tsx` gọi tới).
  - **WP1.5.12 — Vá các lỗi logic cụ thể phát hiện qua rà soát toàn màn
    hình.** Danh sách đầy đủ có file:line ở phụ lục audit; các lỗi ảnh hưởng
    trực tiếp tới user, ưu tiên cao nhất:
    - `courses/[id]/page.tsx` — `courseId = parseInt(...)` không kiểm tra
      `NaN`, URL course-id sai dạng làm trang treo trắng vĩnh viễn (không
      loading, không error, không gì cả).
    - `share/[token]/page.tsx` — clone-khi-đăng-nhập-xong không có
      idempotency/guard chống double-submit, và backend `cloneForOwner`
      không chặn trùng — bấm 2 lần (hoặc double-fire effect) ra 2 khóa học
      giống hệt nhau trong tài khoản user.
    - `courses/[id]/learn/page.tsx` — % tiến độ trên thanh sub-header không
      cập nhật lại sau khi hoàn thành bài trong chính phiên đang học (chỉ
      đúng sau khi tải lại trang); ghi nhận tiến độ có thể mất im lặng khi
      API lỗi (không rollback, không retry).
    - `profile/page.tsx` — 2 nguồn dữ liệu user khác nhau hiển thị cùng lúc
      (avatar từ `localStorage` cache, form từ API fetch mới) có thể lệch
      nhau; lỗi hệ thống khi lưu profile không hiện thông báo gì cho user
      (nuốt lỗi im lặng).
    - `page.tsx` (trang chủ) — nút "Thử lại" khi tìm kiếm lỗi có thể là
      no-op nếu state tìm kiếm không đổi; không có lối tạo khóa học nào trên
      mobile.

- **WP1.6 — Dọn nốt tầng "legacy marketplace" (enrollment/role) còn trà trộn
  với ownership model, phát sinh khi tự dùng thật sau WP1.5.** WP0.2 pivot
  `Course` sang sở hữu cá nhân (`owner_id`), và WP1.5.9–1.5.10 đã sửa vài route
  theo hướng đó, nhưng đó là sửa **điểm**, chưa quét hết — nhánh `enrollments`
  (bảng + domain `Enrollment`/`EnrollmentPolicy`/`EnrollmentFactory` + repo/
  service/controller riêng) từ mô hình marketplace cũ (STUDENT enroll vào
  course của LECTURER) vẫn còn tồn tại **song song** với ownership model mới,
  không đồng bộ với nhau — đây chính là nguồn gốc các log 200-nhưng-rỗng và
  403-khó-hiểu người dùng gặp phải khi tự test lại toàn luồng.
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
    trước khi cho bấm — không để user tự nhảy vào bẫy.
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
    còn phụ thuộc bảng `enrollments` cho luồng hiển thị chính.
  - **WP1.6.3 — Hai định nghĩa "đã sở hữu/đã học" tồn tại song song, không
    khớp nhau.** `POST/GET /api/v1/courses/[id]/enroll`
    (`EnrollmentController.enrollStudent`/`checkEnrollmentStatus`) và hàm
    client tương ứng `lib/courses.ts:enrollCourse` — **không có UI nào gọi
    tới** (0 usage trong `src/app`) — vẫn ghi/đọc bảng `enrollments` độc lập,
    tách biệt hoàn toàn khỏi `ownerId` là nguồn sự thật thật sự đang dùng ở
    `CourseService.getCourseDetail`. Route này còn sống là rủi ro: ai vô tình
    nối lại UI vào đây (hoặc AI code-gen sau này gợi ý dùng lại) sẽ tạo ra
    luồng "enrolled nhưng vẫn 403" hoặc ngược lại.
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
  - **WP1.6.5 — Quyết định dứt điểm số phận nhánh Enrollment.** Sau khi
    1.6.1–1.6.4 xong, bảng `enrollments` + domain (`Enrollment`,
    `EnrollmentPolicy`, `EnrollmentFactory`) + repo/service/controller riêng
    sẽ không còn nơi nào cần trong luồng chính — quyết định rõ: xoá hẳn (nếu
    ownership đã đủ cho mọi nhu cầu hiện tại), hay giữ lại có chủ đích khác
    (vd sau này "theo dõi" course người khác mà không sở hữu — concept khác
    ownership, cần thiết kế lại tên/API rõ ràng, không tái dùng nhánh cũ mập
    mờ như hiện tại). Không để vừa tồn tại vừa sai — đây là mẫu số chung gây
    ra cả 1.6.1–1.6.3, và sẽ tiếp tục gây bug tương tự nếu không chốt.

- **WP1.7 — View "cùng học" (shared-course companions).** Trên course có
  share lineage: hiển thị ai khác đang học *cùng* course gốc (owner gốc +
  mọi người đã clone) và % tiến độ của họ — read-only, chỉ thấy trong phạm
  vi lineage đó (không phải leaderboard công khai), mặc định hiển thị (đối
  tượng Checkpoint 1 là nhóm bạn thật, và "thấy nhau" chính là giá trị).
  Tái dùng `Course.forkedFromCourseId` đã có sẵn trong data model — chỉ
  thêm một đường đọc mới trên cùng join. **Đây là cơ chế giữ chân chủ lực
  của sản phẩm** (Vision mục 9, quyết định wayfinder ticket 07/13): sản
  phẩm wrapper thuần đều chững; đối thủ "Notion + Sheet + ý chí" thua ở
  cấu trúc nhưng không thua ở "một mình" — WP này đánh đúng trục đó.
- **WP1.8 — Migrate hosting khỏi free-tier trước khi mở cho người ngoài.**
  $0 tuyệt đối chỉ đúng ở giai đoạn founder-only (Oracle Always Free —
  đã bị thu hẹp một lần trong 2026, rủi ro nền tảng thật). Ngay khi
  Checkpoint 1 mở cho người ngoài: chuyển sang host ổn định ~$5–12/tháng
  do founder tự gánh (quyết định wayfinder ticket 05/09 — bền vững vô thời
  hạn, không gate trên retention). Kèm **nút donate thụ động** (Ko-fi/
  GitHub Sponsors, khung chữ "ủng hộ" trung tính, không logic
  subscription) — bật từ ngày đầu theo Vision mục 7.
- **WP1.9 — Seed artifact: 3–5 course công khai dựng sẵn từ các playlist
  YouTube free phổ biến.** Là deliverable của Checkpoint 1, không phải chi
  tiết marketing (quyết định wayfinder ticket 08): đây là thứ làm bài post
  ra mắt ở cộng đồng trở nên cụ thể/chia sẻ được thay vì "tôi làm ra một
  tool" trừu tượng — mọi outreach ở Checkpoint 2 đứng trên artifact này.

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
- **WP2.2 — Pipeline generate AI mặc định có kiểm soát chi phí.** Lazy-generate
  (chỉ chạy khi user thật sự bấm dùng, không tự động khi thêm Source), cache
  theo `(sourceId, recipeHash mặc định)`, rate-limit Source mới/user/ngày (mục
  6.1), quota tính theo token thực chứ không theo lượt (mục 6.3).
- **WP2.3 — UI hiển thị AI mặc định gắn vào course-item.** Luôn optional —
  generate lỗi/chưa xong không chặn việc học. **Gồm nhánh UX quota-cạn
  (ticket 06):** khi quota SHARED_FREE toàn nền tảng (~250 req/ngày) cạn,
  hiển thị rõ "thêm key miễn phí của bạn hoặc chờ ngày mai" — không âm thầm
  chặn, không tự fallback.
- **WP2.4 — Alerting chi phí AI theo ngày/tuần** (mục 6.7). Bắt buộc trước khi
  mở rộng thêm cộng đồng, để phát hiện sớm tăng trưởng đột biến ngoài dự tính.
  **Đo cả số request/ngày, không chỉ $** (ticket 06) — với free tier, cạn
  quota xảy ra trước khi phát sinh chi phí, nên $ một mình là chỉ số mù.

**Điều kiện qua checkpoint tiếp theo:** retention tốt ở cộng đồng hẹp **và**
chi phí AI mặc định nằm trong ngân sách quan sát được, ổn định (không phải chờ
"có tiền" mà chờ số liệu ổn định để tự tin mở rộng).

**Cổng mở kênh global (ticket 08 — con số thật, không phải hình thức):**
đề xuất mặc định **≥30% người dùng ngoài (không phải founder) quay lại học
trong tuần thứ 2–4 sau lần học đầu, trên cỡ mẫu ≥30 người** — founder chốt/
chỉnh con số này trước khi bắt đầu outreach VN; chưa đạt thì chưa đụng Show
HN / r/learnprogramming, tránh VN-first trượt dần thành "làm cả hai cùng lúc".

---

## Checkpoint 3 — Tuỳ biến AI qua BYOK + bước đệm kiếm tiền nhẹ

**Mô tả sản phẩm:** User muốn tuỳ biến AI (độ khó, độ dài, giọng văn, tự chia
segment) → nhập API key miễn phí của riêng họ (BYOK), dùng không giới hạn.
Thêm hỗ trợ nguồn web/blog (không chỉ YouTube).

**WP:**
- **WP3.1 — Luồng BYOK.** UI nhập/validate key, generate qua key riêng của
  user, tuyệt đối không đụng cache/quota chung. Đúng 4 nhánh UX ở
  `ai-personalization-economics.md` mục 4. Lỗi BYOK luôn hiện rõ, không tự
  fallback âm thầm sang ngân sách chung (mục 6.2).
- **WP3.2 — Cơ chế chia sẻ bản AI tuỳ biến + fix free-rider.** Cho phép user
  chọn `SHARED` cho bản BYOK của họ để người khác tái dùng free; xây sẵn ràng
  buộc `PAID_TIER` luôn `PRIVATE` (mục 5) **ngay cả khi chưa bán thật** — để
  không phải sửa lại data model khi tới Checkpoint 4.
- **WP3.3 — Hỗ trợ nguồn web/blog** (mục 6.8): fetch/parse trang, kèm
  `fetchedAt` để đánh dấu cache có thể cũ, rate-limit riêng theo domain nguồn.
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
- **WP4.1 — Tích hợp thanh toán thật.** Bán theo gói credit/subscription,
  **không** pay-per-generation lẻ tẻ (phí xử lý thanh toán ăn mòn doanh thu
  nhỏ lẻ — đã ghi chú ở `ai-personalization-economics.md` mục 7). Chỉ cắm vào
  nhánh UX #4 có sẵn, data model không đổi.
- **WP4.2 — Policy dọn dữ liệu** (mục 6.4): archive `Source`/`AIGeneration`
  không truy cập lâu ngày và không còn course công khai nào tham chiếu —
  cần thiết khi quy mô đủ lớn để chi phí lưu trữ đáng kể.
- **WP4.3 — Mở đăng ký công khai.** Gỡ giới hạn invite-only, chuyển từ cộng
  đồng hẹp sang public free (Vision giai đoạn 4).

**Điều kiện:** có bằng chứng retention + lan truyền ổn định ở quy mô nhỏ trước
khi mở public — không mở rộng khi tín hiệu ở checkpoint trước còn mơ hồ.

---

## Bảng tổng quan

| Checkpoint | Ai dùng được | Có AI? | Có thu phí? | Rủi ro chính nếu bỏ qua thứ tự |
|---|---|---|---|---|
| 0 | Chỉ founder | Không | Không | Pivot dở dang, nợ kỹ thuật dồn sang mọi checkpoint sau |
| 1 | Nhóm bạn bè | Không | Donate thụ động (WP1.8) | Ra mắt AI/thu phí trước khi core ổn định → phân tán nguồn lực, chưa có gì để giữ chân user |
| 2 | Cộng đồng hẹp VN | Có (2 recipe mặc định, free) | Donate thụ động | Bỏ qua rate-limit/alerting (6.1, 6.7) → cost-DoS âm thầm trước khi kịp phát hiện |
| 3 | Cộng đồng hẹp (mở rộng) | Có (tuỳ biến qua BYOK) | Donate thụ động | Không xây sẵn fix free-rider (mục 5) → `PAID_TIER` tự triệt tiêu ngay khi bật ở Checkpoint 4 |
| 4 | Public | Có (đủ 3 tier) | Có (khi feature-pull thật) | Mở public/thu phí trước khi có tín hiệu retention thật → đốt chi phí hosting nhanh hơn doanh thu (mục 6.7) |
