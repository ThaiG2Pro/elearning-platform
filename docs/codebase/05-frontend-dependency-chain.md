# 🔗 FRONTEND — CHUỖI PHỤ THUỘC (DEPENDENCY CHAIN)

> Mỗi tương tác người dùng đi qua các file/function theo thứ tự.
> Format: `Page.handler` → `lib/file.function` → `api.ts` → `API endpoint`
> Dùng tài liệu này để trace luồng dữ liệu FE→BE khi debug.

---

## I. COMPONENT DEPENDENCY MAP

```
src/app/layout.tsx
  └─ globals.css

src/app/page.tsx (Home)
  ├─ components/Header.tsx
  ├─ components/SearchBar.tsx
  ├─ components/CourseList.tsx
  │   └─ components/CourseCard.tsx
  ├─ lib/courses.ts → lib/api.ts
  ├─ lib/auth.ts (AuthUtils, logout)
  └─ types/course.types.ts, types/auth.types.ts

src/app/join/page.tsx
  ├─ components/Header.tsx
  ├─ components/Toast.tsx
  ├─ lib/auth.ts (identifyUser)
  └─ types/auth.types.ts

src/app/login/page.tsx
  ├─ components/Header.tsx
  ├─ components/Toast.tsx
  ├─ lib/auth.ts (loginUser, AuthUtils)
  └─ types/auth.types.ts

src/app/register/page.tsx
  ├─ components/Header.tsx
  ├─ components/Toast.tsx
  ├─ lib/auth.ts (registerUser)
  └─ types/auth.types.ts

src/app/activate/page.tsx
  ├─ lib/auth.ts (activateUser)
  └─ types/auth.types.ts

src/app/forgot-password/page.tsx
  ├─ components/Header.tsx
  ├─ components/Toast.tsx
  ├─ lib/auth.ts (forgotPassword)
  └─ types/auth.types.ts

src/app/reset-password/page.tsx
  ├─ components/Header.tsx
  ├─ components/Toast.tsx
  ├─ lib/auth.ts (resetPassword)
  └─ (không dùng types riêng — inline object)

src/app/profile/page.tsx
  ├─ lib/auth.ts (getProfile, updateProfile, AuthUtils)
  └─ (không dùng shared Header)

src/app/change-password/page.tsx
  ├─ lib/auth.ts (changePassword, AuthUtils)
  └─ (không dùng shared Header)

src/app/courses/[id]/page.tsx
  ├─ components/Header.tsx
  ├─ lib/courses.ts (getCourseDetail, enrollCourse)
  ├─ lib/auth.ts (logout, AuthUtils)
  └─ types/course.types.ts, types/auth.types.ts

src/app/courses/[id]/learn/page.tsx
  ├─ components/Header.tsx
  ├─ components/YoutubePlayer.tsx
  │   └─ react-youtube (npm)
  ├─ lib/course.ts (getLessons, getLessonProgress, updateLessonProgress, startQuiz, submitQuiz, saveLessonNote, getLessonNote)
  ├─ lib/auth.ts (logout, AuthUtils)
  └─ types/course.types.ts, types/auth.types.ts

src/app/my-learning/page.tsx
  ├─ components/Header.tsx
  ├─ lib/course.ts (getEnrolledCourses)
  ├─ lib/auth.ts (logout, AuthUtils)
  └─ types/course.types.ts, types/auth.types.ts

src/app/lecturer/courses/page.tsx
  ├─ components/Header.tsx
  ├─ components/Toast.tsx
  ├─ lib/lecturer.ts (getLecturerCourses, createCourse)
  ├─ lib/auth.ts (logout, AuthUtils)
  └─ types/lecturer.types.ts, types/auth.types.ts

src/app/lecturer/courses/[id]/edit/page.tsx
  ├─ lib/lecturer.ts (getCourseStructure, createSection, updateSection, deleteSection, createLesson, updateLesson, parseQuizFile, uploadQuizFile, publishCourse, updateCourseContent)
  └─ types/lecturer.types.ts

src/app/lecturer/courses/[id]/view/page.tsx
  ├─ components/YoutubePlayer.tsx
  ├─ lib/lecturer.ts (getCourseStructure, getLessonPreview)
  └─ types/lecturer.types.ts

src/app/admin/approval-queue/page.tsx
  ├─ components/Header.tsx
  ├─ lib/admin.ts (getApprovalQueue, moderateCourse)
  ├─ lib/auth.ts (logout, AuthUtils)
  └─ types/admin.types.ts, types/auth.types.ts
```

---

## II. LUỒNG TƯƠNG TÁC CHI TIẾT (USER ACTION → API)

### A. AUTH FLOWS

#### 1. Nhập email tại Join Gateway
```
JoinPage.handleSubmit
  → lib/auth.ts::identifyUser({ email, continueUrl })
    → api.post('/auth/identify', data)
      → API: POST /api/v1/auth/identify
  ← response.action: 'LOGIN' | 'REGISTER'
  → router.push('/login?email=...') HOẶC router.push('/register?email=...')
```

#### 2. Đăng nhập
```
LoginPage.handleSubmit
  → lib/auth.ts::loginUser({ email, password, continueUrl })
    → api.post('/auth/login', data)
      → API: POST /api/v1/auth/login
  ← { accessToken, refreshToken, redirectUrl }
  → AuthUtils.setTokens(accessToken, refreshToken)  [localStorage]
  → router.push(redirectUrl)
```

#### 3. Đăng ký
```
RegisterPage.handleSubmit
  → RegisterPage.validateForm()                       [client-side]
  → lib/auth.ts::registerUser({ email, fullName, age, password, continueUrl })
    → api.post('/auth/register', data)
      → API: POST /api/v1/auth/register
  ← success
  → setAppState('request_sent') + Toast "Kiểm tra email"
```

#### 4. Kích hoạt tài khoản
```
ActivatePage.useEffect (mount)
  → ActivatePage.handleActivate(token)
    → lib/auth.ts::activateUser({ token })
      → api.post('/auth/activate', data)
        → API: POST /api/v1/auth/activate
    ← success
    → setTimeout → router.push('/join') (3s)
```

#### 5. Quên mật khẩu
```
ForgotPasswordPage.handleSubmit
  → ForgotPasswordPage.validateEmail()                [client-side]
  → lib/auth.ts::forgotPassword({ email })
    → api.post('/auth/forgot-password', data)
      → API: POST /api/v1/auth/forgot-password
  ← success (luôn trả OK — chống enumeration)
  → setAppState('neutral_success')
```

#### 6. Đặt lại mật khẩu
```
ResetPasswordForm.handleSubmit
  → lib/auth.ts::resetPassword({ token, password })
    → api.post('/auth/reset-password', data)
      → API: POST /api/v1/auth/reset-password
  ← success
  → Toast "Mật khẩu đã cập nhật" → router.push('/join')
```

#### 7. Đăng xuất (bất kỳ trang nào có Header)
```
Page.handleLogout
  → lib/auth.ts::logout()
    → api.post('/auth/logout')
      → API: POST /api/v1/auth/logout
    → AuthUtils.clearTokens()                         [localStorage]
  → setUser(null)
```

#### 8. Cập nhật hồ sơ
```
EditProfilePage.useEffect (mount)
  → lib/auth.ts::getProfile()
    → api.get('/auth/profile')
      → API: GET /api/v1/auth/profile
  ← { email, fullName, age }

EditProfilePage.handleSubmit
  → lib/auth.ts::updateProfile({ fullName, age })
    → api.put('/auth/profile', data)
      → API: PUT /api/v1/auth/profile
  → AuthUtils.setUserInfo(updatedUser)                [localStorage]
```

#### 9. Đổi mật khẩu
```
ChangePasswordPage.handleSubmit
  → Client validate: newPassword === confirmPassword, length ≥ 6
  → lib/auth.ts::changePassword({ currentPassword, newPassword, confirmPassword })
    → api.put('/auth/change-password', data)
      → API: PUT /api/v1/auth/change-password
```

---

### B. STUDENT FLOWS

#### 10. Trang chủ — Tìm kiếm & Duyệt khóa học
```
Home.useEffect [debouncedSearchQuery thay đổi]
  → lib/courses.ts::getCourses(search?)
    → api.get('/courses', { params: { search } })
      → API: GET /api/v1/courses?search=...
  ← Course[]
  → setCourses(data) → CourseList renders CourseCards

Home.useEffect [mount]
  → AuthUtils.getCurrentUser()                        [localStorage → JWT decode]
  → setUser(user)
```

#### 11. Xem chi tiết khóa học
```
CourseDetailPage.useEffect [mount]
  → lib/courses.ts::getCourseDetail(courseId)
    → api.get('/courses/{id}')
      → API: GET /api/v1/courses/{id}
  ← CourseDetail { title, description, thumbnailUrl, lecturerName, chapters, isEnrolled }
```

#### 12. Đăng ký khóa học
```
CourseDetailPage.handleEnroll
  → lib/courses.ts::enrollCourse(courseId)
    → api.post('/courses/{id}/enroll')
      → API: POST /api/v1/courses/{id}/enroll
  ← success
  → setCourse({ ...course, isEnrolled: true })
  → router.push('/courses/{id}/learn')
```

#### 13. Vào trang học — Load bài học
```
LearningPage.useEffect [mount]
  → LearningPage.loadCourseData()
    → lib/course.ts::getLessons(courseId)
      → api.get('/courses/{id}/lessons')
        → API: GET /api/v1/courses/{id}/lessons
    ← Lesson[] (kèm isCompleted per lesson)
    → setLessons(lessons), setCurrentLesson(lessons[0])

  → LearningPage.loadLessonData(lessonId, type)      [trigger bởi currentLesson change]
    → Promise.all([
        lib/course.ts::getLessonProgress(lessonId)
          → api.get('/lessons/{id}/progress')
            → API: GET /api/v1/lessons/{id}/progress,
        lib/course.ts::getLessonNote(lessonId)
          → api.get('/lessons/{id}/notes')
            → API: GET /api/v1/lessons/{id}/notes
      ])
    ← { currentPosition, isCompleted }, { content }
    → setLessonProgress, setNoteContent, setAppState
```

#### 14. Xem video — Theo dõi tiến độ
```
YoutubePlayer.processTracking (mỗi 1s)
  → Props.onProgress(currentTime)
    → LearningPage.handleProgressUpdate(currentTime)  [useCallback]
      → Kiểm tra |roundedTime - lastSent| ≥ 5
      → lib/course.ts::updateLessonProgress(lessonId, position, duration)
        → api.post('/lessons/{id}/progress', { position, duration })
          → API: POST /api/v1/lessons/{id}/progress

YoutubePlayer.beforeunload
  → Props.onFlush(lastTime)
    → LearningPage.handleFlushUpdate(time)            [useCallback]
      → lib/course.ts::updateLessonProgress(...)
```

#### 15. Làm quiz
```
LearningPage.handleStartQuiz
  → lib/course.ts::startQuiz(lessonId)
    → api.post('/lessons/{id}/quiz/start')
      → API: POST /api/v1/lessons/{id}/quiz/start
  ← QuizSession { sessionId, questions[], expiresAt }
  → setQuizSession, setAppState('quiz_doing'), startTimer()

LearningPage.handleAnswerChange(questionId, optionId)
  → setAnswers({ ...prev, [questionId]: optionId })   [local state only]

LearningPage.handleSubmitQuiz
  → lib/course.ts::submitQuiz(lessonId, sessionId, answers)
    → api.post('/lessons/{id}/quiz/submit', { sessionId, answers })
      → API: POST /api/v1/lessons/{id}/quiz/submit
  ← QuizResult { score, questions[] (kèm selectedId, correctId) }
  → setQuizResult, setAppState('quiz_result')

LearningPage.startTimer (mỗi 1s)
  → setTimeLeft(remaining)
  → NẾU remaining ≤ 0: auto handleSubmitQuiz()
```

#### 16. Lưu ghi chú
```
LearningPage.handleSaveNote
  → lib/course.ts::saveLessonNote(lessonId, noteContent)
    → api.put('/lessons/{id}/notes', { content })
      → API: PUT /api/v1/lessons/{id}/notes
```

#### 17. Xem danh sách khóa học đã ghi danh
```
MyLearningPage.loadCourses
  → lib/course.ts::getEnrolledCourses(filter?)
    → api.get('/courses/enrolled', { params: { filter } })
      → API: GET /api/v1/courses/enrolled?filter=...
  ← { courses: EnrolledCourse[] }

MyLearningPage.handleCourseClick(courseId)
  → router.push('/courses/{id}/learn')
```

---

### C. LECTURER FLOWS

#### 18. Xem danh sách khóa học giảng viên
```
LecturerCoursesPage.fetchCourses(status)
  → lib/lecturer.ts::getLecturerCourses(params?)
    → api.get('/management/courses', { params })
      → API: GET /api/v1/management/courses?status=...
  ← LecturerCourse[]
  → NẾU tab Draft: filter client-side status === 'DRAFT'
```

#### 19. Tạo khóa học mới
```
LecturerCoursesPage.onClick("Tạo khóa học")
  → lib/lecturer.ts::createCourse({ title: 'Khóa học mới' })
    → api.post('/management/courses', data)
      → API: POST /api/v1/management/courses
  ← { id }
  → router.push('/lecturer/courses/{id}/edit')
```

#### 20. Chỉnh sửa khóa học (Editor)
```
CourseEditPage.fetchCourseStructure
  → lib/lecturer.ts::getCourseStructure(courseId)
    → api.get('/management/courses/{id}/sections')
      → API: GET /api/v1/management/courses/{id}/sections
  ← CourseStructure { courseId, title, status, chapters[] }

CourseEditPage.handleCreateSection
  → lib/lecturer.ts::createSection(courseId, { title, orderIndex })
    → api.post('/management/courses/{id}/sections', data)
      → API: POST /api/v1/management/courses/{id}/sections

CourseEditPage.handleCreateLesson(sectionId)
  → lib/lecturer.ts::createLesson(sectionId, lessonData)
    → api.post('/management/sections/{id}/lessons', data)
      → API: POST /api/v1/management/sections/{id}/lessons

CourseEditPage.handleSaveAll
  → CourseEditPage.buildContentPayload()              [local state → DTO]
  → lib/lecturer.ts::updateCourseContent(courseId, payload)
    → api.put('/management/courses/{id}/content', data)
      → API: PUT /api/v1/management/courses/{id}/content

CourseEditPage.handleQuizParse
  → lib/lecturer.ts::parseQuizFile(file)
    → api.post('/management/quiz/parse', FormData)
      → API: POST /api/v1/management/quiz/parse
  ← { data: ParsedQuestion[], count }

CourseEditPage.handleQuizUpload(lessonId)
  → lib/lecturer.ts::uploadQuizFile(lessonId, file)
    → api.post('/management/lessons/{id}/quiz/upload', FormData)
      → API: POST /api/v1/management/lessons/{id}/quiz/upload

CourseEditPage.handlePublish
  → lib/lecturer.ts::publishCourse(courseId)
    → api.patch('/management/courses/{id}/publish')
      → API: PATCH /api/v1/management/courses/{id}/publish
  ← { status: 'PENDING' }
  → router.push('/lecturer/courses')
```

#### 21. Xem trước khóa học (Preview)
```
CoursePreviewPage.fetchCourseStructure
  → lib/lecturer.ts::getCourseStructure(courseId)     [Giống #20]

CoursePreviewPage.fetchLessonPreview(lessonId)
  → lib/lecturer.ts::getLessonPreview(courseId, lessonId)
    → api.get('/management/courses/{id}/preview/lessons/{lessonId}')
      → API: GET /api/v1/management/courses/{id}/preview/lessons/{lessonId}
  ← LessonPreview { title, type, content, videoUrl, quizQuestions[] }
  → Render: VIDEO → YoutubePlayer, QUIZ → danh sách câu hỏi + đáp án đúng
```

---

### D. ADMIN FLOWS

#### 22. Xem hàng đợi duyệt
```
AdminApprovalQueuePage.fetchApprovalQueue
  → lib/admin.ts::getApprovalQueue()
    → api.get('/management/approval-queue')
      → API: GET /api/v1/management/approval-queue
  ← ApprovalQueueItem[]
```

#### 23. Duyệt / Từ chối khóa học
```
AdminApprovalQueuePage.handleModerate(courseId, 'APPROVE')
  → lib/admin.ts::moderateCourse(courseId, { action: 'APPROVE' })
    → api.patch('/management/courses/{id}/moderate', data)
      → API: PATCH /api/v1/management/courses/{id}/moderate
  ← success
  → alert("Đã duyệt") → reload queue

AdminApprovalQueuePage.handleModerate(courseId, 'REJECT')
  → prompt("Nhập lý do từ chối")
  → lib/admin.ts::moderateCourse(courseId, { action: 'REJECT', rejectNote })
    → api.patch('/management/courses/{id}/moderate', data)
      → API: PATCH /api/v1/management/courses/{id}/moderate
  ← success
  → alert("Đã từ chối") → reload queue
```

---

## III. CROSS-CUTTING: AUTH TOKEN FLOW

```
MỌI API call qua lib/api.ts axios instance:
  → Request Interceptor:
    → AuthUtils.getAccessToken()                      [localStorage]
    → Gắn header: Authorization: Bearer {token}
  → Response:
    → NẾU 401: token hết hạn → cần refresh
    → (Hiện tại chưa có auto-refresh interceptor ở FE)

Login flow lưu token:
  LoginPage → loginUser() → response.accessToken
    → AuthUtils.setTokens(accessToken, refreshToken)
    → localStorage: 'accessToken', 'refreshToken'
    → AuthUtils parse JWT payload → localStorage: 'user'

Mỗi Page mount:
  → AuthUtils.getCurrentUser()
    → localStorage.getItem('user')
    → JSON.parse → User { id, email, fullName, role }
  → setUser(user)
```

---

## IV. NAVIGATION MAP (Sơ đồ điều hướng)

```
/ (Home)
├─ /join (Gateway)
│   ├─ /login?email=...&continueUrl=...
│   │   ├─ /forgot-password
│   │   │   └─ /reset-password?token=...
│   │   └─ → (redirectUrl từ BE — thường / hoặc continueUrl)
│   └─ /register?email=...&continueUrl=...
│       └─ → Toast "Kiểm tra email"
│           └─ /activate?token=... → /join (sau 3s)
│
├─ /courses/{id} (Chi tiết)
│   ├─ → /join?continueUrl=... (nếu chưa login)
│   └─ /courses/{id}/learn (nếu đã enroll)
│
├─ /my-learning (STUDENT)
│   └─ /courses/{id}/learn
│
├─ /profile
├─ /change-password
│
├─ /lecturer/courses (LECTURER)
│   ├─ /lecturer/courses/{id}/edit (DRAFT)
│   └─ /lecturer/courses/{id}/view (PENDING/ACTIVE)
│
└─ /admin/approval-queue (ADMIN)
    └─ /lecturer/courses/{id}/view (xem trước khi duyệt)
```
