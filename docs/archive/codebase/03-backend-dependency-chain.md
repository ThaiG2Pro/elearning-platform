# 🔗 BACKEND — CHUỖI PHỤ THUỘC (DEPENDENCY CHAIN)

> Mỗi request đi qua các file/function theo thứ tự. Dùng tài liệu này để debug/refactor/update.
> Format: `file.function` → `file.function` → ...

---

## I. AUTH MODULE

### 1. POST /api/v1/auth/identify
```
src/app/api/v1/auth/identify/route.ts::POST
  → AuthController.identify(IdentifyDto)
    → AuthService.identifyUser(email)
      → UserRepository.findByEmail(email)           [DB: users + roles]
      → IdentityPolicy.determineNextAction(user)     [Domain logic]
    ← IdentifyResponseDto
```

### 2. POST /api/v1/auth/register
```
src/app/api/v1/auth/register/route.ts::POST
  → AuthController.register(RegisterDto)
    → AuthService.registerNewUser(dto)
      → UserRepository.deleteInactiveUsersOlderThan24Hours()  [DB: users DELETE]
      → UserRepository.findByEmail(email)                      [DB: users]
      → RegistrationPolicy.validateRegistrationEligibility(user) [Domain]
      → UserFactory.createInactiveUser(email, pwd, name, age)   [Domain + DB: roles]
        HOẶC UserFactory.reconstituteForOverwrite(existingUser, ...)
      → UserRepository.save(userEntity)                         [DB: users CREATE/UPDATE]
      → TokenRepository.revokeAllByType(userId, 'ACTIVATION')  [DB: tokens UPDATE]
      → TokenFactory.createActivationToken(userId)              [Domain: uuid]
      → TokenRepository.save(tokenEntity)                       [DB: tokens CREATE]
      → NodemailerEmailAdapter.sendActivationEmail(email, code) [async, Mailtrap]
    ← RegisterResponseDto
```

### 3. POST /api/v1/auth/activate
```
src/app/api/v1/auth/activate/route.ts::POST
  → AuthController.activate(ActivateDto)
    → AuthService.activateAccount(tokenStr)
      → TokenRepository.findByCode(tokenStr)         [DB: tokens]
      → TokenPolicy.validateActivationToken(token)    [Domain]
      → UserRepository.findById(userId)               [DB: users]
      → user.activate()                               [Domain: status = ACTIVE]
      → UserRepository.save(user)                     [DB: users UPDATE]
      → TokenRepository.markAsUsed(token)             [DB: tokens UPDATE]
      → LoginNavigationPolicy.determineRedirectUrl(user) [Domain]
    ← ActivateResponseDto
```

### 4. POST /api/v1/auth/login
```
src/app/api/v1/auth/login/route.ts::POST
  → AuthController.login(LoginDto)
    → AuthService.login(dto)
      → UserRepository.findByEmail(email)              [DB: users + roles]
      → user.matchPassword(password)                    [Domain: bcrypt.compare]
      → user.isActive()                                 [Domain]
      → TokenFactory.createAuthTokens(user)             [Domain: JWT sign]
      → user.updateLastLogin()                          [Domain]
      → UserRepository.save(user)                       [DB: users UPDATE]
      → LoginNavigationPolicy.determineRedirectUrl(user, continueUrl) [Domain]
    ← LoginResponseDto
  → route.ts set cookie 'refreshToken' (httpOnly)
```

### 5. POST /api/v1/auth/logout
```
src/app/api/v1/auth/logout/route.ts::POST
  → Xóa cookie 'refreshToken' (maxAge: 0)
  ← { message: 'Logged out successfully' }
```

### 6. POST /api/v1/auth/refresh
```
src/app/api/v1/auth/refresh/route.ts::POST
  → Đọc cookie 'refreshToken'
  → TokenFactory.verifyRefreshToken(refreshToken)       [Domain: JWT verify]
  → UserRepository.findById(userId)                     [DB: users + roles]
  → user.isActive()                                     [Domain]
  → TokenFactory.createAuthTokens(user)                 [Domain: JWT sign]
  → Set cookie mới
  ← { accessToken, user }
```

### 7. POST /api/v1/auth/forgot-password
```
src/app/api/v1/auth/forgot-password/route.ts::POST
  → AuthController.forgot(ForgotDto)
    → AuthService.requestPasswordReset(email)
      → UserRepository.findByEmail(email)               [DB: users]
      → user.isActive() check
      → TokenRepository.revokeAllByType(userId, 'RECOVERY') [DB: tokens UPDATE]
      → TokenFactory.createRecoveryToken(userId)         [Domain: uuid]
      → TokenRepository.save(tokenEntity)                [DB: tokens CREATE]
      → NodemailerEmailAdapter.sendRecoveryEmail(email, code) [async]
    ← ForgotResponseDto (luôn trả success để chống enumeration)
```

### 8. POST /api/v1/auth/reset-password
```
src/app/api/v1/auth/reset-password/route.ts::POST
  → AuthController.reset(ResetDto)
    → AuthService.resetPassword(dto)
      → TokenRepository.findByCode(token)               [DB: tokens]
      → RecoveryPolicy.validateRecoveryToken(token)      [Domain]
      → UserRepository.findById(userId)                  [DB: users]
      → user.changePassword(password)                    [Domain: bcrypt.hash]
      → UserRepository.save(user)                        [DB: users UPDATE]
      → TokenRepository.markAsUsed(token)                [DB: tokens UPDATE]
    ← ResetResponseDto
```

### 9. GET /api/v1/auth/profile
```
src/app/api/v1/auth/profile/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware: JWT verify]
  → AuthController.getProfile(userId)
    → AuthService.getProfile(userId)
      → UserRepository.findById(userId)                  [DB: users + roles]
    ← { id, email, fullName, age, role }
```

### 10. PUT /api/v1/auth/profile
```
src/app/api/v1/auth/profile/route.ts::PUT
  → getUserIdFromRequest(request)                        [Middleware]
  → AuthController.updateProfile(userId, UpdateProfileDto)
    → AuthService.updateProfile(userId, dto)
      → UserRepository.findById(userId)                  [DB: users]
      → user.updateProfile(fullName, age)                [Domain]
      → UserRepository.save(user)                        [DB: users UPDATE]
    ← UpdateProfileResponseDto
```

### 11. PUT /api/v1/auth/change-password
```
src/app/api/v1/auth/change-password/route.ts::PUT
  → getUserIdFromRequest(request)                        [Middleware]
  → AuthController.changePassword(userId, ChangePasswordDto)
    → AuthService.changePassword(userId, dto)
      → UserRepository.findById(userId)                  [DB: users]
      → user.matchPassword(currentPassword)              [Domain: bcrypt.compare]
      → user.changePassword(newPassword)                 [Domain: bcrypt.hash]
      → UserRepository.save(user)                        [DB: users UPDATE]
    ← ChangePasswordResponseDto
```

---

## II. COURSE MODULE (Công khai)

### 12. GET /api/v1/courses
```
src/app/api/v1/courses/route.ts::GET
  → CourseController.getCourses(search?)
    → CourseService.getCourses(search?)
      → CourseRepository.findActiveCoursesWithThumbnails(search) [DB: courses WHERE ACTIVE]
        → CourseRepository.getCourseThumbnailUrl(courseId)       [DB: courses+chapters+lessons]
          → VideoThumbnailUtil.findFirstVideoUrl(chapters)       [Util]
          → VideoThumbnailUtil.deriveThumbnailFromVideoUrl(url)  [Util]
    ← CourseListDto[]
```

### 13. GET /api/v1/courses/:id
```
src/app/api/v1/courses/[id]/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware, optional]
  → CourseController.getCourseDetail(courseId, userId?)
    → CourseService.getCourseDetail(courseId, userId?)
      → CourseRepository.findByIdWithFullStructure(id)   [DB: courses+chapters+lessons+lecturer]
      → EnrollmentRepository.findByStudentAndCourse(userId, courseId) [DB: enrollments]
      → VideoThumbnailUtil.findFirstVideoUrl + deriveThumbnail [Util]
    ← CourseDetailDto
```

### 14. POST /api/v1/courses/:id/enroll
```
src/app/api/v1/courses/[id]/enroll/route.ts::POST
  → getUserFromRequest(request)                          [Middleware: id + role]
  → Check role === 'STUDENT'                             [Route-level]
  → EnrollmentController.enrollStudent(userId, courseId)
    → EnrollmentService.enrollStudent(userId, courseId)
      → CourseRepository.findActiveById(courseId)         [DB: courses]
      → EnrollmentPolicy.validateCourseAvailability(course) [Domain]
      → EnrollmentRepository.findByStudentAndCourse(...)  [DB: enrollments, idempotency]
      → EnrollmentFactory.createEnrollment(userId, courseId) [Domain]
      → EnrollmentRepository.save(enrollment)             [DB: enrollments CREATE]
    ← EnrollResult { redirectUrl }
```

### 15. GET /api/v1/courses/:id/enroll
```
src/app/api/v1/courses/[id]/enroll/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware]
  → EnrollmentController.checkEnrollmentStatus(userId, courseId)
    → EnrollmentService.checkEnrollmentStatus(userId, courseId)
      → EnrollmentRepository.findByStudentAndCourse(...)  [DB: enrollments]
    ← boolean
```

### 16. GET /api/v1/courses/enrolled
```
src/app/api/v1/courses/enrolled/route.ts::GET
  → getUserFromRequest(request)                          [Middleware]
  → EnrollmentController.getEnrolledCourses(userId, filter?, sort?)
    → EnrollmentService.getEnrolledCourses(userId, filter, sort)
      → EnrollmentRepository.getEnrolledCoursesWithDetails(studentId, filter, sort)
        [DB: enrollments+courses+chapters+lessons]
        → VideoThumbnailUtil.findFirstVideoUrl + deriveThumbnail [Util]
    ← EnrolledCourseDto[]
```

### 17. GET /api/v1/courses/:id/lessons
```
src/app/api/v1/courses/[id]/lessons/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware]
  → CourseController.getCourseDetail(courseId, userId)
    → CourseService.getCourseDetail(...)                  [DB: courses+chapters+lessons]
  → Check isEnrolled
  → LearningProgressRepository.findByStudentAndLesson(userId, lessonId) [DB: learning_progress, per lesson]
  ← lessons[] (kèm isCompleted per lesson)
```

---

## III. LEARNING MODULE (Học viên)

### 18. GET /api/v1/lessons/:id/play
```
src/app/api/v1/lessons/[id]/play/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware]
  → LessonController.getVideoContext(userId, lessonId)
    → LessonRepository.findById(lessonId)                [DB: lessons]
    → prisma.chapters.findUnique({id})                   [DB: chapters]
    → EnrollmentRepository.findByStudentAndCourse(...)   [DB: enrollments]
    → prisma.learning_progress.findFirst(...)            [DB: learning_progress]
  ← VideoContextDto { lessonId, videoUrl, duration, lastPosition, isFinished }
```

### 19. GET /api/v1/lessons/:id/progress
```
src/app/api/v1/lessons/[id]/progress/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware]
  → LearnController.getProgress(userId, lessonId)
    → LearnService.getProgress(userId, lessonId)
      → LearningProgressRepository.findByStudentAndLesson(...) [DB: learning_progress]
  ← { currentPosition, isCompleted, lastAccessedAt }
```

### 20. POST /api/v1/lessons/:id/progress
```
src/app/api/v1/lessons/[id]/progress/route.ts::POST
  → getUserIdFromRequest(request)                        [Middleware]
  → LearnController.trackVideoProgress(userId, lessonId, position, duration, isPreview)
    → LearnService.trackVideoProgress(...)
      → PreviewPolicy.shouldPersist(isPreview)           [Domain]
      → LearningProgressRepository.findByStudentAndLesson(...) [DB]
      → HOẶC findEnrollmentByLesson (lessons+chapters+courses → enrollments)
      → progress.updatePosition(position)                [Domain]
      → ProgressPolicy.checkCompletionCondition(position, duration) [Domain: ≥80%]
      → progress.tryFinish(isValidToFinish)              [Domain]
      → LearningProgressRepository.save(progress)        [DB: CREATE/UPDATE]
      → NẾU statusChanged: recalculateCourseProgress
        → EnrollmentRepository.findById(enrollmentId)    [DB]
        → prisma.lessons.findMany(WHERE courseId)         [DB]
        → LearningProgressRepository.findByEnrollment    [DB]
        → EnrollmentRepository.save(enrollment)           [DB: UPDATE completion_rate]
  ← ProgressResult { isFinished }
```

### 21. GET /api/v1/lessons/:id/notes
```
src/app/api/v1/lessons/[id]/notes/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware]
  → LearnController.getNote(userId, lessonId)
    → NoteService.getNote(userId, lessonId)
      → findEnrollmentByLesson(userId, lessonId)         [DB: lessons+chapters+courses+enrollments]
      → NoteRepository.findByStudentAndLesson(userId, lessonId) [DB: learning_progress]
  ← { content, updatedAt } hoặc { content: '', updatedAt: null }
```

### 22. PUT /api/v1/lessons/:id/notes
```
src/app/api/v1/lessons/[id]/notes/route.ts::PUT
  → getUserIdFromRequest(request)                        [Middleware]
  → LearnController.saveNote(userId, lessonId, content)
    → NoteService.saveNote(userId, lessonId, content)
      → Validate content.length ≤ 1000                  [Service rule]
      → findEnrollmentByLesson(userId, lessonId)         [DB]
      → NoteRepository.findByStudentAndLesson(userId, lessonId) [DB]
      → NẾU đã có: existingNote.updateContent(content)  [Domain]
        → NoteRepository.save(note)                      [DB: UPDATE learning_progress.personal_note]
      → NẾU chưa có: Note.create(...)                   [Domain]
        → NoteRepository.create(note)                    [DB: CREATE/UPDATE learning_progress]
  ← { status: 'SAVED' }
```

### 23. GET /api/v1/lessons/:id/quiz
```
src/app/api/v1/lessons/[id]/quiz/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware]
  → QuizController.generateQuiz(lessonId)
    → QuizService.generateQuiz(lessonId)
      → QuestionRepository.findRandomByLesson(lessonId, 10) [DB: questions, shuffle]
      → Strip correctAnswer (bảo mật)
  ← QuizQuestionsDto { questions[] }
```

### 24. POST /api/v1/lessons/:id/quiz/start
```
src/app/api/v1/lessons/[id]/quiz/start/route.ts::POST
  → getUserFromRequest(request)                          [Middleware]
  → QuizController.startQuiz(userId, lessonId)
    → QuizService.startQuiz(userId, lessonId)
      → LearningProgressRepository.findByStudentAndLesson(...) [DB]
      → HOẶC findEnrollmentByLesson → LearningProgress.create
      → progress.startQuiz()                             [Domain: set quizStartTime]
      → QuizService.generateQuiz(lessonId)               [DB: questions random 10]
      → progress.setQuizQuestions(questionIds)            [Domain]
      → LearningProgressRepository.save(progress)        [DB]
    → QuestionRepository.findByIds(questionIds)          [DB]
    → Map câu hỏi sang FE format (ẩn đáp án)
  ← { sessionId, questions[], expiresAt }
```

### 25. POST /api/v1/lessons/:id/quiz/submit
```
src/app/api/v1/lessons/[id]/quiz/submit/route.ts::POST
  → getUserIdFromRequest(request)                        [Middleware]
  → QuizController.submitQuiz(userId, lessonId, SubmitQuizDto)
    → QuizService.getProgress(userId, lessonId)          [DB: learning_progress]
    → Check isQuizTimeout → auto 0 score nếu timeout    [Domain]
    → QuizService.submitQuiz(userId, lessonId, dtoIndex)
      → QuestionRepository.findByIds(questionIds)        [DB: questions]
      → Chấm điểm: so sánh userAnswer vs QuizPolicy.keyToIndex(correctAnswer)
      → progress.updateQuizResult(score, isPassed≥80%)   [Domain]
      → LearningProgressRepository.save(progress)        [DB]
      → NẾU statusChanged: recalculateCourseProgress     [DB: enrollment UPDATE]
    → QuestionRepository.findByIds (cho response mapping) [DB]
    → Map corrections
  ← { score, questions[] (kèm selectedId + correctId), submittedAt }
```

### 26. GET /api/v1/lessons/:id/quiz/results
```
src/app/api/v1/lessons/[id]/quiz/results/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware]
  → QuizController.getQuizResults(userId, lessonId)
    → QuizService.getQuizResults(userId, lessonId)
      → LearningProgressRepository.findByStudentAndLesson(...) [DB]
  ← QuizAttemptDto[] (best score)
```

---

## IV. MANAGEMENT MODULE (Giảng viên + Admin)

### 27. GET /api/v1/management/courses
```
src/app/api/v1/management/courses/route.ts::GET
  → getUserFromRequest(request)                          [Middleware: check LECTURER]
  → ManagementController.getLecturerCourses(userId, status?)
    → ContentManagementService.getLecturerCourses(lecturerId, status)
      → prisma.courses.findMany(WHERE lecturer_id + status) [DB: courses+chapters+lessons]
      → VideoThumbnailUtil.findFirstVideoUrl + deriveThumbnail
      → Normalize REJECTED → DRAFT
  ← CourseSummaryDto[] (BigInt → number conversion)
```

### 28. POST /api/v1/management/courses
```
src/app/api/v1/management/courses/route.ts::POST
  → getUserFromRequest(request)                          [Middleware: check LECTURER]
  → ManagementController.createCourse(userId, CreateCourseDto)
    → ContentManagementService.createCourse(lecturerId, dto)
      → new Course(..., CourseStatus.DRAFT)               [Domain]
      → CourseRepository.save(course)                     [DB: courses CREATE]
  ← { courseId, status: 'DRAFT' }
```

### 29. GET /api/v1/management/courses/:id/sections
```
src/app/api/v1/management/courses/[id]/sections/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware]
  → prisma.courses.findUnique(courseId)                  [DB: check exists]
  → Check lecturer_id === userId                         [Route-level access control]
  → Check status !== ACTIVE
  → ManagementController.getCourseSections(courseId)
    → ContentManagementService.getCourseSections(courseId)
      → prisma.chapters.findMany(WHERE courseId + lessons) [DB]
  ← { courseId, status, sections[] }
```

### 30. POST /api/v1/management/courses/:id/sections
```
src/app/api/v1/management/courses/[id]/sections/route.ts::POST
  → getUserIdFromRequest(request)                        [Middleware]
  → prisma.courses.findUnique(courseId)                  [DB]
  → Check owner + DRAFT status
  → ManagementController.createSection(courseId, CreateSectionDto)
    → ContentManagementService.createSection(courseId, dto)
      → prisma.chapters.create(...)                      [DB: chapters CREATE]
  ← { sectionId }
```

### 31. PUT /api/v1/management/sections/:id
```
src/app/api/v1/management/sections/[id]/route.ts::PUT
  → getUserIdFromRequest(request)                        [Middleware]
  → ManagementController.updateSection(sectionId, UpdateSectionDto)
    → ContentManagementService.updateSection(sectionId, dto)
      → prisma.chapters.update(...)                      [DB: chapters UPDATE]
  ← { message }
```

### 32. DELETE /api/v1/management/sections/:id
```
src/app/api/v1/management/sections/[id]/route.ts::DELETE
  → getUserIdFromRequest(request)                        [Middleware]
  → CourseManagementController.deleteSection(userId, sectionId)
    → CourseManagementService.deleteSection(userId, sectionId)
      → SectionRepository.findById(sectionId)            [DB: chapters]
      → AccessControlPolicy.validateOwnership(userId, ownerId)
      → CourseRepository.findById(courseId)               [DB: courses]
      → SectionRepository.countByCourse(courseId)         [DB: COUNT chapters]
      → PublishingPolicy.validateDeletionEligibility(course, count)
      → SectionRepository.deleteWithLessons(sectionId)   [DB: DELETE lessons + chapters]
  ← { message }
```

### 33. POST /api/v1/management/sections/:id/lessons
```
src/app/api/v1/management/sections/[id]/lessons/route.ts::POST
  → getUserIdFromRequest(request)                        [Middleware]
  → ManagementController.createLesson(sectionId, CreateLessonDto)
    → ContentManagementService.createLesson(sectionId, dto)
      → prisma.lessons.create(...)                       [DB: lessons CREATE]
  ← { lessonId }
```

### 34. PUT /api/v1/management/lessons/:id
```
src/app/api/v1/management/lessons/[id]/route.ts::PUT
  → getUserIdFromRequest(request)                        [Middleware]
  → ManagementController.updateLesson(lessonId, UpdateLessonDto)
    → ContentManagementService.updateLesson(lessonId, dto)
      → prisma.lessons.update(...)                       [DB: lessons UPDATE]
  ← { message }
```

### 35. DELETE /api/v1/management/lessons/:id
```
src/app/api/v1/management/lessons/[id]/route.ts::DELETE
  → getUserIdFromRequest(request)                        [Middleware]
  → ManagementController.deleteLesson(lessonId)
    → ContentManagementService.deleteLesson(lessonId)
      → prisma.lessons.delete(...)                       [DB: lessons DELETE]
  ← { message }
```

### 36. PUT /api/v1/management/courses/:id/content
```
src/app/api/v1/management/courses/[id]/content/route.ts::PUT
  → getUserIdFromRequest(request)                        [Middleware]
  → CourseManagementController.syncCourseContent(userId, courseId, BulkCourseContentDto)
    → CourseManagementService.syncCourseContent(userId, courseId, dto)
      → CourseRepository.findById(courseId)               [DB: courses]
      → Check status === DRAFT
      → AccessControlPolicy.validateOwnership(userId, lecturerId)
      → Duyệt sections/lessons:
        → YouTubeAdapter.fetchMetadata(contentUrl)       [API YouTube, per video]
        → LessonFactory.createVideoLesson / createQuizLesson [Domain]
      → LessonRepository.syncLessons(courseId, lessons)  [DB: DELETE all + CREATE new]
  ← { success: true }
```

### 37. PATCH /api/v1/management/courses/:id/publish
```
src/app/api/v1/management/courses/[id]/publish/route.ts::PATCH
  → getUserIdFromRequest(request)                        [Middleware]
  → CourseManagementController.submitForApproval(userId, courseId)
    → CourseManagementService.submitForApproval(userId, courseId)
      → CourseRepository.findByIdWithFullStructure(courseId) [DB: full]
      → AccessControlPolicy.validateOwnership(userId, lecturerId)
      → PublishingPolicy.validateMinimumViableContent(course) [Domain: title, desc, chapters+lessons]
      → course.submit()                                  [Domain: DRAFT→PENDING]
      → CourseRepository.save(course)                    [DB: courses UPDATE]
  ← { message, status: 'PENDING' }
```

### 38. GET /api/v1/management/approval-queue
```
src/app/api/v1/management/approval-queue/route.ts::GET
  → getUserIdFromRequest(request)                        [Middleware]
  → ApprovalController.getPendingCourses()
    → ApprovalService.getPendingCourses()
      → CourseRepository.findPendingCourses()            [DB: courses WHERE PENDING + lecturer]
  ← PendingCourseDto[]
```

### 39. PATCH /api/v1/management/courses/:id/moderate
```
src/app/api/v1/management/courses/[id]/moderate/route.ts::PATCH
  → getUserIdFromRequest(request)                        [Middleware]
  → Validate action + rejectNote
  → ApprovalController.moderateCourse(adminId, courseId, ModerateCourseDto)
    → ApprovalService.moderateCourse(adminId, courseId, dto)
      → CourseRepository.findById(courseId)               [DB: courses]
      → PublishingPolicy.validateModerationEligibility(course.status) [Domain: PENDING only]
      → APPROVE: course.approve()                        [Domain: PENDING→ACTIVE]
        HOẶC REJECT: PublishingPolicy.validateRejectNote + course.reject(note) [Domain: PENDING→DRAFT]
      → CourseRepository.save(course)                    [DB: courses UPDATE]
  ← { message, status }
```

### 40. GET /api/v1/management/courses/:id/preview/lessons/:lessonId
```
src/app/api/v1/management/courses/[id]/preview/lessons/[lessonId]/route.ts::GET
  → getUserFromRequest(request)                          [Middleware: id + role]
  → CourseManagementController.getLessonPreview(courseId, lessonId, user)
    → CourseManagementService.getLessonPreview(courseId, lessonId, user)
      → LessonRepository.findById(lessonId)              [DB: lessons]
      → SectionRepository.findById(chapterId)            [DB: chapters]
      → CourseRepository.findById(courseId)               [DB: courses]
      → Access control: STUDENT→FORBIDDEN, LECTURER→own+PENDING/ACTIVE, ADMIN→PENDING
      → LessonRepository.findQuizQuestions(lessonId)     [DB: questions]
      → QuizPolicy.keyToIndex(answerKey)                 [Domain]
  ← LessonPreviewDto { id, title, type, content, videoUrl, quizQuestions[] }
```

### 41. POST /api/v1/management/quiz/parse
```
src/app/api/v1/management/quiz/parse/route.ts::POST
  → Đọc FormData file
  → Validate .xlsx/.xls
  → QuizController.parseQuizFile(buffer)
    → QuizService.parseQuizFile(file)
      → ExcelAdapter.readToObjects(file)                 [Adapter: xlsx]
      → QuizValidationPolicy.validateRowStructure(row, index) [Domain]
  ← { success, data: ParsedQuestionDto[], count }
```

### 42. POST /api/v1/management/lessons/:id/quiz/upload
```
src/app/api/v1/management/lessons/[id]/quiz/upload/route.ts::POST
  → getUserFromRequest(request)                          [Middleware: check LECTURER/ADMIN]
  → Đọc FormData file + validate .xlsx/.xls
  → QuizController.uploadQuizForLesson(lessonId, buffer)
    → QuizService.uploadQuizForLesson(lessonId, file)
      → QuizService.parseQuizFile(file)                  [Parse + validate]
      → QuestionRepository.replaceAllForLesson(lessonId, questions) [DB: DELETE + CREATE]
  ← { message, uploadedCount }
```

### 43. POST /api/v1/management/preview/progress
```
src/app/api/v1/management/preview/progress/route.ts::POST
  → getUserIdFromRequest(request)                        [Middleware]
  → ManagementController.trackVideoProgress(userId, TrackProgressDto)
    → LearnService.trackVideoProgress(userId, lessonId, position, duration, isPreview)
      (Giống flow #20, nhưng isPreview=true → PreviewPolicy bypass persistence)
  ← ProgressResult
```
