# 🔧 BACKEND — GIẢI THÍCH CÁC COMPONENT

## I. KIẾN TRÚC TỔNG QUAN

```
Request HTTP → API Route (src/app/api/v1/...) → Controller → Service → Domain/Policy → Repository → Prisma → DB
                    ↑ Middleware (auth.ts)                                                    ↑ Adapter (Email/YouTube/Excel)
```

**Kiến trúc 3 lớp:** Controller → Service → Domain (+ Repository cho persistence)

---

## II. CÁC LỚP THEO THỨ TỰ

### A. API ROUTES — `src/app/api/v1/**`
**Vai trò:** Điểm vào HTTP, parse request, gọi Controller, trả response JSON + error code.

| File Route | Method | Mô tả |
|-----------|--------|-------|
| `src/app/api/v1/auth/identify/route.ts` | POST | Xác định email → LOGIN hay REGISTER |
| `src/app/api/v1/auth/register/route.ts` | POST | Đăng ký tài khoản mới |
| `src/app/api/v1/auth/activate/route.ts` | POST | Kích hoạt tài khoản qua token |
| `src/app/api/v1/auth/login/route.ts` | POST | Đăng nhập, set cookie refreshToken |
| `src/app/api/v1/auth/logout/route.ts` | POST | Xóa cookie refreshToken |
| `src/app/api/v1/auth/refresh/route.ts` | POST | Refresh JWT access token |
| `src/app/api/v1/auth/forgot-password/route.ts` | POST | Yêu cầu reset mật khẩu |
| `src/app/api/v1/auth/reset-password/route.ts` | POST | Đặt lại mật khẩu |
| `src/app/api/v1/auth/profile/route.ts` | GET, PUT | Lấy/Cập nhật profile |
| `src/app/api/v1/auth/change-password/route.ts` | PUT | Đổi mật khẩu |
| `src/app/api/v1/courses/route.ts` | GET | Danh sách khóa học công khai |
| `src/app/api/v1/courses/[id]/route.ts` | GET | Chi tiết khóa học |
| `src/app/api/v1/courses/[id]/enroll/route.ts` | GET, POST | Kiểm tra/Đăng ký khóa học |
| `src/app/api/v1/courses/enrolled/route.ts` | GET | DS khóa học đã đăng ký |
| `src/app/api/v1/courses/[id]/lessons/route.ts` | GET | DS bài học (kèm tiến độ) |
| `src/app/api/v1/lessons/[id]/play/route.ts` | GET | Lấy video context |
| `src/app/api/v1/lessons/[id]/progress/route.ts` | GET, POST | Lấy/Cập nhật tiến độ |
| `src/app/api/v1/lessons/[id]/notes/route.ts` | GET, PUT | Lấy/Lưu ghi chú |
| `src/app/api/v1/lessons/[id]/quiz/route.ts` | GET | Lấy quiz questions |
| `src/app/api/v1/lessons/[id]/quiz/start/route.ts` | POST | Bắt đầu quiz session |
| `src/app/api/v1/lessons/[id]/quiz/submit/route.ts` | POST | Nộp bài quiz |
| `src/app/api/v1/lessons/[id]/quiz/results/route.ts` | GET | Kết quả quiz |
| `src/app/api/v1/management/courses/route.ts` | GET, POST | DS/Tạo khóa học (Lecturer) |
| `src/app/api/v1/management/courses/[id]/sections/route.ts` | GET, POST | Lấy/Tạo section |
| `src/app/api/v1/management/courses/[id]/content/route.ts` | PUT | Đồng bộ nội dung khóa học |
| `src/app/api/v1/management/courses/[id]/publish/route.ts` | PATCH | Gửi duyệt khóa học |
| `src/app/api/v1/management/courses/[id]/moderate/route.ts` | PATCH | Duyệt/Từ chối (Admin) |
| `src/app/api/v1/management/courses/[id]/preview/lessons/[lessonId]/route.ts` | GET | Xem trước bài học |
| `src/app/api/v1/management/sections/[id]/route.ts` | PUT, DELETE | Cập nhật/Xóa section |
| `src/app/api/v1/management/sections/[id]/lessons/route.ts` | POST | Tạo bài học trong section |
| `src/app/api/v1/management/lessons/[id]/route.ts` | PUT, DELETE | Cập nhật/Xóa bài học |
| `src/app/api/v1/management/lessons/[id]/quiz/upload/route.ts` | POST | Upload quiz Excel |
| `src/app/api/v1/management/quiz/parse/route.ts` | POST | Parse quiz Excel (preview) |
| `src/app/api/v1/management/preview/progress/route.ts` | POST | Track tiến độ preview |

---

### B. MIDDLEWARE — `src/shared/middleware/auth.ts`
**Vai trò:** Extract JWT từ header `Authorization: Bearer <token>` → trả về userId hoặc user object.

| Hàm | Mô tả |
|-----|-------|
| `getUserIdFromRequest(request)` | Trả về `bigint \| null` — chỉ userId |
| `getUserFromRequest(request)` | Trả về `{ id: bigint, role: string } \| null` — userId + role |

---

### C. CONTROLLERS — Điều phối

#### Module Auth: `src/modules/auth/controllers/AuthController.ts`
| Method | Mô tả |
|--------|-------|
| `identify(dto: IdentifyDto)` | Validate email → gọi `AuthService.identifyUser` |
| `register(dto: RegisterDto)` | Validate input → gọi `AuthService.registerNewUser` |
| `activate(dto: ActivateDto)` | Gọi `AuthService.activateAccount` |
| `login(dto: LoginDto)` | Validate input → gọi `AuthService.login` |
| `forgot(dto: ForgotDto)` | Gọi `AuthService.requestPasswordReset` |
| `reset(dto: ResetDto)` | Validate input → gọi `AuthService.resetPassword` |
| `getProfile(userId)` | Gọi `AuthService.getProfile` |
| `updateProfile(userId, dto)` | Gọi `AuthService.updateProfile` |
| `changePassword(userId, dto)` | Gọi `AuthService.changePassword` |

#### Module Course Management:

**`src/modules/course-management/controllers/CourseController.ts`**
| Method | Mô tả |
|--------|-------|
| `getCourses(search?)` | DS khóa học ACTIVE |
| `getCourseDetail(courseId, userId?)` | Chi tiết + kiểm tra enrollment |

**`src/modules/course-management/controllers/EnrollmentController.ts`**
| Method | Mô tả |
|--------|-------|
| `enrollStudent(userId, courseId)` | Đăng ký khóa học |
| `checkEnrollmentStatus(userId, courseId)` | Kiểm tra đăng ký |
| `getEnrolledCourses(userId, filter?, sort?)` | DS đã đăng ký |

**`src/modules/course-management/controllers/LearnController.ts`**
| Method | Mô tả |
|--------|-------|
| `trackVideoProgress(userId, lessonId, position, duration, isPreview)` | Cập nhật tiến độ video |
| `getProgress(userId, lessonId)` | Lấy tiến độ |
| `saveNote(userId, lessonId, content)` | Lưu ghi chú |
| `getNote(userId, lessonId)` | Lấy ghi chú |

**`src/modules/course-management/controllers/LessonController.ts`**
| Method | Mô tả |
|--------|-------|
| `getVideoContext(userId, lessonId)` | Lấy video URL + last position |

**`src/modules/course-management/controllers/QuizController.ts`**
| Method | Mô tả |
|--------|-------|
| `parseQuizFile(file)` | Parse Excel → câu hỏi |
| `uploadQuizForLesson(lessonId, file)` | Upload quiz cho bài |
| `generateQuiz(lessonId)` | Lấy 10 câu hỏi random |
| `startQuiz(userId, lessonId)` | Bắt đầu session quiz |
| `submitQuiz(userId, lessonId, dto)` | Chấm điểm quiz |
| `getQuizResults(userId, lessonId)` | Kết quả quiz |

**`src/modules/course-management/controllers/ManagementController.ts`**
| Method | Mô tả |
|--------|-------|
| `getLecturerCourses(lecturerId, status?)` | DS khóa học của giảng viên |
| `createCourse(lecturerId, dto)` | Tạo khóa học draft |
| `getCourseSections(courseId)` | Lấy sections + lessons |
| `createSection(courseId, dto)` | Tạo section |
| `updateSection(sectionId, dto)` | Cập nhật section |
| `createLesson(sectionId, dto)` | Tạo lesson |
| `updateLesson(lessonId, dto)` | Cập nhật lesson |
| `deleteLesson(lessonId)` | Xóa lesson |
| `submitForApproval(lecturerId, courseId)` | Gửi duyệt |
| `getPendingCourses()` | DS chờ duyệt |
| `moderateCourse(adminId, courseId, dto)` | Duyệt/Từ chối |
| `getLessonPreview(courseId, lessonId, user?)` | Xem trước bài |
| `trackVideoProgress(userId, dto)` | Track tiến độ preview |

**`src/modules/course-management/controllers/ApprovalController.ts`**
| Method | Mô tả |
|--------|-------|
| `moderateCourse(adminId, courseId, dto)` | Duyệt/Từ chối khóa học |
| `getPendingCourses()` | DS chờ duyệt |

**`src/modules/course-management/controllers/CourseManagementController.ts`**
| Method | Mô tả |
|--------|-------|
| `deleteSection(userId, sectionId)` | Xóa section (kiểm tra ownership) |
| `syncCourseContent(userId, courseId, dto)` | Đồng bộ nội dung |
| `submitForApproval(userId, courseId)` | Gửi duyệt |
| `getLessonPreview(courseId, lessonId, user)` | Xem trước bài |

---

### D. SERVICES — Logic nghiệp vụ

**`src/modules/auth/services/AuthService.ts`**
| Method | Logic chính |
|--------|------------|
| `identifyUser(email)` | Tra user → `IdentityPolicy.determineNextAction` |
| `registerNewUser(dto)` | Lazy cleanup → `RegistrationPolicy` → `UserFactory` → save → tạo token → gửi email |
| `activateAccount(token)` | `TokenPolicy.validateActivationToken` → `user.activate()` → `LoginNavigationPolicy` |
| `login(dto)` | Verify password → check active → `TokenFactory.createAuthTokens` → `LoginNavigationPolicy` |
| `requestPasswordReset(email)` | Revoke old tokens → tạo recovery token → gửi email |
| `resetPassword(dto)` | `RecoveryPolicy.validateRecoveryToken` → `user.changePassword` |
| `getProfile(userId)` | Tra user → trả profile |
| `updateProfile(userId, dto)` | Check age → `user.updateProfile` → save |
| `changePassword(userId, dto)` | Verify current → check confirm → `user.changePassword` |

**`src/modules/course-management/services/CourseService.ts`**
| Method | Logic chính |
|--------|------------|
| `getCourses(search?)` | Tra courses ACTIVE + thumbnail |
| `getCourseDetail(courseId, userId?)` | Full structure + enrollment check |

**`src/modules/course-management/services/EnrollmentService.ts`**
| Method | Logic chính |
|--------|------------|
| `enrollStudent(userId, courseId)` | `EnrollmentPolicy.validateCourseAvailability` → idempotency check → `EnrollmentFactory` |
| `checkEnrollmentStatus(userId, courseId)` | Tra enrollment |
| `getEnrolledCourses(userId, filter?, sort?)` | Tra với filter/sort + thumbnail |

**`src/modules/course-management/services/LearnService.ts`**
| Method | Logic chính |
|--------|------------|
| `trackVideoProgress(...)` | `PreviewPolicy` → load state → `ProgressPolicy.checkCompletionCondition` → `progress.tryFinish` → recalculate |
| `getProgress(userId, lessonId)` | Tra learning_progress |

**`src/modules/course-management/services/NoteService.ts`**
| Method | Logic chính |
|--------|------------|
| `saveNote(userId, lessonId, content)` | Validate length (max 1000) → find enrollment → create/update |
| `getNote(userId, lessonId)` | Find enrollment → tra note |

**`src/modules/course-management/services/QuizService.ts`**
| Method | Logic chính |
|--------|------------|
| `parseQuizFile(file)` | `ExcelAdapter.readToObjects` → `QuizValidationPolicy.validateRowStructure` |
| `uploadQuizForLesson(lessonId, file)` | Parse → replace all questions |
| `generateQuiz(lessonId)` | Random 10 câu, strip đáp án |
| `startQuiz(userId, lessonId)` | Create/find progress → `progress.startQuiz()` → store questionIds |
| `submitQuiz(userId, lessonId, dto)` | Check timeout → grade → `progress.updateQuizResult` → recalculate |
| `getQuizResults(userId, lessonId)` | Tra max score |

**`src/modules/course-management/services/ContentManagementService.ts`**
| Method | Logic chính |
|--------|------------|
| `getLecturerCourses(lecturerId, status?)` | Tra + normalize REJECTED→DRAFT + thumbnail |
| `createCourse(lecturerId, dto)` | Tạo Course entity → save |
| `getCourseSections(courseId)` | Tra chapters + lessons |
| `createSection/updateSection/createLesson/updateLesson/deleteLesson` | CRUD cơ bản |
| `submitForApproval(lecturerId, courseId)` | Check ownership + validate content → update PENDING |
| `getPendingCourses()` | Tra PENDING + lecturer name, FIFO |
| `moderateCourse(adminId, courseId, dto)` | APPROVE→ACTIVE, REJECT→DRAFT+note |
| `getLessonPreview(courseId, lessonId, user?)` | Access control theo role → trả preview |

**`src/modules/course-management/services/ApprovalService.ts`**
| Method | Logic chính |
|--------|------------|
| `moderateCourse(adminId, courseId, dto)` | `PublishingPolicy.validateModerationEligibility` → approve/reject |
| `getPendingCourses()` | Tra pending courses |

**`src/modules/course-management/services/CourseManagementService.ts`**
| Method | Logic chính |
|--------|------------|
| `deleteSection(userId, sectionId)` | `AccessControlPolicy` → `PublishingPolicy.validateDeletionEligibility` |
| `syncCourseContent(userId, courseId, dto)` | Check ownership + DRAFT → `LessonFactory` + `YouTubeAdapter` → sync |
| `submitForApproval(userId, courseId)` | `AccessControlPolicy` → `PublishingPolicy.validateMinimumViableContent` → submit |
| `getLessonPreview(courseId, lessonId, user)` | Access control → quiz questions |

---

### E. DOMAIN — Entities, Policies, Factories

#### Entities (Mô hình nghiệp vụ):

| File | Mô tả |
|------|-------|
| `src/modules/auth/domain/UserEntity.ts` | Thực thể User: activate, matchPassword, changePassword, updateProfile |
| `src/modules/auth/domain/TokenEntity.ts` | Token: isExpired, isUsedToken, markAsUsed |
| `src/modules/auth/domain/RoleEntity.ts` | Role: id, name |
| `src/modules/auth/domain/NavigationAction.ts` | Enum: LOGIN, REGISTER |
| `src/modules/course-management/domain/Course.ts` | Course: submit, approve, reject + CourseStatus enum |
| `src/modules/course-management/domain/Chapter.ts` | Chapter entity |
| `src/modules/course-management/domain/Lesson.ts` | Lesson: createVideoLesson, getVideoMetadata + LessonType enum |
| `src/modules/course-management/domain/Enrollment.ts` | Enrollment: create |
| `src/modules/course-management/domain/LearningProgress.ts` | Progress: updatePosition, tryFinish, updateQuizResult, startQuiz, isQuizTimeout |
| `src/modules/course-management/domain/Question.ts` | Question: isCorrect |
| `src/modules/course-management/domain/Note.ts` | Note: create, updateContent |

#### Policies (Quy tắc nghiệp vụ):

| File | Mô tả |
|------|-------|
| `src/modules/auth/domain/IdentityPolicy.ts` | Xác định action tiếp theo: LOGIN hoặc REGISTER |
| `src/modules/auth/domain/RegistrationPolicy.ts` | Kiểm tra đủ điều kiện đăng ký: ALLOW_NEW, OVERWRITE, REJECT |
| `src/modules/auth/domain/TokenPolicy.ts` | Validate activation token |
| `src/modules/auth/domain/RecoveryPolicy.ts` | Validate recovery token |
| `src/modules/auth/domain/LoginNavigationPolicy.ts` | Redirect URL sau login theo role |
| `src/modules/course-management/domain/AccessControlPolicy.ts` | Kiểm tra ownership |
| `src/modules/course-management/domain/EnrollmentPolicy.ts` | Validate khóa học khả dụng |
| `src/modules/course-management/domain/PublishingPolicy.ts` | Validate xóa section, minimum viable content, moderation |
| `src/modules/course-management/domain/ProgressPolicy.ts` | Kiểm tra hoàn thành: video ≥ 80% duration |
| `src/modules/course-management/domain/PreviewPolicy.ts` | Preview mode → không persist |
| `src/modules/course-management/domain/QuizPolicy.ts` | keyToIndex: A→0, B→1, C→2, D→3 |
| `src/modules/course-management/domain/QuizValidationPolicy.ts` | Validate cấu trúc row Excel |

#### Factories:

| File | Mô tả |
|------|-------|
| `src/modules/auth/domain/UserFactory.ts` | createInactiveUser, reconstituteForOverwrite |
| `src/modules/auth/domain/TokenFactory.ts` | createActivationToken, createRecoveryToken, createAuthTokens (JWT), verifyRefreshToken |
| `src/modules/course-management/domain/EnrollmentFactory.ts` | createEnrollment |
| `src/modules/course-management/domain/LessonFactory.ts` | createVideoLesson, createQuizLesson |

---

### F. REPOSITORIES — Truy xuất dữ liệu

#### Auth Module:

| File | Methods |
|------|---------|
| `src/modules/auth/repositories/UserRepository.ts` | `findByEmail`, `findById`, `createUser`, `updateUser`, `save`, `deleteInactiveUsersOlderThan24Hours` |
| `src/modules/auth/repositories/TokenRepository.ts` | `findByCode`, `save`, `markAsUsed`, `revokeAllByType` |
| `src/modules/auth/repositories/RoleRepository.ts` | `findById`, `findAll`, `findByName` |

#### Course Management Module:

| File | Methods |
|------|---------|
| `src/modules/course-management/repositories/CourseRepository.ts` | `findById`, `findActiveById`, `findByIdWithFullStructure`, `findActiveCoursesWithThumbnails`, `save`, `findPendingCourses`, `findByIdWithLecturer` |
| `src/modules/course-management/repositories/EnrollmentRepository.ts` | `findByStudentAndCourse`, `findByStudent`, `getEnrolledCoursesWithDetails`, `findById`, `save` |
| `src/modules/course-management/repositories/LearningProgressRepository.ts` | `findByStudentAndLesson`, `save`, `findByEnrollment` |
| `src/modules/course-management/repositories/LessonRepository.ts` | `findById`, `findByChapterId`, `syncLessons`, `save`, `findQuizQuestions` |
| `src/modules/course-management/repositories/QuestionRepository.ts` | `findRandomByLesson`, `findByIds`, `replaceAllForLesson` |
| `src/modules/course-management/repositories/SectionRepository.ts` | `findById`, `countByCourse`, `deleteWithLessons` |
| `src/modules/course-management/repositories/NoteRepository.ts` | `findByStudentAndLesson`, `save`, `create` |

---

### G. ADAPTERS — Kết nối bên thứ 3

| File | Mô tả |
|------|-------|
| `src/shared/adapters/EmailAdapter.ts` | Gửi email qua Nodemailer (Mailtrap): `sendActivationEmail`, `sendRecoveryEmail` |
| `src/shared/adapters/YouTubeAdapter.ts` | Lấy metadata video YouTube: `fetchMetadata` → duration, thumbnail |
| `src/shared/adapters/ExcelAdapter.ts` | Đọc file Excel thành objects: `readToObjects` |

---

### H. SHARED/CONFIG

| File | Mô tả |
|------|-------|
| `src/shared/config/database.ts` | Export `prisma` — singleton PrismaClient |
| `src/modules/shared/utils/VideoThumbnailUtil.ts` | `findFirstVideoUrl`, `deriveThumbnailFromVideoUrl` (YouTube/Vimeo) |

---

### I. DTOs — Data Transfer Objects

#### Auth DTOs (`src/modules/auth/dtos/`):
| File | Chiều | Fields |
|------|-------|--------|
| `IdentifyDto.ts` | Request | email, continueUrl? |
| `IdentifyResponseDto.ts` | Response | action (LOGIN/REGISTER), continueUrl? |
| `RegisterDto.ts` | Request | email, password, fullName, age?, continueUrl? |
| `RegisterResponseDto.ts` | Response | message, email |
| `ActivateDto.ts` | Request | token |
| `ActivateResponseDto.ts` | Response | success, redirectUrl? |
| `LoginDto.ts` | Request | email, password, continueUrl? |
| `LoginResponseDto.ts` | Response | accessToken, refreshToken, user{}, redirectUrl |
| `ForgotDto.ts` | Request | email |
| `ForgotResponseDto.ts` | Response | message |
| `ResetDto.ts` | Request | token, password |
| `ResetResponseDto.ts` | Response | message, redirect |
| `UpdateProfileDto.ts` | Request | fullName, age? |
| `UpdateProfileResponseDto.ts` | Response | success, message |
| `ChangePasswordDto.ts` | Request | currentPassword, newPassword, confirmPassword |
| `ChangePasswordResponseDto.ts` | Response | success, message |

#### Course Management DTOs (`src/modules/course-management/dtos/`):
| File | Mô tả |
|------|-------|
| `CourseListDto.ts` | DS khóa học: id, title, slug, description, thumbnailUrl |
| `CourseDetailDto.ts` | Chi tiết: + lecturerName, isEnrolled, chapters[], thumbnailUrl |
| `CourseManagementDto.ts` | CreateCourseDto (title, description), CourseSummaryDto |
| `ContentDto.ts` | CreateSectionDto, UpdateSectionDto, SectionDto, CreateLessonDto, UpdateLessonDto, LessonDto |
| `BulkCourseContentDto.ts` | BulkLessonDto, BulkSectionDto, BulkCourseContentDto |
| `EnrolledCourseDto.ts` | id, title, slug, status, thumbnailUrl, completionRate, enrolledAt |
| `EnrollResult.ts` | redirectUrl |
| `ModerateCourseDto.ts` | action (APPROVE/REJECT), rejectNote? |
| `ProgressResult.ts` | isFinished |
| `QuizQuestionsDto.ts` | questions[]: id, content, options[] |
| `QuizResultDto.ts` | SubmitQuizDto, SubmitQuizIndexDto, QuizResultDto |
| `ParsedQuestionDto.ts` | content, options[], correctAnswer |

---

### J. SCRIPTS

| File | Mô tả |
|------|-------|
| `scripts/convertRejectedToDraft.ts` | Script chuyển đổi courses REJECTED → DRAFT |
| `prisma/seed.ts` | Seed dữ liệu mẫu: 3 roles, 3 users, 3 courses, chapters, lessons, quiz questions |
