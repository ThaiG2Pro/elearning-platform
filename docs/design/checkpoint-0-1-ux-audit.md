# Audit UI/UX hiện tại — Checkpoint 0 & 1

> **Tài liệu liên quan**: `docs/VISION.md` (tầm nhìn), `docs/ROADMAP.md` (Checkpoint
> 0/1 mà audit này chi tiết hoá), `ARCHITECTURE_NOTES.md` (gap kỹ thuật gốc).
> Ghi lại 2026-08-06 qua 1 lượt audit code trực tiếp (không phải suy đoán).

## Kết luận chính

Trải nghiệm hiện tại đúng như `ARCHITECTURE_NOTES.md` mô tả: **một LMS
marketplace thu nhỏ** (giảng viên soạn → admin duyệt → học viên đăng ký), gần
như đối lập với Vision (course cá nhân từ link tự dán, không cần ai duyệt,
không xao nhãng, share ngay được). Cả 4 luồng lõi của Vision đều thiếu hoặc bị
mô hình marketplace che khuất.

## Gap theo từng luồng lõi

### (a) Tạo course cá nhân từ link — thiếu hoàn toàn
Tạo course hiện tại (`src/app/lecturer/courses/page.tsx:124-148`) chỉ tạo 1
course rỗng tên "Khóa học mới" — không có bước "dán link → tự parse
metadata". Sau đó phải vào `edit/page.tsx` tự thêm chương, thêm bài, dán URL
YouTube **từng bài một** thủ công (dòng 228-266). Không có khái niệm `Source`
(dedup theo URL) như thiết kế ở `ai-personalization-economics.md`.

**Cần làm:** form/modal "dán link đầu tiên" → gọi API parse metadata (oEmbed
YouTube hoặc tương đương) → tự tạo `Course` + `Chapter` mặc định + `Lesson`
đầu tiên trong 1 bước.

### (b) Trình học tập trung, không xao nhãng — mới ở mức tối thiểu
`YoutubePlayer.tsx` chỉ tắt `autoplay`/`rel`/`modestbranding` — vẫn là iframe
YouTube chuẩn, chưa có overlay chặn tương tác, chưa ẩn được UI phụ khi cần tập
trung, chưa có "chế độ chỉ video". Đây là mức tối thiểu, chưa phải "focus
mode" Vision mô tả.

**Cần làm:** thêm toggle "Chế độ tập trung" ẩn sidebar/header trong
`learn/page.tsx` (layout hiện tại đã tốt, giữ lại phần khung); cân nhắc bọc
thêm 1 lớp overlay kiểm soát thay vì dựa hoàn toàn vào chrome gốc của iframe
YouTube.

### (c) Theo dõi tiến độ — hạ tầng đúng hướng, chỉ cần đổi khóa
`LearnService`/`LearningProgressRepository`/`handleProgressUpdate` (trong
`learn/page.tsx:70-105`) về cơ bản ổn, **nên giữ lại**. Vấn đề duy nhất: gắn
chặt vào enrollment (`LearnController.ts:15-18` phụ thuộc
`EnrollmentRepository`) thay vì ownership cá nhân. Cũng chưa thấy
`completionRate`/`lastAccessedAt` được hiển thị nổi bật ở trang course-detail
(`src/app/courses/[id]/page.tsx`) — chỉ có ở `my-learning`.

**Cần làm:** đổi field khóa progress sang `ownerId`, đưa progress lên hiển thị
ở course-detail.

### (d) Share/invite link course — thiếu hoàn toàn, ưu tiên cao nhất
Không có `shareToken`, không có route public-view, không nút "Chia sẻ" ở bất
kỳ đâu trong UI. Người dùng ẩn danh nhận link chỉ thấy "Tham gia để đăng ký"
chung chung (`courses/[id]/page.tsx:157-192`) — không phải "dùng thử ngay".

**Cần làm:** sinh `shareToken`/slug ổn định (tách khỏi id số tăng dần, để
tránh gãy link khi migrate — đúng nguyên tắc #3 ở `ROADMAP.md`); trang xem
course công khai không cần đăng nhập + nút "Sao chép về học".

## Tàn dư marketplace cần gỡ (Checkpoint 0, WP0.2)

| File:dòng | Nội dung cần gỡ |
|---|---|
| `src/app/courses/[id]/page.tsx:157-192` | Nhánh UI theo `role === 'STUDENT'` (nút "Đăng ký học") |
| `src/app/courses/[id]/page.tsx:68-83` | `handleEnroll` gọi `enrollCourse` |
| `src/modules/course-management/controllers/EnrollmentController.ts` | Toàn bộ luồng enroll giữa 2 user — thay bằng ownership |
| `src/app/admin/approval-queue/page.tsx` | Toàn bộ trang duyệt — non-goal theo Vision mục 8 |
| `src/app/lecturer/courses/[id]/edit/page.tsx:69-77,119-135,353-367,720-729` | Vòng đời Draft→Pending→Active + nút "Gửi duyệt" + `readOnly` sau duyệt |
| `src/components/Header.tsx:46-54,125-138` | Menu tách theo role LECTURER/ADMIN |
| `src/components/CourseCard.tsx:9-13,16`, `lecturer/courses/page.tsx:262-273` | Badge trạng thái publish-workflow |
| `src/app/page.tsx:96-104` | Nút "Tạo khóa học" chỉ hiện với role LECTURER |

## Vấn đề chất lượng UI/UX chung (không gắn riêng luồng nào)

- `console.log` còn sót trong production code: `learn/page.tsx` (80, 95, 191,
  197), `YoutubePlayer.tsx` (26, 33, 52, 76) — dọn trước khi demo cho người ngoài.
- Dùng `alert()`/`confirm()`/`prompt()` native thay vì `Toast` component đã có
  sẵn trong repo: `edit/page.tsx:128,215`, `approval-queue/page.tsx:73,79,82`.
- `learn/page.tsx` thiếu nhánh UI riêng cho course chưa có bài học nào
  (`lessons.length === 0` chỉ set `appState('idle')`, không render gì rõ ràng).
- `edit/page.tsx` không responsive cho mobile (layout 2 cột cứng, không có
  breakpoint stack dọc — khác các trang khác đã dùng `grid-cols-1 md:...`).
- `YoutubePlayer.tsx` dùng polling `setInterval` thủ công thay vì sự kiện
  chuẩn của YouTube IFrame API — dễ vỡ khi đổi lesson nhanh; thiếu xử lý lỗi
  khi video bị chặn nhúng.

## Ưu tiên đề xuất

1. Share/invite link (d) — chưa có gì cả, và là kênh đo tín hiệu retention/lan
   truyền chính của Vision, không thể hoãn.
2. Gỡ enrollment/approval khỏi luồng chính (đi kèm WP0.2 pivot data model).
3. Flow tạo course từ link (a) — thay thế UI tạo course rỗng hiện tại.
4. Focus mode (b) và dọn nợ UI nhỏ (console.log, alert native) — làm song
   song, không chặn đường các mục trên.
