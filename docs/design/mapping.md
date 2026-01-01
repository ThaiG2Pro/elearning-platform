
# UC 00

| **Component Type** | **Sequence Diagram Name** | **Node.js Class Name** | **File Name (Convention)**  |
| ------------------ | ------------------------- | ---------------------- | --------------------------- |
| **Controller**     | `:AuthController`         | `AuthController`       | `auth.controller.ts`        |
| **Service**        | `:AuthService`            | `AuthService`          | `auth.service.ts`           |
| **Domain Policy**  | `:IdentityPolicy`         | `IdentityPolicy`       | `identity.policy.ts`        |
| **Repository**     | `:UserRepository`         | `UserRepository`       | `user.repository.ts`        |
| **Entity**         | `:User`                   | `UserEntity`           | `user.entity.ts`            |
| **DTO (In)**       | `IdentifyDto`             | `IdentifyDto`          | `identify.dto.ts`           |
| **DTO (Out)**      | `IdentifyResponseDto`     | `IdentifyResponseDto`  | `identify-response.dto.ts`  |
| **Enum**           | `NavigationAction`        | `NavigationAction`     | `navigation-action.enum.ts` |

# UC 02

| **Component Type** | **Sequence Diagram Name** | **Node.js Class Name** | **File Name**            |
| ------------------ | ------------------------- | ---------------------- | ------------------------ |
| **Controller**     | `:AuthController`         | `AuthController`       | `auth.controller.ts`     |
| **Service**        | `:AuthService`            | `AuthService`          | `auth.service.ts`        |
| **Policy**         | `:RegistrationPolicy`     | `RegistrationPolicy`   | `registration.policy.ts` |
| **Policy**         | `:TokenPolicy`            | `TokenPolicy`          | `token.policy.ts`        |
| **Factory**        | `:UserFactory`            | `UserFactory`          | `user.factory.ts`        |
| **Factory**        | `:TokenFactory`           | `TokenFactory`         | `token.factory.ts`       |
| **Entity**         | `:UserEntity`             | `UserEntity`           | `user.entity.ts`         |
| **Repo**           | `:UserRepository`         | `UserRepository`       | `user.repository.ts`     |

# UC 03
| **Component Type** | **Node.js Class Name**  | **File Name**                | **Trạng thái**                                       |
| ------------------ | ----------------------- | ---------------------------- | ---------------------------------------------------- |
| **Controller**     | `AuthController`        | `auth.controller.ts`         | **(Update)** Thêm method `login`                     |
| **Service**        | `AuthService`           | `auth.service.ts`            | **(Update)** Thêm method `login`                     |
| **Entity**         | `UserEntity`            | `user.entity.ts`             | **(Update)** Thêm `matchPassword`, `updateLastLogin` |
| **Factory**        | `TokenFactory`          | `token.factory.ts`           | **(Update)** Thêm `createAuthTokens`                 |
| **Policy**         | `LoginNavigationPolicy` | `login-navigation.policy.ts` | **(New)** Logic Rule 08                              |
| **DTO (In)**       | `LoginDto`              | `login.dto.ts`               | **(New)**                                            |
| **DTO (Out)**      | `LoginResponseDto`      | `login-response.dto.ts`      | **(New)**                                            |
# UC 04

| **Component Type** | **Node.js Class Name** | **File Name**         | **Trạng thái**                              |
| ------------------ | ---------------------- | --------------------- | ------------------------------------------- |
| **Controller**     | `AuthController`       | `auth.controller.ts`  | **(Update)** Thêm 2 endpoints               |
| **Service**        | `AuthService`          | `auth.service.ts`     | **(Update)** Logic Request & Reset          |
| **Entity**         | `UserEntity`           | `user.entity.ts`      | **(Update)** Thêm `changePassword(newPass)` |
| **Repo**           | `TokenRepository`      | `token.repository.ts` | **(Update)** Thêm `revokeAllByType`         |
| **Factory**        | `TokenFactory`         | `token.factory.ts`    | **(Update)** Thêm `createRecoveryToken`     |
| **Policy**         | `RecoveryPolicy`       | `recovery.policy.ts`  | **(New)** Validate token logic              |
| **DTO (In)**       | `ForgotDto`            | `forgot.dto.ts`       | **(New)**                                   |
| **DTO (In)**       | `ResetDto`             | `reset.dto.ts`        | **(New)**                                   |


# UC 05

| **Component Type** | **Node.js Class Name** | **File Name**              | **Giải thích vai trò**                    |
| ------------------ | ---------------------- | -------------------------- | ----------------------------------------- |
| **Controller**     | `EnrollmentController` | `enrollment.controller.ts` | Endpoint API                              |
| **Service**        | `EnrollmentService`    | `enrollment.service.ts`    | Orchestrator (Điều phối)                  |
| **Policy**         | `EnrollmentPolicy`     | `enrollment.policy.ts`     | Check Rule (Active, Exist)                |
| **Factory**        | `EnrollmentFactory`    | `enrollment.factory.ts`    | **(Mới)** Tạo instance với default values |
| **Repo**           | `EnrollmentRepository` | `enrollment.repository.ts` | Tương tác DB                              |
| **Entity**         | `EnrollmentEntity`     | `enrollment.entity.ts`     | Định nghĩa Schema DB                      |
| **DTO**            | `EnrollResponseDto`    | `enroll-response.dto.ts`   | Output trả về                             |

# UC 06

| **Component Type** | **Sequence Diagram Name** | **Node.js Class Name**       | **File Name**                     |
| ------------------ | ------------------------- | ---------------------------- | --------------------------------- |
| **Controller**     | `:LearnController`        | `LearnController`            | `learn.controller.ts`             |
| **Service**        | `:LearnService`           | `LearnService`               | `learn.service.ts`                |
| **Policy**         | `:ProgressPolicy`         | `ProgressPolicy`             | `progress.policy.ts`              |
| **Repo**           | `:LearningProgressRepo`   | `LearningProgressRepository` | `learning-progress.repository.ts` |
| **Entity**         | `:LearningProgressEntity` | `LearningProgressEntity`     | `learning-progress.entity.ts`     |
| **DTO (In)**       | `ProgressDto`             | `ProgressDto`                | `progress.dto.ts`                 |
| **DTO (Out)**      | `ProgressResult`          | `ProgressResponseDto`        | `progress-response.dto.ts`        |

**Spec chi tiết cho `LearningProgressEntity` methods:**

1. **`updatePosition(pos: number)`**:

    - Logic: `this.lastPosition = pos;`

2. **`tryFinish(isValid: boolean): boolean`**:

    - Logic:
```Typescript
if (this.isFinished) return false; // Đã xong từ trước -> Không thay đổi
if (isValid) {
    this.isFinished = true;
    this.finishedAt = new Date();
    return true; // Vừa mới xong -> Báo hiệu để tính điểm
}
return false;
```


# UC 07

| **Component Type** | **Sequence Diagram Name** | **Node.js Class Name** | **File Name**         |
| ------------------ | ------------------------- | ---------------------- | --------------------- |
| **Controller**     | `:LearnController`        | `LearnController`      | `learn.controller.ts` |
| **Service**        | `:NoteService`            | `NoteService`          | `note.service.ts`     |
| **Repo**           | `:NoteRepository`         | `NoteRepository`       | `note.repository.ts`  |
| **Entity**         | `:NoteEntity`             | `NoteEntity`           | `note.entity.ts`      |
| **DTO (In)**       | `NoteDto`                 | `NoteDto`              | `note.dto.ts`         |

# UC 08

| **Component Type** | **Sequence Diagram Name** | **Node.js Class Name**       | **File Name (Convention)**        | **Ghi chú kỹ thuật**                                                           |
| ------------------ | ------------------------- | ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| **Controller**     | `:QuizController`         | `QuizController`             | `quiz.controller.ts`              | Tách riêng khỏi `LearnController` để quản lý logic thi cử độc lập.             |
| **Service**        | `:QuizService`            | `QuizService`                | `quiz.service.ts`                 | Điều phối việc lấy đề ngẫu nhiên và chấm bài.                                  |
| **Policy**         | `:QuizPolicy`             | `QuizPolicy`                 | `quiz.policy.ts`                  | **(Quan trọng)** Chứa logic chấm điểm: So khớp đáp án user vs DB, tính % điểm. |
| **Repository**     | `:QuestionRepository`     | `QuestionRepository`         | `question.repository.ts`          | Cần method: `findRandomByLesson()` và `findAnswersByIds()`.                    |
| **Repository**     | `:LearningProgressRepo`   | `LearningProgressRepository` | `learning-progress.repository.ts` | **(Reuse)** Tái sử dụng từ BUCD-06.                                            |
| **Entity**         | `:QuestionEntity`         | `QuestionEntity`             | `question.entity.ts`              | Mapping bảng `questions`.                                                      |
| **Entity**         | `:LearningProgressEntity` | `LearningProgressEntity`     | `learning-progress.entity.ts`     | **(Update)** Thêm method `updateQuizResult()` để xử lý Rule 28 (Max Score).    |
| **DTO (Out)**      | `QuizQuestionsDto`        | `QuizQuestionsDto`           | `quiz-questions.dto.ts`           | Dùng cho API Start. **Tuyệt đối không chứa field `isCorrect`**.                |
| **DTO (In)**       | `SubmitQuizDto`           | `SubmitQuizDto`              | `submit-quiz.dto.ts`              | Dùng cho API Submit. Chứa mảng `answers`.                                      |
| **DTO (Out)**      | `QuizResultDto`           | `QuizResultDto`              | `quiz-result.dto.ts`              | Dùng cho API Submit. Chứa `score`, `isPassed`, `correction`.                   |

# UC 09a


| **Component Type** | **Node.js Class Name**       | **File Name**                     | **Vai trò**                     |
| ------------------ | ---------------------------- | --------------------------------- | ------------------------------- |
| **Controller**     | `CourseManagementController` | `course-management.controller.ts` | Đầu mối cho Lecturer            |
| **Service**        | `CourseManagementService`    | `course-management.service.ts`    | Điều phối Add/Edit/Delete       |
| **Policy**         | `AccessControlPolicy`        | `access-control.policy.ts`        | **(Cụm 3)** Check Ownership     |
| **Policy**         | `PublishingPolicy`           | `publishing.policy.ts`            | **(Cụm 3)** Check State Machine |
| **Repo**           | `SectionRepository`          | `section.repository.ts`           | Cần method `deleteCascade`      |
| **Entity**         | `SectionEntity`              | `section.entity.ts`               | Có trường `orderIndex`          |
# UC 09b


| **Component Type** | **Node.js Class Name**       | **File Name**                     | **Vai trò**                             |
| ------------------ | ---------------------------- | --------------------------------- | --------------------------------------- |
| **Controller**     | `CourseManagementController` | `course-management.controller.ts` | **(Update)** Thêm endpoint Sync Content |
| **Service**        | `CourseManagementService`    | `course-management.service.ts`    | **(Update)** Logic Bulk Save            |
| **Adapter**        | `YouTubeAdapter`             | `youtube.adapter.ts`              | **(Mới)** Tích hợp YouTube API          |
| **Factory**        | `LessonFactory`              | `lesson.factory.ts`               | **(Mới)** Tạo Lesson với Metadata       |
| **Repo**           | `LessonRepository`           | `lesson.repository.ts`            | **(Mới)** Thao tác lưu bài học          |
| **Entity**         | `LessonEntity`               | `lesson.entity.ts`                | Chứa `videoUrl`, `duration`, `type`     |
# UC 09c

| **Component Type** | **Node.js Class Name** | **File Name**               | **Vai trò**                                |
| ------------------ | ---------------------- | --------------------------- | ------------------------------------------ |
| **Controller**     | `QuizController`       | `quiz.controller.ts`        | Endpoint parse file                        |
| **Service**        | `QuizService`          | `quiz.service.ts`           | Điều phối trích xuất                       |
| **Policy**         | `QuizValidationPolicy` | `quiz-validation.policy.ts` | **(Cụm 3)** Thực thi Rule 44               |
| **Adapter**        | `ExcelAdapter`         | `excel.adapter.ts`          | **(Cụm 3)** Dùng thư viện `exceljs` để đọc |
| **DTO (Out)**      | `ParsedQuestionDto`    | `parsed-question.dto.ts`    | Data trả về cho FE review                  |

# UC 10

| **Component Type** | **Node.js Class Name**       | **File Name**                     | **Vai trò**                                      |
| ------------------ | ---------------------------- | --------------------------------- | ------------------------------------------------ |
| **Controller**     | `CourseManagementController` | `course-management.controller.ts` | Endpoint Post/Publish                            |
| **Service**        | `CourseManagementService`    | `course-management.service.ts`    | Điều phối luồng Gửi duyệt                        |
| **Policy**         | `PublishingPolicy`           | `publishing.policy.ts`            | **(Cụm 3)** Thực thi Rule 40 (Validate cấu trúc) |
| **Entity**         | `CourseEntity`               | `course.entity.ts`                | **(Update)** Thêm method `submit()`              |
| **Repository**     | `CourseRepository`           | `course.repository.ts`            | Cần method `findByIdWithFullStructure()`         |
# UC 11
| **Component Type**  | **Node.js Class Name**       | **File Name**                     | **Vai trò**                                                     |
| ------------------- | ---------------------------- | --------------------------------- | --------------------------------------------------------------- |
| **Controller**      | `CourseManagementController` | `course-management.controller.ts` | Thêm các endpoint `/preview/*`                                  |
| **Service (Reuse)** | `LearnService`               | `learn.service.ts`                | **(Update)** Thêm tham số `isPreview` cho các hàm xử lý tiến độ |
| **Policy**          | `PreviewPolicy`              | `preview.policy.ts`               | **(Cụm 3)** Thực thi Rule 45 (Chặn ghi dữ liệu)                 |
# UC 12

| **Component Type** | **Node.js Class Name** | **File Name**            | **Vai trò**                                             |
| ------------------ | ---------------------- | ------------------------ | ------------------------------------------------------- |
| **Controller**     | `ApprovalController`   | `approval.controller.ts` | **(Mới)** Endpoint dành riêng cho Admin                 |
| **Service**        | `ApprovalService`      | `approval.service.ts`    | **(Mới)** Điều phối luồng phê duyệt                     |
| **Policy (Reuse)** | `PublishingPolicy`     | `publishing.policy.ts`   | **(Update)** Thêm logic `validateModerationEligibility` |
| **Entity (Reuse)** | `CourseEntity`         | `course.entity.ts`       | **(Update)** Thêm method `approve()` và `reject(note)`  |
| **Repository**     | `CourseRepository`     | `course.repository.ts`   | **(Reuse)**                                             |
