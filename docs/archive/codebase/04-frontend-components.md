# 🖥️ FRONTEND — GIẢI THÍCH TỪNG COMPONENT

> Tất cả Pages và Components trong hệ thống. Dùng để debug/refactor nhanh.

---

## I. LAYOUT & CẤU HÌNH TOÀN CỤC

### 1. `src/app/layout.tsx` — RootLayout
- **Loại:** Server Component (không có 'use client')
- **Chức năng:**
  - Patch `BigInt.prototype.toJSON` để JSON.stringify hoạt động với BigInt từ Prisma
  - Khai báo metadata (title, description)
  - Wrap toàn bộ app trong `<html><body>{children}</body></html>`
- **Import:** globals.css

### 2. `src/app/globals.css`
- File CSS toàn cục, import TailwindCSS base/components/utilities

---

## II. SHARED COMPONENTS (src/components/)

### 3. `src/components/Header.tsx` — Header
- **Props:** `{ user?: User | null, onLogout?: () => void, onJoin?: () => void }`
- **State:** `isDropdownOpen: boolean`
- **Chức năng:**
  - Logo "E-Learning" → navigate `/`
  - Nếu `user` tồn tại: hiện Avatar (chữ cái đầu fullName) + Dropdown menu
    - STUDENT: "Khóa học của tôi" → `/my-learning`
    - LECTURER: "Khóa học của tôi" → `/lecturer/courses`
    - ADMIN: "Danh sách chờ duyệt" → `/admin/approval-queue`
    - Chung: "Sửa hồ sơ" → `/profile`, "Đổi mật khẩu" → `/change-password`, "Đăng xuất"
  - Nếu không có user: nút "Tham gia" → gọi `onJoin()`
- **Handlers nội bộ:** `handleHomeClick`, `handleProfileClick`, `handleChangePasswordClick`, `handleMyLearningClick`, `handleMyCoursesClick`, `handlePendingQueueClick`, `handleLogoutClick`

### 4. `src/components/SearchBar.tsx` — SearchBar
- **Props:** `{ value: string, onChange: (value: string) => void, placeholder?: string }`
- **Chức năng:** Input text với icon tìm kiếm. Gọi `onChange` mỗi khi gõ.
- **Stateless** (controlled component)

### 5. `src/components/CourseCard.tsx` — CourseCard
- **Props:** `{ course: Course, onClick?: (courseId: number) => void }`
- **Chức năng:** Hiển thị card khóa học: thumbnail, title, description, status, completionRate
- **Stateless**
- **Accessibility:** `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space)

### 6. `src/components/CourseList.tsx` — CourseList
- **Props:** `{ courses: Course[], loading?: boolean, onCourseClick?: (courseId: number) => void }`
- **Chức năng:**
  - Nếu `loading`: hiện skeleton cards (6 placeholders animate-pulse)
  - Nếu `courses` rỗng: hiện thông báo "Không có khóa học"
  - Bình thường: render grid 3 cột `CourseCard` cho mỗi course
- **Stateless** (delegate sang CourseCard)

### 7. `src/components/Toast.tsx` — Toast
- **Props:** `{ message: string, type?: 'info'|'success'|'error', onClose?: () => void, duration?: number }`
- **Chức năng:** Fixed toast ở góc phải trên. Tự đóng sau `duration` ms (mặc định 3500ms).
- **Màu sắc:** error=đỏ, success=xanh lá, info=xanh dương

### 8. `src/components/YoutubePlayer.tsx` — YoutubePlayer (React.memo)
- **Props:** `{ videoId: string, initialPos: number, onProgress: (time) => void, onDuration: (duration) => void, onFlush: (time) => void }`
- **Refs:** `playerRef` (YouTube player instance), `intervalRef` (tracking interval), `isInitialSeekDone`
- **Chức năng:**
  - Render iframe YouTube qua thư viện `react-youtube`
  - `processTracking()`: mỗi 1s kiểm tra trạng thái player, gọi `onProgress(time)` nếu đang PLAYING
  - Initial seek: nếu `initialPos > 0`, seek đến vị trí đó lần đầu
  - `beforeunload`: gọi `onFlush(lastTime)` khi user rời trang
  - `onReady`: lấy duration, khởi động engine
  - **React.memo** để chống re-render thừa

---

## III. PAGES — AUTH FLOW

### 9. `src/app/page.tsx` — Home (Trang chủ)
- **Export:** `Home`
- **State:**
  - `searchQuery`, `debouncedSearchQuery`: tìm kiếm với debounce 500ms
  - `courses: Course[]`
  - `user: User | null`
  - `appState: 'idle' | 'loading' | 'error' | 'success'`
  - `errorMessage: string | null`
- **Effects:**
  - Debounce searchQuery → debouncedSearchQuery (500ms)
  - Fetch courses khi debouncedSearchQuery thay đổi → `getCourses(search)`
  - Load user từ localStorage → `AuthUtils.getCurrentUser()`
- **Handlers:** `handleSearchChange`, `handleLogout`, `handleJoin`, `handleCourseClick`
- **Components dùng:** Header, SearchBar, CourseList
- **Đặc biệt:** Nếu user.role === 'LECTURER' → hiện nút "Tạo khóa học" → navigate `/lecturer/courses`

### 10. `src/app/join/page.tsx` — JoinPage (Gateway đăng nhập)
- **Export:** `JoinPage`
- **State:**
  - `email: string`
  - `continueUrl: string` (từ query param)
  - `appState: 'idle' | 'submitting' | 'redirecting' | 'error'`
  - `errorMessage: string | null`
- **Logic:**
  - Lấy `continueUrl` từ URL params
  - Validate email (regex)
  - Gọi `identifyUser({ email, continueUrl })`
  - Redirect: action=LOGIN → `/login?email=...`, action=REGISTER → `/register?email=...`
- **Components dùng:** Header, Toast

### 11. `src/app/login/page.tsx` — LoginPage
- **Export:** `LoginPage`
- **State:** `email, password, continueUrl, appState, errorMessage`
- **Logic:**
  - Lấy email + continueUrl từ URL params
  - Gọi `loginUser({ email, password, continueUrl })`
  - Lưu tokens: `AuthUtils.setTokens(accessToken, refreshToken)`
  - Redirect → `response.redirectUrl` hoặc `continueUrl`
- **Handlers:** `handleChangeEmail` → `/join`, `handleForgotPassword` → `/forgot-password`
- **Components dùng:** Header, Toast

### 12. `src/app/register/page.tsx` — RegisterPage
- **Export:** `RegisterPage`
- **State:** `email, fullName, age, password, continueUrl, appState, errorMessage, fieldErrors`
- **Logic:**
  - Lấy email + continueUrl từ URL params
  - Validate form (fullName, age, password)
  - Gọi `registerUser({ email, fullName, age, password, continueUrl })`
  - Thành công → hiện Toast "Kiểm tra email để kích hoạt"
  - Xử lý error codes: INVALID_AGE, PASSWORD_TOO_SHORT, USER_ALREADY_ACTIVE, VALIDATION_ERROR
- **Components dùng:** Header, Toast

### 13. `src/app/activate/page.tsx` — ActivatePage
- **Export:** `ActivatePage`
- **State:** `appState: 'idle'|'submitting'|'success'|'error', errorMessage`
- **Logic:**
  - Lấy `token` từ URL params
  - Auto gọi `activateUser({ token })` khi mount
  - Thành công → hiện thông báo + redirect `/join` sau 3 giây
  - Không có token → hiện lỗi
- **Không dùng Header component** (tự render header đơn giản)

### 14. `src/app/forgot-password/page.tsx` — ForgotPasswordPage
- **Export:** `ForgotPasswordPage`
- **State:** `email, appState: 'idle'|'submitting'|'neutral_success'|'error', errorMessage`
- **Logic:**
  - Validate email format
  - Gọi `forgotPassword({ email })`
  - Luôn hiện thông báo trung lập (chống enumeration): "Nếu email tồn tại..."
  - Error: INVALID_FORMAT, RATE_LIMIT_EXCEEDED
- **Components dùng:** Header, Toast

### 15. `src/app/reset-password/page.tsx` — ResetPasswordPage
- **Export:** `ResetPasswordPage` (wrapper Suspense) + `ResetPasswordForm` (nội bộ)
- **State:** `password, token, appState: 'idle'|'submitting'|'success'|'business_error'|'system_error', errorMessage`
- **Logic:**
  - Dùng `useSearchParams()` lấy token (cần Suspense boundary)
  - Không có token → redirect `/forgot-password`
  - Gọi `resetPassword({ token, password })`
  - Phân loại error: business (token không hợp lệ/hết hạn) vs system
- **Components dùng:** Header, Toast

---

## IV. PAGES — USER MANAGEMENT

### 16. `src/app/profile/page.tsx` — EditProfilePage
- **Export:** `EditProfilePage`
- **State:** `fullName, age, email, appState, errorMessage`
- **Logic:**
  - Load profile từ API: `getProfile()`
  - Submit: `updateProfile({ fullName, age })`
  - Cập nhật localStorage: `AuthUtils.setUserInfo(updatedUser)`
- **Không dùng Header component** (tự render header với avatar)

### 17. `src/app/change-password/page.tsx` — ChangePasswordPage
- **Export:** `ChangePasswordPage`
- **State:** `currentPassword, newPassword, confirmPassword, appState, errorMessage`
- **Logic:**
  - Client-side validation: newPassword === confirmPassword, minLength 6
  - Gọi `changePassword({ currentPassword, newPassword, confirmPassword })`
  - Phân loại error: business vs system
- **Không dùng Header component** (tự render header với avatar)

---

## V. PAGES — STUDENT LEARNING

### 18. `src/app/courses/[id]/page.tsx` — CourseDetailPage
- **Export:** `CourseDetailPage`
- **Params:** `id` (courseId)
- **State:** `course: CourseDetail | null, user, appState, errorMessage`
- **Logic:**
  - Fetch: `getCourseDetail(courseId)`
  - Load user từ localStorage
  - Nút tương tác theo điều kiện:
    - STUDENT + enrolled → "Bắt đầu học" → `/courses/{id}/learn`
    - STUDENT + chưa enrolled → "Đăng ký học" → `enrollCourse(courseId)` → redirect learn
    - Không phải STUDENT → thông báo
    - Chưa login → "Tham gia để đăng ký" → `/join?continueUrl=...`
- **Components dùng:** Header

### 19. `src/app/courses/[id]/learn/page.tsx` — LearningPage ⭐ (PHỨC TẠP NHẤT)
- **Export:** `LearningPage`
- **Params:** `id` (courseId)
- **State chính:**
  - `lessons: Lesson[]`, `currentLesson: Lesson | null`
  - `lessonProgress: LessonProgress | null`
  - `appState: 'loading'|'idle'|'quiz_ready'|'quiz_doing'|'quiz_result'|'error'`
  - `user: User | null`, `errorMessage`
- **State Quiz:**
  - `quizSession: QuizSession | null`, `quizResult: QuizResult | null`
  - `timeLeft: number`, `answers: Record<string, string>`
- **State UI:**
  - `noteContent: string`, `isSavingNote: boolean`, `videoDuration: number`
- **Refs:** `lastSentTimeRef`, `quizTimerRef`, `videoRef`
- **Helpers nội bộ:** `getYouTubeVideoId()`, `isYouTubeUrl()`, `formatTime()`, `calculateCourseProgress()`
- **Core Functions:**
  - `loadCourseData()`: fetch lessons → set currentLesson (bài đầu tiên)
  - `loadLessonData(lessonId, type)`: fetch progress + note song song → set appState
  - `handleLessonSelect(lesson)`: reset tracking state, chuyển bài
  - `handleProgressUpdate(currentTime)`: useCallback, gửi progress mỗi 5 giây
  - `handleFlushUpdate(time)`: useCallback, lưu progress cuối cùng
  - `handleStartQuiz()`: gọi `startQuiz(lessonId)` → nhận questions + timer
  - `handleSubmitQuiz()`: gọi `submitQuiz(lessonId, sessionId, answers)` → nhận result
  - `handleSaveNote()`: gọi `saveLessonNote(lessonId, content)`
  - `startTimer()` / `stopTimer()`: quiz countdown timer
- **Layout:** Grid 3:1 (Content + Sidebar danh sách bài)
- **Components dùng:** Header, YoutubePlayer

### 20. `src/app/my-learning/page.tsx` — MyLearningPage
- **Export:** `MyLearningPage`
- **State:** `courses: EnrolledCourse[], filter, appState, errorMessage, user`
- **Logic:**
  - Fetch: `getEnrolledCourses(filter)` — filter: 'in_progress' | 'completed' | undefined
  - Tab navigation: "Đang học", "Hoàn thành", "Tất cả"
  - Click course → `/courses/{id}/learn`
- **Components dùng:** Header

---

## VI. PAGES — LECTURER MANAGEMENT

### 21. `src/app/lecturer/courses/page.tsx` — LecturerCoursesPage
- **Export:** `LecturerCoursesPage`
- **State:** `courses: LecturerCourse[], loading, error, selectedStatus, user, creating, createError`
- **Logic:**
  - Fetch: `getLecturerCourses(status?)` — filter: All, Draft, Pending, Active
  - Tab Draft: fetch tất cả → filter client-side `status === 'DRAFT'`
  - "Tạo khóa học" → `createCourse({ title: 'Khóa học mới' })` → redirect `/lecturer/courses/{id}/edit`
  - Click course: DRAFT → `/lecturer/courses/{id}/edit`, khác → `/lecturer/courses/{id}/view`
  - Hiển thị reject note nếu status=DRAFT + có rejectNote
- **Components dùng:** Header, Toast

### 22. `src/app/lecturer/courses/[id]/edit/page.tsx` — CourseEditPage ⭐ (FILE LỚN NHẤT ~700 dòng)
- **Export:** `CourseEditPage`
- **Params:** `id` (courseId)
- **State:**
  - `course: CourseStructure | null, loading, error, validationErrors`
  - `editState: 'idle'|'editingVideo'|'editingQuiz'|'processing'|'reviewing'|'readOnly'`
  - `selectedItem: Chapter | Lesson | null`
  - `parsedQuestions: QuizParseResponse | null`
  - `chapterForm: ChapterEdit, lessonForm: LessonEdit`
  - `chapterCreating: boolean, quizFile: File | null`
- **Core Functions:**
  - `fetchCourseStructure()`: tải cấu trúc khóa học → check readOnly nếu PENDING/ACTIVE
  - `buildContentPayload()`: chuyển course state → BulkCourseContentDto
  - `handleSaveAll()`: gọi `updateCourseContent(courseId, payload)` (sync toàn bộ)
  - `handlePublish()`: validate → gọi `publishCourse(courseId)` → PENDING
  - `handleCreateSection()`: gọi `createSection(courseId, data)` → reload
  - `handleCreateLesson(sectionId)`: gọi `createLesson(sectionId, data)` → reload
  - `handleQuizParse()`: gọi `parseQuizFile(file)` → preview questions
  - `handleQuizUpload(lessonId)`: gọi `uploadQuizFile(lessonId, file)` → reload
- **Layout:** Sidebar (chapter/lesson tree) + Editor panel (form fields)
- **API calls:** getCourseStructure, createSection, updateSection, deleteSection, createLesson, updateLesson, parseQuizFile, uploadQuizFile, publishCourse, updateCourseContent

### 23. `src/app/lecturer/courses/[id]/view/page.tsx` — CoursePreviewPage
- **Export:** `CoursePreviewPage`
- **Params:** `id` (courseId)
- **State:** `course: CourseStructure | null, selectedLesson: LessonPreview | null, loading, loadingContent, error`
- **Logic:**
  - Fetch: `getCourseStructure(courseId)`
  - Click lesson → `getLessonPreview(courseId, lessonId)`
  - Render: VIDEO → YoutubePlayer, QUIZ → câu hỏi + đáp án đúng (xanh), TEXT → HTML
- **Components dùng:** YoutubePlayer
- **Helpers nội bộ:** `getYouTubeVideoId()`, `isYouTubeUrl()` (duplicate từ LearningPage)

---

## VII. PAGES — ADMIN

### 24. `src/app/admin/approval-queue/page.tsx` — AdminApprovalQueuePage
- **Export:** `AdminApprovalQueuePage`
- **State:** `state: AdminState, queue: ApprovalQueueItem[], error, processingId, user`
- **Logic:**
  - Fetch: `getApprovalQueue()`
  - "Xem" → `/lecturer/courses/{id}/view`
  - "Duyệt" → `moderateCourse(id, { action: 'APPROVE' })`
  - "Từ chối" → prompt lý do → `moderateCourse(id, { action: 'REJECT', rejectNote })`
  - Sau mỗi action → reload queue
- **Components dùng:** Header

---

## VIII. API CLIENT LAYER (src/lib/)

### 25. `src/lib/api.ts` — Axios Instance
- Tạo axios instance base URL `/api/v1`
- Request interceptor: thêm `Authorization: Bearer {token}` từ `AuthUtils.getAccessToken()`
- **Export:** `api` (axios instance)

### 26. `src/lib/auth.ts` — Auth API Functions
- **Class `AuthUtils`:**
  - `setTokens(access, refresh)` — lưu vào localStorage
  - `getAccessToken()` — đọc từ localStorage
  - `getCurrentUser()` — parse user từ JWT payload (decode base64)
  - `setUserInfo(user)` — lưu user vào localStorage
  - `isAuthenticated()` — kiểm tra có token
  - `clearTokens()` — xóa tokens
- **Functions:**
  - `identifyUser(data: IdentifyRequest)` → POST `/auth/identify`
  - `loginUser(data: LoginRequest)` → POST `/auth/login` (lưu token + user)
  - `registerUser(data: RegisterRequest)` → POST `/auth/register`
  - `activateUser(data: ActivateRequest)` → POST `/auth/activate`
  - `forgotPassword(data)` → POST `/auth/forgot-password`
  - `resetPassword(data)` → POST `/auth/reset-password`
  - `logout()` → POST `/auth/logout` (xóa token)
  - `getProfile()` → GET `/auth/profile`
  - `updateProfile(data)` → PUT `/auth/profile`
  - `changePassword(data)` → PUT `/auth/change-password`

### 27. `src/lib/courses.ts` — Public Course API
- `getCourses(search?)` → GET `/courses?search=...`
- `getCourseDetail(courseId)` → GET `/courses/{id}`
- `enrollCourse(courseId)` → POST `/courses/{id}/enroll`

### 28. `src/lib/course.ts` — Student Learning API
- `getLessons(courseId)` → GET `/courses/{id}/lessons`
- `getLessonProgress(lessonId)` → GET `/lessons/{id}/progress`
- `updateLessonProgress(lessonId, position, duration)` → POST `/lessons/{id}/progress`
- `startQuiz(lessonId)` → POST `/lessons/{id}/quiz/start`
- `submitQuiz(lessonId, sessionId, answers)` → POST `/lessons/{id}/quiz/submit`
- `saveLessonNote(lessonId, content)` → PUT `/lessons/{id}/notes`
- `getLessonNote(lessonId)` → GET `/lessons/{id}/notes`
- `getEnrolledCourses(filter?)` → GET `/courses/enrolled?filter=...`

### 29. `src/lib/lecturer.ts` — Lecturer Management API
- `getLecturerCourses(params?)` → GET `/management/courses`
- `createCourse(data)` → POST `/management/courses`
- `getCourseStructure(courseId)` → GET `/management/courses/{id}/sections`
- `createSection(courseId, data)` → POST `/management/courses/{id}/sections`
- `updateSection(sectionId, data)` → PUT `/management/sections/{id}`
- `deleteSection(sectionId)` → DELETE `/management/sections/{id}`
- `createLesson(sectionId, data)` → POST `/management/sections/{id}/lessons`
- `updateLesson(lessonId, data)` → PUT `/management/lessons/{id}`
- `updateCourseContent(courseId, data)` → PUT `/management/courses/{id}/content`
- `publishCourse(courseId)` → PATCH `/management/courses/{id}/publish`
- `parseQuizFile(file)` → POST `/management/quiz/parse` (FormData)
- `uploadQuizFile(lessonId, file)` → POST `/management/lessons/{id}/quiz/upload` (FormData)
- `getLessonPreview(courseId, lessonId)` → GET `/management/courses/{id}/preview/lessons/{lessonId}`

### 30. `src/lib/admin.ts` — Admin API
- `getApprovalQueue()` → GET `/management/approval-queue`
- `moderateCourse(courseId, data)` → PATCH `/management/courses/{id}/moderate`

---

## IX. TYPES (src/types/)

### 31. `src/types/auth.types.ts`
- `User { id, email, fullName, age, role }`
- `IdentifyRequest/Response`, `LoginRequest/Response`, `RegisterRequest/Response`
- `ActivateRequest/Response`, `ForgotPasswordRequest`, `ResetPasswordRequest`
- `UpdateProfileRequest`, `ChangePasswordRequest`

### 32. `src/types/course.types.ts`
- `Course { id, title, description, thumbnailUrl, status }`
- `CourseDetail { ...Course, lecturerName, chapters, isEnrolled }`
- `Lesson { id, title, type, videoUrl, duration, order, isCompleted }`
- `LessonProgress { currentPosition, isCompleted, lastAccessedAt }`
- `QuizSession { sessionId, questions, expiresAt }`
- `QuizResult { score, questions }`
- `EnrolledCourse { id, title, thumbnailUrl, completionRate, status, enrolledAt }`

### 33. `src/types/lecturer.types.ts`
- `LecturerCourse { id, title, status, thumbnailUrl, rejectNote }`
- `CourseStructure { courseId, title, status, chapters: Chapter[] }`
- `Chapter { id, title, orderIndex, lessons: Lesson[] }`
- `Lesson { id, title, type, content, videoUrl, orderIndex }`
- `LessonEdit, ChapterEdit, LessonPreview, QuizParseResponse`

### 34. `src/types/admin.types.ts`
- `ApprovalQueueItem { id, title, lecturerName, submittedAt }`
- `ModerateCourseRequest { action: 'APPROVE'|'REJECT', rejectNote? }`

### 35. `src/types/common.types.ts`
- `ApiResponse<T> { success, data, message }`
- `PaginatedResponse<T> { data, total, page, pageSize }`
