# 📊 DATABASE SCHEMA & ĐỐI TƯỢNG QUA MỖI REQUEST

## I. TỔNG QUAN CƠ SỞ DỮ LIỆU

**Công nghệ:** PostgreSQL + Prisma ORM  
**File schema:** `prisma/schema.prisma`  
**File seed:** `prisma/seed.ts`

---

## II. CÁC BẢNG (TABLES) VÀ MỐI QUAN HỆ

### 1. `roles` — Vai trò người dùng
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | Int (PK, auto) | ID vai trò |
| `name` | VarChar(20) | Tên vai trò: `STUDENT`, `LECTURER`, `ADMIN` |

**Quan hệ:** 1:N → `users`

---

### 2. `users` — Người dùng
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BigInt (PK, auto) | ID người dùng |
| `email` | VarChar(255), UNIQUE | Email đăng nhập |
| `password_hash` | VarChar(255) | Mật khẩu đã hash (bcrypt) |
| `full_name` | VarChar(100) | Họ tên |
| `age` | Int? | Tuổi (nullable) |
| `role_id` | Int (FK → roles.id) | Vai trò |
| `status` | VarChar(20) | Trạng thái: `ACTIVE`, `INACTIVE` |
| `created_at` | Timestamp? | Ngày tạo |

**Quan hệ:**  
- N:1 → `roles` (qua `role_id`)  
- 1:N → `courses` (giảng viên sở hữu khóa học)  
- 1:N → `enrollments` (học viên đăng ký)  
- 1:N → `tokens` (token xác thực/khôi phục)

---

### 3. `tokens` — Token xác thực
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BigInt (PK, auto) | ID token |
| `user_id` | BigInt (FK → users.id, CASCADE) | Chủ sở hữu |
| `code` | UUID, UNIQUE | Mã token |
| `type` | VarChar(20) | Loại: `ACTIVATION`, `RECOVERY` |
| `expires_at` | Timestamp | Thời điểm hết hạn (24 giờ) |
| `is_used` | Boolean | Đã sử dụng chưa |

**Quan hệ:** N:1 → `users`

---

### 4. `courses` — Khóa học
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BigInt (PK, auto) | ID khóa học |
| `lecturer_id` | BigInt (FK → users.id) | Giảng viên sở hữu |
| `title` | VarChar(255) | Tiêu đề |
| `slug` | VarChar(255), UNIQUE | URL-friendly slug |
| `description` | Text? | Mô tả |
| `status` | VarChar(20) | Trạng thái: `DRAFT`, `PENDING`, `ACTIVE`, `REJECTED` |
| `reject_note` | Text? | Ghi chú từ chối (nếu có) |
| `submitted_at` | Timestamp? | Thời điểm gửi duyệt |

**Quan hệ:**  
- N:1 → `users` (lecturer)  
- 1:N → `chapters`  
- 1:N → `enrollments`

**Vòng đời trạng thái:**
```
DRAFT → PENDING → ACTIVE
              ↘ DRAFT (khi bị reject, kèm reject_note)
```

---

### 5. `chapters` — Chương (Section)
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BigInt (PK, auto) | ID chương |
| `course_id` | BigInt (FK → courses.id) | Khóa học chứa chương |
| `title` | VarChar(255) | Tiêu đề chương |
| `order_index` | Int | Thứ tự hiển thị |

**Quan hệ:** N:1 → `courses`, 1:N → `lessons`

---

### 6. `lessons` — Bài học
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BigInt (PK, auto) | ID bài học |
| `chapter_id` | BigInt (FK → chapters.id) | Chương chứa bài |
| `title` | VarChar(255) | Tiêu đề bài |
| `type` | VarChar(20) | Loại: `VIDEO`, `QUIZ` |
| `content_url` | VarChar(500)? | URL video YouTube hoặc JSON metadata |
| `order_index` | Int | Thứ tự hiển thị |

**Quan hệ:** N:1 → `chapters`, 1:N → `learning_progress`, 1:N → `questions`

---

### 7. `enrollments` — Đăng ký khóa học
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BigInt (PK, auto) | ID enrollment |
| `student_id` | BigInt (FK → users.id) | Học viên |
| `course_id` | BigInt (FK → courses.id) | Khóa học |
| `completion_rate` | Int | Tỉ lệ hoàn thành (0-100%) |
| `enrolled_at` | Timestamp? | Thời điểm đăng ký |

**Quan hệ:** N:1 → `users`, N:1 → `courses`, 1:N → `learning_progress`

---

### 8. `learning_progress` — Tiến độ học tập
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BigInt (PK, auto) | ID progress |
| `enrollment_id` | BigInt (FK → enrollments.id) | Enrollment tương ứng |
| `lesson_id` | BigInt (FK → lessons.id) | Bài học |
| `is_finished` | Boolean | Đã hoàn thành chưa |
| `video_last_position` | Int? | Vị trí video cuối cùng (giây) |
| `quiz_max_score` | Int? | Điểm quiz cao nhất |
| `quiz_start_time` | Timestamp? | Thời điểm bắt đầu quiz |
| `personal_note` | Text? | Ghi chú cá nhân |
| `quiz_question_ids` | Text? | JSON array các question ID cho quiz session |

**Quan hệ:** N:1 → `enrollments`, N:1 → `lessons`

---

### 9. `questions` — Câu hỏi quiz
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | BigInt (PK, auto) | ID câu hỏi |
| `lesson_id` | BigInt (FK → lessons.id) | Bài quiz chứa câu hỏi |
| `content` | Text | Nội dung câu hỏi |
| `answer_key` | VarChar(255)? | Đáp án đúng: `A`, `B`, `C`, `D` |
| `option_a` | VarChar(255) | Phương án A |
| `option_b` | VarChar(255) | Phương án B |
| `option_c` | VarChar(255) | Phương án C |
| `option_d` | VarChar(255) | Phương án D |

**Quan hệ:** N:1 → `lessons`

---

## III. BIỂU ĐỒ QUAN HỆ (ER)

```
roles ──1:N──> users ──1:N──> tokens
                │
                ├──1:N (lecturer)──> courses ──1:N──> chapters ──1:N──> lessons ──1:N──> questions
                │                       │                                    │
                └──1:N (student)──> enrollments ──1:N──> learning_progress ──┘
```

---

## IV. ĐỐI TƯỢNG ĐI QUA MỖI REQUEST (DATA FLOW)

### A. AUTH MODULE

| Request | Đối tượng DB được truy vấn | Ghi chú |
|---------|---------------------------|---------|
| `POST /auth/identify` | `users` (findByEmail) | Kiểm tra email tồn tại |
| `POST /auth/register` | `users` (deleteInactive, findByEmail, create/update), `roles` (findByName), `tokens` (revokeAll, create) | Lazy cleanup + tạo activation token |
| `POST /auth/activate` | `tokens` (findByCode, markAsUsed), `users` (findById, update status) | Kích hoạt tài khoản |
| `POST /auth/login` | `users` (findByEmail, update) | So sánh password, phát JWT |
| `POST /auth/logout` | Không truy vấn DB | Chỉ xóa cookie refreshToken |
| `POST /auth/forgot-password` | `users` (findByEmail), `tokens` (revokeAll, create) | Gửi email recovery |
| `POST /auth/reset-password` | `tokens` (findByCode, markAsUsed), `users` (findById, update password) | Đặt lại mật khẩu |
| `POST /auth/refresh` | `users` (findById) | Verify refresh JWT → tạo access JWT mới |
| `GET /auth/profile` | `users` (findById + role) | Lấy thông tin profile |
| `PUT /auth/profile` | `users` (findById, update) | Cập nhật họ tên, tuổi |
| `PUT /auth/change-password` | `users` (findById, update password) | Đổi mật khẩu |

### B. COURSE MODULE (Công khai)

| Request | Đối tượng DB | Ghi chú |
|---------|-------------|---------|
| `GET /courses` | `courses` (status=ACTIVE, search title) | Danh sách khóa học công khai |
| `GET /courses/:id` | `courses` + `chapters` + `lessons` + `users`(lecturer) + `enrollments` | Chi tiết khóa học |
| `POST /courses/:id/enroll` | `courses` (findActive), `enrollments` (find/create) | Đăng ký khóa học |
| `GET /courses/:id/enroll` | `enrollments` (findByStudentAndCourse) | Kiểm tra đã đăng ký |
| `GET /courses/enrolled` | `enrollments` + `courses` + `chapters` + `lessons` | DS khóa học đã đăng ký |
| `GET /courses/:id/lessons` | `courses` + `chapters` + `lessons` + `learning_progress` | DS bài học (kèm tiến độ) |

### C. LEARNING MODULE (Học viên)

| Request | Đối tượng DB | Ghi chú |
|---------|-------------|---------|
| `GET /lessons/:id/play` | `lessons`, `chapters`, `enrollments`, `learning_progress` | Lấy video context |
| `GET /lessons/:id/progress` | `learning_progress` (findByStudentAndLesson) | Tiến độ bài học |
| `POST /lessons/:id/progress` | `lessons`, `chapters`, `courses`, `enrollments`, `learning_progress` (create/update) | Cập nhật vị trí video |
| `GET /lessons/:id/notes` | `learning_progress` (personal_note) | Lấy ghi chú |
| `PUT /lessons/:id/notes` | `lessons`, `chapters`, `courses`, `enrollments`, `learning_progress` | Lưu ghi chú |
| `GET /lessons/:id/quiz` | `questions` (random 10) | Lấy câu hỏi quiz (ẩn đáp án) |
| `POST /lessons/:id/quiz/start` | `enrollments`, `learning_progress` (update startTime + questionIds), `questions` | Bắt đầu quiz session |
| `POST /lessons/:id/quiz/submit` | `learning_progress`, `questions` (findByIds) | Chấm điểm quiz |
| `GET /lessons/:id/quiz/results` | `learning_progress` | Kết quả quiz |

### D. MANAGEMENT MODULE (Giảng viên + Admin)

| Request | Đối tượng DB | Ghi chú |
|---------|-------------|---------|
| `GET /management/courses` | `courses` + `chapters` + `lessons` (thumbnail) | DS khóa học của giảng viên |
| `POST /management/courses` | `courses` (create) | Tạo khóa học draft |
| `GET /management/courses/:id/sections` | `courses`, `chapters` + `lessons` | Lấy cấu trúc sections |
| `POST /management/courses/:id/sections` | `courses` (check owner), `chapters` (create) | Tạo section mới |
| `PUT /management/sections/:id` | `chapters` (update) | Cập nhật section |
| `DELETE /management/sections/:id` | `chapters`, `lessons` (cascade delete) | Xóa section |
| `POST /management/sections/:id/lessons` | `lessons` (create) | Tạo bài học |
| `PUT /management/lessons/:id` | `lessons` (update) | Cập nhật bài học |
| `DELETE /management/lessons/:id` | `lessons` (delete) | Xóa bài học |
| `PUT /management/courses/:id/content` | `courses`, `chapters`, `lessons` (sync all) | Đồng bộ toàn bộ nội dung |
| `PATCH /management/courses/:id/publish` | `courses` + `chapters` + `lessons` (validate → update status) | Gửi duyệt |
| `GET /management/approval-queue` | `courses` (status=PENDING) + `users` | DS chờ duyệt (Admin) |
| `PATCH /management/courses/:id/moderate` | `courses` (update status) | Duyệt/Từ chối (Admin) |
| `GET /management/courses/:id/preview/lessons/:lessonId` | `lessons` + `chapters` + `courses` + `questions` | Xem trước bài học |
| `POST /management/quiz/parse` | Không truy vấn DB | Parse file Excel thành câu hỏi |
| `POST /management/lessons/:id/quiz/upload` | `questions` (deleteAll + createMany) | Upload quiz từ Excel |
| `POST /management/preview/progress` | `learning_progress` (hoặc mock nếu preview) | Track tiến độ preview |

---

## V. DỮ LIỆU MẪU (SEED DATA)

| Người dùng | Email | Vai trò | Mật khẩu |
|-----------|-------|---------|-----------|
| John Doe | john@gmail.com | STUDENT | password123 |
| Jack Smith | jack@gmail.com | LECTURER | password123 |
| TrongTin Admin | admin1@gmail.com | ADMIN | password123 |

| Khóa học | Trạng thái | Ghi chú |
|---------|-----------|---------|
| Nhập môn Java | ACTIVE | 1 chapter, 1 video + 1 quiz (10 câu) |
| Nhập môn C++ | PENDING | 1 chapter, 1 video + 1 quiz (10 câu) |
| Nhập môn Python | DRAFT | reject_note: "Thêm quiz chất lượng" |
