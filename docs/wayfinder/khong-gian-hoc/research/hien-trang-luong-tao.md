# Hiện trạng luồng tạo course/chapter/lesson

> Ticket: `docs/wayfinder/khong-gian-hoc/tickets/01-hien-trang-luong-tao.md`
> Phạm vi khảo sát: `src/app`, `src/modules/course-management`, `src/lib`, `prisma/`.

## Tóm tắt cho người ra quyết định

- **Luồng "dán URL → tạo course" ĐÃ TỒN TẠI** và làm đúng 1 request: `POST /api/v1/management/courses/from-link` → `ContentManagementService.createCourseFromLink` (`src/modules/course-management/services/ContentManagementService.ts:128-182`) tự tạo `sources` + `courses` + 1 chapter `"Chương 1"` + 1 lesson trong một transaction. Vấn đề không phải "chưa có", mà là nó **kết thúc ở trang editor** (`src/app/my-courses/page.tsx:114` push về `/my-courses/{id}/edit`) chứ không phải trang xem video.
- **"Chương mặc định ẩn" trên thực tế đã được cài đặt 2 lần ở tầng service**, cùng chuỗi cứng `'Chương 1'`: `ContentManagementService.ts:101-107` (tạo course rỗng) và `ContentManagementService.ts:165-167` (tạo từ link). Nghĩa là phương án (a) của ticket 02 đã có tiền lệ chạy trong production, chỉ chưa được "ẩn" ở UI.
- **Chapter bắt buộc ở cả 3 tầng**: DB `lessons.chapter_id BIGINT NOT NULL` + FK `ON DELETE RESTRICT` (`prisma/migrations/20251225073732_init_system_schema/migration.sql:64,125`; `prisma/schema.prisma:113,119`); API — không có endpoint tạo lesson nào nhận `courseId`, chỉ có `POST /management/sections/{id}/lessons` (chapterId nằm trong URL); UI — editor có empty-state chặn cứng "Chưa có chương nào → Tạo chương đầu tiên" (`src/app/my-courses/[id]/edit/page.tsx:803-822`). Thêm `PublishingPolicy.validateDeletionEligibility` cấm xóa chương cuối cùng (`src/modules/course-management/domain/PublishingPolicy.ts:7-11`).
- **Chi phí migration nullable ở tầng đọc là thấp hơn dự đoán**: mọi truy vấn lesson đều đi qua quan hệ `chapter → course` (`LearnService.ts:104`, `NoteService.ts:67`, `QuizService.ts:71,303`, `LessonRepository.syncLessons:42-46`) — đây là các chỗ sẽ vỡ nếu `chapter_id` nullable. Ngược lại **trang learn đã tolerant với chapter rỗng**: nó fallback `chapterId || 'default'` và `chapterTitle || 'Nội dung khóa học'` (`src/app/courses/[id]/learn/page.tsx:494-511`).
- **Đếm bước**: từ "có 1 URL YouTube" đến "video xem được" — đường from-link = **3 thao tác user / 1 API ghi**; đường thủ công qua editor = **7-9 thao tác user / 3-4 API ghi** (chi tiết ở mục 1). Nút thắt lớn nhất của đường thủ công: `handleQuickAddLesson` luôn gửi `videoUrl: ''` (`src/app/my-courses/[id]/edit/page.tsx:334-338`) nên **bắt buộc** phải có bước "chọn bài → dán link → Lưu bài học" thứ hai.
- **Bảng `sources` gần như là write-only**: chỉ có đúng 1 chỗ ghi trong app (`ContentManagementService.ts:137-149`) + seed (`prisma/seed.ts:30-42`). `metadata` chỉ chứa `{"thumbnailUrl": "..."}` và **không có bất kỳ chỗ nào đọc lại** — thumbnail thực tế được suy ra từ `content_url` bằng regex (`src/modules/shared/utils/VideoThumbnailUtil.ts:28-52`). `normalized_url` chỉ dùng để dedup, không dùng để render.
- **Lesson tạo qua editor thủ công KHÔNG bao giờ có `source_id`** (`ContentManagementService.createLesson:363-371` không set `source_id`; `LessonRepository.save/syncLessons` cũng không) → dữ liệu `sources` hiện đang phân mảnh: chỉ course tạo-từ-link và seed mới có.
- **Clone giả định cứng cấu trúc 2 tầng**: `CourseRepository.cloneForOwner` (`src/modules/course-management/repositories/CourseRepository.ts:294-366`) lặp `for chapter → for lesson`, tạo chapter mới rồi mới tạo lesson. Nếu chuyển sang `chapter_id` nullable thì vòng lặp này **sẽ âm thầm bỏ rơi mọi lesson không thuộc chapter nào** — đây là rủi ro mất dữ liệu cụ thể nhất của phương án (b).

---

## 1. Luồng tạo/sửa course → chapter → lesson hiện tại

### 1.1 Bản đồ màn hình → API → service → repository

| Màn hình (app route) | Hành động | API endpoint | Service method |
|---|---|---|---|
| `src/app/my-courses/page.tsx` | "Tạo khóa học" (rỗng) — `handleCreateBlank:87-104` | `POST /api/v1/management/courses` (`src/app/api/v1/management/courses/route.ts:47-70`) | `ManagementController.createCourse:20` → `ContentManagementService.createCourse:84-121` |
| `src/app/my-courses/page.tsx` | "Tạo từ link YouTube" — `handleCreateFromLink:106-118`, modal ở `:373-386` | `POST /api/v1/management/courses/from-link` (`src/app/api/v1/management/courses/from-link/route.ts:9-35`) | `ManagementController.createCourseFromLink:24` → `ContentManagementService.createCourseFromLink:128-182` |
| `src/app/my-courses/[id]/edit/page.tsx` | Load cấu trúc — `fetchCourseStructure:139-165` | `GET /api/v1/courses/{id}` (`src/app/api/v1/courses/[id]/route.ts:5-45`) | `CourseController.getCourseDetail` → `CourseService.getCourseDetail:29-84` |
| ↑ | "Thêm chương mới" — `handleCreateChapter:249-279` | `POST /api/v1/management/courses/{id}/sections` (`.../[id]/sections/route.ts:65-112`) | `ContentManagementService.createSection:333-346` |
| ↑ | Sửa/xóa chương — `handleUpdateChapter:281`, `handleDeleteChapter:304` | `PUT`/`DELETE /api/v1/management/sections/{id}` | `ContentManagementService.updateSection:348-358` / `CourseManagementService.deleteSection:17-31` |
| ↑ | "Thêm bài học" — `handleQuickAddLesson:324-366` | `POST /api/v1/management/sections/{id}/lessons` (`.../sections/[id]/lessons/route.ts:6-41`) | `ContentManagementService.createLesson:360-373` |
| ↑ | "Lưu bài học" (dán URL) — `handleSaveLesson:489-517` | `PUT /api/v1/management/lessons/{id}` (`.../lessons/[id]/route.ts:6-40`) | `ContentManagementService.updateLesson:375-386` |
| ↑ | Sắp xếp chương/bài — `handleMoveChapter:396`, `handleMoveLesson:436` | `PUT /management/sections/{id}` + `PUT /management/lessons/{id}` | như trên |
| ↑ | (đường bulk, không dùng bởi UI editor hiện tại) | `PUT /api/v1/management/courses/{id}/content` | `CourseManagementService.syncCourseContent:33-139` → `LessonRepository.syncLessons:40-85` |
| `src/app/courses/[id]/learn/page.tsx` | Xem video | `GET /api/v1/courses/{id}/lessons` (`.../[id]/lessons/route.ts:6-87`) | `CourseService.getCourseDetail` + `LearningProgressRepository` |

Client API layer: `src/lib/management.ts` (`createCourse:86`, `createSection:138`, `createLesson:196`, `updateLesson:213`, `createCourseFromLink:344`).

### 1.2 Đếm bước: từ "user có 1 URL YouTube" → "video xem được trong /courses/{id}/learn"

**Đường A — "Tạo khóa học từ link" (đường ngắn nhất hiện có):**

1. Vào `/my-courses`, mở modal "Tạo khóa học từ link YouTube" (`src/app/my-courses/page.tsx:373`).
2. Dán URL, bấm "Tạo khóa học" → 1 request ghi: `POST /management/courses/from-link`.
3. App redirect sang **trang editor** `/my-courses/{id}/edit` (`src/app/my-courses/page.tsx:114`) — **không phải** trang learn.
4. Trong editor, bấm nút chuyển sang `/courses/{courseId}/learn` (`src/app/my-courses/[id]/edit/page.tsx:740`).

→ **4 bước UI, 1 API ghi.** Server-side trong 1 transaction đã tạo đủ: source → course → chapter "Chương 1" → lesson (`ContentManagementService.ts:155-181`). Ràng buộc: chỉ chấp nhận YouTube (`ContentManagementService.ts:131-133`), và cần gọi được `youtube.com/oembed` (`YouTubeOEmbedAdapter.fetchOEmbed:32-44`), nếu fail → 422 `YOUTUBE_METADATA_FETCH_FAILED` và **không có fallback nào** — course không được tạo.

**Đường B — Tạo course rỗng rồi dán link (đường mà UI mặc định hướng tới):**

1. `/my-courses` → modal "Tạo khóa học mới", nhập tên (`page.tsx:334-355`).
2. `POST /management/courses` → server tự tạo "Chương 1" + "Bài 1" với `content_url: ''` (`ContentManagementService.ts:101-117`).
3. Redirect editor; editor auto-select "Bài 1" (`edit/page.tsx:148-154`).
4. Dán URL vào ô "Đường dẫn Video (YouTube)" (`edit/page.tsx` ~ dòng 1130-1140).
5. Bấm "Lưu bài học" → `PUT /management/lessons/{id}`.
6. Bấm sang `/courses/{id}/learn` (`edit/page.tsx:740`).

→ **6 bước UI, 2 API ghi.**

**Đường C — Thêm 1 video vào course đã có (trường hợp phổ biến nhất khi dùng lâu dài):**

1. Mở `/my-courses/{id}/edit`.
2. (Nếu chưa có chương) bấm "Tạo chương đầu tiên" → `POST .../sections` — **bắt buộc**, xem mục 2.
3. Bấm icon "Thêm bài học" trên chương (`edit/page.tsx:866-875`).
4. Gõ tên bài, bấm xác nhận → `POST /management/sections/{id}/lessons` với `videoUrl: ''` cứng (`edit/page.tsx:334-338`).
5. Bài học được auto-select (`edit/page.tsx:359` `selectLesson(newLesson)`).
6. Dán URL vào ô video.
7. Bấm "Lưu bài học" → `PUT /management/lessons/{id}`.
8. Chuyển sang `/courses/{id}/learn`.
9. Chọn đúng bài trong sidebar để phát.

→ **7-9 bước UI, 2-3 API ghi**, dù về mặt dữ liệu chỉ cần 1 URL.

**Ghi chú kỹ thuật đáng lưu ý:** route tạo lesson có comment nói rằng trước đây mọi lesson tạo qua form đều mất video vì lệch tên trường `videoUrl` vs `contentUrl`, đã vá bằng fallback (`src/app/api/v1/management/sections/[id]/lessons/route.ts:27-30`; tương tự ở PUT: `src/app/api/v1/management/lessons/[id]/route.ts:24-28`). Đây là bằng chứng luồng nhiều-bước đang tự sinh ra lỗi.

---

## 2. Chapter bắt buộc ở tầng nào

### 2.1 Tầng DB — bắt buộc cứng

- `prisma/schema.prisma:113`: `chapter_id BigInt @map("chapter_id")` — **không có `?`** ⇒ NOT NULL.
- `prisma/schema.prisma:119`: `chapter chapters @relation(fields: [chapter_id], references: [id])` — quan hệ bắt buộc.
- SQL gốc: `prisma/migrations/20251225073732_init_system_schema/migration.sql:64` (`"chapter_id" BIGINT NOT NULL`) và `:125` (FK `ON DELETE RESTRICT ON UPDATE CASCADE`).
- Đối chiếu: `lessons.source_id` **là** nullable (`schema.prisma:114`, FK `ON DELETE SET NULL` — `migrations/20260807095000_.../migration.sql:55`), tức repo đã có tiền lệ cột quan hệ nullable.
- `chapters.course_id` cũng NOT NULL (`schema.prisma:102`) — chapter không thể tồn tại độc lập.

### 2.2 Tầng service/domain — bắt buộc gián tiếp + 1 policy chặn

- Không có method nào cho phép tạo lesson từ `courseId`. `ContentManagementService.createLesson(userId, sectionId, dto)` (`:360-373`) nhận `sectionId` và set `chapter_id: sectionId` trực tiếp.
- `LessonRepository.save` (`:87-94`) và `syncLessons` (`:75-83`) đều bắt buộc `chapter_id: lesson.chapterId`; domain `Lesson` khai báo `chapterId: bigint` không nullable (`src/modules/course-management/domain/Lesson.ts:9`).
- `CourseManagementService.syncCourseContent` ép `BigInt(secId || lessonDto.chapterId)` (`:65,87,105,126`) — không có nhánh nào cho lesson không chapter.
- Ownership resolve **đi xuyên chapter**: `getOwnerIdForLesson` dùng `lesson.chapter.course.owner_id` (`ContentManagementService.ts:295-302`); tương tự `LearnService.findCourseIdByLesson:101-110`, `NoteService.ts:67-74`, `QuizService.ts:71-76, 303-315`. **Đây là danh sách call-site sẽ phải sửa nếu chapter_id nullable.**
- `PublishingPolicy.validateDeletionEligibility` (`src/modules/course-management/domain/PublishingPolicy.ts:7-11`) ném `CANNOT_DELETE_LAST_SECTION` khi `currentCount <= 1` — course **luôn** phải còn ≥ 1 chương (gọi từ `CourseManagementService.deleteSection:26-30`). Có test: `src/modules/course-management/domain/__tests__/PublishingPolicy.test.ts`.

### 2.3 Tầng UI — bắt buộc rõ ràng

- Editor: khi `course.chapters.length === 0` render empty-state "Chưa có chương nào / Bắt đầu bằng cách tạo chương đầu tiên" + nút CTA (`src/app/my-courses/[id]/edit/page.tsx:803-822`); **không có đường nào để thêm bài học khi chưa có chương** — nút "Thêm bài học" chỉ tồn tại bên trong khối render của từng chapter (`:866-875`).
- Nút "Thêm chương mới" ở cuối cây (`:1026-1037`).
- Ngược lại, **trang learn thì KHÔNG bắt buộc**: `groupedChapters` fallback `lesson.chapterId || 'default'` và `lesson.chapterTitle || 'Nội dung khóa học'` (`src/app/courses/[id]/learn/page.tsx:494-511`); type `Lesson` khai báo `chapterId?/chapterTitle?/chapterOrder?` đều optional (`src/types/course.types.ts:48-50`).

### 2.4 Đã có "chương mặc định" chưa? — CÓ, 2 chỗ

| Vị trí | Nội dung |
|---|---|
| `ContentManagementService.createCourse` — `src/modules/course-management/services/ContentManagementService.ts:101-117` | Tự tạo `chapters{title: 'Chương 1', order_index: 1}` **và** `lessons{title: 'Bài 1', content_url: '', order_index: 1}` trong cùng transaction với course |
| `ContentManagementService.createCourseFromLink` — `:165-178` | Tự tạo `chapters{title: 'Chương 1', order_index: 1}` + lesson gắn `source_id` |
| (UI gợi ý, không phải auto) `src/app/my-courses/[id]/edit/page.tsx:814` | Prefill `'Chương 1: Tổng quan'` cho form tạo chương đầu tiên |
| (UI đặt tên mặc định) `edit/page.tsx:254` | `Chương ${nextChapterIndex}` khi user để trống tên |

⇒ Khái niệm "chương mặc định ẩn" **không phải điều mới**; hiện tại nó chỉ đang *hiện* ra trong sidebar editor. ADR liên quan: `docs/adr/0001-mot-container-duy-nhat-cho-moi-hinh-thai-noi-dung-hoc.md:12`.

---

## 3. Bảng `sources`

### 3.1 Schema

`prisma/schema.prisma:53-64`:
```
url            VARCHAR(1000) UNIQUE
normalized_url VARCHAR(1000) UNIQUE
title          VARCHAR(255)?
type           VARCHAR(50)
metadata       TEXT?
created_at     TIMESTAMP default now()
```
Được thêm ở `prisma/migrations/20260807095000_pivot_personal_courses_and_simplify_status/migration.sql:24-55` cùng với `lessons.source_id`.

### 3.2 Nơi GHI (chỉ 2, kể cả seed)

1. `ContentManagementService.createCourseFromLink` — `src/modules/course-management/services/ContentManagementService.ts:137-149`:
   - `findUnique({ where: { normalized_url } })` trước; nếu chưa có mới `create` với `type: 'YOUTUBE'`, `metadata: JSON.stringify({ thumbnailUrl: meta.thumbnailUrl })`.
2. `prisma/seed.ts:30-42` — `upsertVideoSource`, ghi `type: 'VIDEO'` (**lệch giá trị `type` so với service: `'VIDEO'` vs `'YOUTUBE'`**) và **không ghi `metadata`**.

**Không có chỗ nào khác ghi.** Cụ thể `ContentManagementService.createLesson:363-371`, `updateLesson:378-385`, `LessonRepository.save:87-94`, `LessonRepository.syncLessons:75-83` đều **không** đụng `source_id` ⇒ mọi lesson tạo/sửa qua editor có `source_id = NULL`.

### 3.3 Nơi ĐỌC

- `sources` chỉ được đọc đúng 1 lần, để dedup: `ContentManagementService.ts:137` (`findUnique by normalized_url`), rồi lấy `source.title` làm tiêu đề course/lesson (`:151, 159, 173`).
- `lesson.source_id` chỉ được đọc đúng 1 lần: `CourseRepository.cloneForOwner:341` để copy nguyên giá trị sang lesson clone.
- **Không có API/DTO/UI nào trả `source` hay `metadata` ra ngoài.** `CourseDetailDto`, `ContentDto`, `CourseListDto` không có trường source; không `include: { source: true }` ở bất cứ đâu.

### 3.4 `metadata` thực tế chứa gì

Chỉ đúng một hình dạng: `{"thumbnailUrl":"https://i.ytimg.com/..."}` (`ContentManagementService.ts:146`). Rows từ seed thì `metadata = NULL`. **Chưa bao giờ được parse lại** (grep `metadata` toàn repo: chỉ 3 hit trong `src` là comment + dòng ghi này + `src/app/layout.tsx` Next metadata).

Thumbnail hiển thị thực tế **không dùng `sources.metadata`**, mà suy ra từ `content_url` bằng regex:
- `VideoThumbnailUtil.findFirstVideoUrl` (`src/modules/shared/utils/VideoThumbnailUtil.ts:5-23`) → `deriveThumbnailFromVideoUrl` (`:28-52`) → `https://img.youtube.com/vi/{id}/0.jpg`.
- Gọi từ `ContentManagementService.getOwnedCourses:70-73`, `getPublicCourseByToken:224`, `CourseService.getCourseDetail:75-79`, `CourseRepository.getCourseThumbnailUrl:154-157`, `OwnedCoursesRepository.ts:85`.

### 3.5 Normalize URL YouTube

`src/shared/adapters/YouTubeOEmbedAdapter.ts`:
- `ID_PATTERN` (`:14`): `/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/`
- `isYouTubeUrl` (`:16-18`), `extractVideoId` (`:20-23`).
- `normalize(url)` (`:26-30`): trích `videoId` → trả `https://www.youtube.com/watch?v=${videoId}`; **nếu không match thì trả `url.trim()` nguyên xi** ⇒ URL lạ vẫn có thể vào `normalized_url` ở dạng thô (thực tế bị chặn trước bởi `isYouTubeUrl` ở `ContentManagementService.ts:131`).

Regex này bị **sao chép nhiều lần** trong repo, không share code:
1. `YouTubeOEmbedAdapter.ts:14`;
2. `prisma/seed.ts:17-22` (bản copy có comment giải thích lý do — ts-node ESM không resolve import từ `src/`);
3. `VideoThumbnailUtil.deriveThumbnailFromVideoUrl:31` (bản copy để lấy thumbnail);
4. Bản thứ tư ở client: `getYouTubeVideoId` / `isYouTubeUrl` trong `src/app/courses/[id]/learn/page.tsx:64-79`, cộng `extractYoutubeId` dùng để validate ô nhập trong editor (`src/app/my-courses/[id]/edit/page.tsx` ~ dòng 1139).

⇒ Nếu làm luồng paste-URL mới, **normalize logic cần được gom về một chỗ**, hiện đang có ≥4 bản.

---

## 4. Share / clone

### 4.1 Luồng share_token

- Sinh token: `CourseRepository.ensureShareToken` (`src/modules/course-management/repositories/CourseRepository.ts:198-222`) — `randomBytes(10).toString('base64url')`, lazy (tạo ở lần request đầu), retry 5 lần khi đụng unique (`courses.share_token` UNIQUE, `prisma/schema.prisma:76`).
- Owner-only qua `ContentManagementService.getOrCreateShareLink:185-191` (`AccessControlPolicy.validateOwnership`), endpoint `POST/GET /api/v1/management/courses/{id}/share`; thu hồi: `revokeShareLink:194-200` → `clearShareToken:229-234`.
- Đọc công khai: `GET /api/v1/courses/share/{token}` (`src/app/api/v1/courses/share/[token]/route.ts:10-25`) → `getPublicCourseByToken:209-236` → `CourseRepository.findByShareToken:247-286` (chỉ trả course `status: 'ACTIVE'`).
- Trang public: `src/app/share/[token]/page.tsx` — render **theo chapter**: `course.chapters.map(chapter => ...chapter.lessons.map(...))` (`:144-150`), tức DTO share cũng là cấu trúc 2 tầng cứng (`PublicChapterDto`/`PublicLessonDto` ở `ContentManagementService.ts:213-222`).
- "Sao chép về học": `src/app/share/[token]/page.tsx:71-72` → `POST /api/v1/courses/share/{token}/copy` (`src/app/api/v1/courses/share/[token]/copy/route.ts:10-31`) → `ContentManagementService.cloneSharedCourse:239-244` → `CourseRepository.cloneForOwner`. Sau khi copy redirect thẳng tới `/courses/{courseId}/learn`.

### 4.2 `cloneForOwner` copy cấu trúc thế nào

`src/modules/course-management/repositories/CourseRepository.ts:294-366`:

1. Dedup trước: tìm course có `(owner_id, cloned_from_course_id)` (`:299-303`), có thì trả luôn id cũ.
2. Đọc nguồn: `findUnique({ include: { chapters: { include: { lessons: true }, orderBy: { order_index: 'asc' } } } })` (`:305-308`) — **truy vấn này chỉ lấy lesson qua chapter**.
3. Trong transaction (`:316-352`): tạo `courses` mới (`cloned_from_course_id: courseId`), rồi **vòng lặp lồng**:
   - `for (const chapter of source.chapters)` → `tx.chapters.create({ course_id: created.id, title, order_index })` (`:328-335`);
   - `for (const lesson of chapter.lessons)` → `tx.lessons.create({ chapter_id: newChapter.id, source_id: lesson.source_id, title, type, content_url, order_index })` (`:337-348`).
4. Race-safe qua unique `(owner_id, cloned_from_course_id)` (`prisma/schema.prisma:96`, migration `20260807150000_clone_dedup_guard`), bắt `P2002` và trả clone của request thắng (`:353-364`).

### 4.3 Giả định về chapter trong clone (rủi ro cụ thể)

- **Lesson chỉ được duyệt qua `chapter.lessons`** — nếu tồn tại lesson `chapter_id = NULL` (phương án nullable), `cloneForOwner` sẽ **im lặng bỏ qua**, tạo ra bản clone thiếu bài mà không lỗi. Cùng vấn đề với `findByShareToken:260-272` (trang share sẽ không hiển thị các bài đó) và `getPublicCourseByToken:213-222`.
- Các chỗ đọc khác cũng cùng giả định và cùng rủi ro: `CourseRepository.findByIdWithFullStructure:44-93`, `getCourseThumbnailUrl:132-164`, `GET /api/v1/courses/[id]/lessons` (`route.ts:49-71`, lồng `for chapter → for lesson` để phẳng hóa), `ContentManagementService.getOwnedCourses:50-63`, `OwnedCoursesRepository.ts:41,67-68`, `DataExportRepository.ts:15`, `VideoThumbnailUtil.findFirstVideoUrl:5-23`.
- Ngoại lệ (đã không phụ thuộc chapter, dùng filter quan hệ nên hoạt động được nếu chapter optional với chút sửa): `LearnService.getCourseProgress` dùng `where: { chapter: { course_id: courseId } }` (`LearnService.ts:84-87`).
- Clone **không đụng bảng `sources`**: chỉ copy `source_id` sang lesson mới (`:341`) ⇒ nhiều course cùng trỏ về 1 `sources` row — đúng thiết kế dedup, và cũng có nghĩa `sources` an toàn nếu chuyển chapter sang nullable.
- Clone **không copy** `questions` (quiz), `notes`, `learning_progress` — clone của lesson QUIZ sẽ rỗng câu hỏi (đối chiếu: `ContentManagementService.deleteLesson:395-400` và `SectionRepository.deleteWithLessons:33-44` cho thấy các bảng này không cascade).

### 4.4 Hệ quả cho quyết định ticket 02

- Phương án **(a) chương mặc định ẩn**: gần như zero-risk — `ContentManagementService.createCourse:101` và `createCourseFromLink:165` đã tạo sẵn "Chương 1"; chỉ cần ẩn tầng chương ở `edit/page.tsx` và bỏ empty-state `:803-822`. `cloneForOwner`, share DTO, mọi query hiện tại giữ nguyên. Chi phí chính: chương ẩn vẫn phải tồn tại → `PublishingPolicy` cấm-xóa-chương-cuối vẫn cần, và dữ liệu vẫn có "rác" khái niệm.
- Phương án **(b) `chapter_id` nullable**: cần migration + sửa tối thiểu 10 điểm đọc liệt kê ở 4.3, trong đó `cloneForOwner:328-348` và `GET /courses/[id]/lessons:49-71` là hai chỗ *fail-silent* (mất dữ liệu/mất bài, không ném lỗi) nên là rủi ro cao nhất; bù lại phía learn page đã tolerant sẵn (`learn/page.tsx:494-511`) và `types/course.types.ts:48-50` đã khai optional.
