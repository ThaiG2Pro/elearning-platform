# API Contracts - E-Learning Platform

## Tổng quan

Tài liệu này định nghĩa tất cả API endpoints đã được triển khai trong hệ thống E-Learning Platform, được tổ chức theo nhóm chức năng và traceability với Business Use Cases (BUCD).

## 1. Authentication & User Management APIs

### BUCD-00: Identify User
| **Attribute**        | **Specification**                                                    |
| -------------------- | -------------------------------------------------------------------- |
| **API Name**         | Identify User API                                                    |
| **Endpoint**         | `POST /api/v1/auth/identify`                                         |
| **Method**           | POST                                                                 |
| **Business Purpose** | Determine if the user should login or register based on email.       |
| **Access Control**   | Public (Guest)                                                       |
| **Request Body**     | `{ "email": "string (email)", "continueUrl": "string (opt)" }`       |
| **Response (200)**   | `{ "action": "LOGIN \| REGISTER", "continueUrl": "string" }`         |
| **Error (400)**      | `{ "error": "INVALID_FORMAT", "message": "Email format invalid" }`   |
| **Error (429)**      | `{ "error": "RATE_LIMIT_EXCEEDED", "message": "Too many requests" }` |

### BUCD-02: User Registration
| **Attribute**        | **Specification**                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| **API Name**         | Submit Registration                                                                                        |
| **Endpoint**         | `POST /api/v1/auth/register`                                                                               |
| **Method**           | POST                                                                                                       |
| **Business Purpose** | Register a new user account and send activation email.                                                     |
| **Access Control**   | Public (Guest)                                                                                             |
| **Request Body**     | `{ "email": "string", "password": "string (min 6 chars)", "fullName": "string", "age": "number? (must be > 0)", "continueUrl": "string" }` |
| **Response (201)**   | `{ "message": "Activation email sent", "email": "string" }`                                                |
| **Error (400)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid input data" }`                                         |
| **Error (400)**      | `{ "error": "PASSWORD_TOO_SHORT", "message": "Password must be at least 6 characters" }`                   |
| **Error (409)**      | `{ "error": "USER_ALREADY_ACTIVE", "message": "Email is already registered and active" }`                  |
| **Error (429)**      | `{ "error": "RATE_LIMIT_EXCEEDED", "message": "Too many requests" }`                                       |

### BUCD-02: Account Activation
| **Attribute**        | **Specification**                                                                  |
| -------------------- | ---------------------------------------------------------------------------------- |
| **API Name**         | Activate Account                                                                   |
| **Endpoint**         | `POST /api/v1/auth/activate`                                                       |
| **Method**           | POST                                                                               |
| **Business Purpose** | Activate user account using token from email.                                      |
| **Access Control**   | Public (Guest)                                                                     |
| **Request Body**     | `{ "token": "uuid_string" }`                                                       |
| **Response (200)**   | `{ "success": true, "redirectUrl": "string (role-based default)" }`                |
| **Error (400)**      | `{ "error": "TOKEN_INVALID", "message": "Token format incorrect" }`                |
| **Error (410)**      | `{ "error": "TOKEN_EXPIRED", "message": "Token has expired" }`                     |
| **Error (404)**      | `{ "error": "USER_NOT_FOUND", "message": "User associated with token not found" }` |

### BUCD-03: User Login
| **Attribute**        | **Specification**                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API Name**         | User Login                                                                                                                                           |
| **Endpoint**         | `POST /api/v1/auth/login`                                                                                                                            |
| **Method**           | POST                                                                                                                                                 |
| **Business Purpose** | Authenticate user and issue tokens for session.                                                                                                      |
| **Access Control**   | Public (Guest)                                                                                                                                       |
| **Request Body**     | `{ "email": "string", "password": "string", "continueUrl": "string (optional)" }`                                                                    |
| **Response (200)**   | `{ "accessToken": "jwt_string", "refreshToken": "uuid", "user": { "id": "...", "role": "STUDENT", "fullName": "string" }, "redirectUrl": "string" }` |
| **Error (400)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid email or password format" }`                                                                     |
| **Error (401)**      | `{ "error": "AUTH_FAILED", "message": "Incorrect email or password" }`                                                                               |
| **Error (403)**      | `{ "error": "USER_INACTIVE", "message": "Account inactive" }`                                                                                        |
| **Error (429)**      | `{ "error": "RATE_LIMIT_EXCEEDED", "message": "Too many login attempts" }`                                                                           |

### BUCD-03: Refresh Access Token
| **Attribute**        | **Specification**                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| **API Name**         | Refresh Access Token                                                                                |
| **Endpoint**         | `POST /api/v1/auth/refresh`                                                                         |
| **Method**           | POST                                                                                                |
| **Business Purpose** | Refresh access token using refresh token from cookie.                                               |
| **Access Control**   | Authenticated User (via cookie)                                                                     |
| **Request Body**     | None (uses httpOnly cookie)                                                                         |
| **Response (200)**   | `{ "accessToken": "jwt_string", "user": { "id": "...", "role": "STUDENT", "fullName": "string" } }` |
| **Error (401)**      | `{ "error": "NO_REFRESH_TOKEN", "message": "No refresh token provided" }`                           |
| **Error (401)**      | `{ "error": "INVALID_REFRESH_TOKEN", "message": "Invalid refresh token" }`                          |
| **Error (403)**      | `{ "error": "USER_INACTIVE", "message": "Account inactive" }`                                       |
| **Error (404)**      | `{ "error": "USER_NOT_FOUND", "message": "User not found" }`                                        |

### BUCD-03: User Logout
| **Attribute**        | **Specification**                               |
| -------------------- | ----------------------------------------------- |
| **API Name**         | User Logout                                     |
| **Endpoint**         | `POST /api/v1/auth/logout`                      |
| **Method**           | POST                                            |
| **Business Purpose** | Clear session by removing refresh token cookie. |
| **Access Control**   | Authenticated User                              |
| **Request Body**     | None                                            |
| **Response (200)**   | `{ "message": "Logged out successfully" }`      |

### BUCD-04: Password Recovery
| **Attribute**        | **Specification**                                                    |
| -------------------- | -------------------------------------------------------------------- |
| **API Name**         | Request Password Reset                                               |
| **Endpoint**         | `POST /api/v1/auth/forgot-password`                                  |
| **Method**           | POST                                                                 |
| **Business Purpose** | Send password reset email if email exists.                           |
| **Access Control**   | Public (Guest)                                                       |
| **Request Body**     | `{ "email": "string" }`                                              |
| **Response (200)**   | `{ "message": "Reset email sent" }`                                  |
| **Error (400)**      | `{ "error": "INVALID_FORMAT", "message": "Email format invalid" }`   |
| **Error (429)**      | `{ "error": "RATE_LIMIT_EXCEEDED", "message": "Too many requests" }` |

### BUCD-04: Password Reset
| **Attribute**        | **Specification**                                                                       |
| -------------------- | --------------------------------------------------------------------------------------- |
| **API Name**         | Reset Password                                                                          |
| **Endpoint**         | `POST /api/v1/auth/reset-password`                                                      |
| **Method**           | POST                                                                                    |
| **Business Purpose** | Update password using reset token.                                                      |
| **Access Control**   | Public (Guest)                                                                          |
| **Request Body**     | `{ "token": "uuid_string", "password": "string (min 6 chars)" }`                        |
| **Response (200)**   | `{ "message": "Password reset successful" }`                                            |
| **Error (400)**      | `{ "error": "TOKEN_INVALID", "message": "Token format incorrect" }`                     |
| **Error (410)**      | `{ "error": "TOKEN_EXPIRED", "message": "Token has expired" }`                          |
| **Error (422)**      | `{ "error": "PASSWORD_TOO_WEAK", "message": "Password must be at least 6 characters" }` |

### BUCD-13a: Update Profile
| **Attribute**        | **Specification**                                                                  |
| -------------------- | ---------------------------------------------------------------------------------- |
| **API Name**         | Update User Profile                                                                |
| **Endpoint**         | `PUT /api/v1/auth/profile`                                                         |
| **Method**           | PUT                                                                                |
| **Business Purpose** | Update authenticated user's profile information.                                   |
| **Access Control**   | Authenticated User                                                                 |
| **Request Body**     | `{ "fullName": "string", "age": "number? (must be > 0)", "avatarUrl": "string?" }` |
| **Response (200)**   | `{ "success": true, "message": "Profile updated successfully" }`                   |
| **Error (400)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid input data" }`                 |
| **Error (400)**      | `{ "error": "INVALID_AGE", "message": "Age must be a positive number" }`           |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                |

### BUCD-13b: Change Password
| **Attribute**        | **Specification**                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **API Name**         | Change Password                                                                                        |
| **Endpoint**         | `PUT /api/v1/auth/change-password`                                                                     |
| **Method**           | PUT                                                                                                    |
| **Business Purpose** | Change authenticated user's password with verification.                                                |
| **Access Control**   | Authenticated User                                                                                     |
| **Request Body**     | `{ "currentPassword": "string", "newPassword": "string (min 6 chars)", "confirmPassword": "string" }`  |
| **Response (200)**   | `{ "success": true, "message": "Password changed successfully" }`                                      |
| **Error (400)**      | `{ "error": "CURRENT_PASSWORD_INVALID", "message": "Current password is incorrect" }`                  |
| **Error (400)**      | `{ "error": "PASSWORD_CONFIRMATION_MISMATCH", "message": "New password confirmation does not match" }` |
| **Error (422)**      | `{ "error": "PASSWORD_TOO_WEAK", "message": "Password must be at least 6 characters" }`                |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                                    |

## 2. Course Browsing APIs (Public)

### UC-01: Browse Courses
| **Attribute**        | **Specification**                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **API Name**         | List Courses                                                                                                     |
| **Endpoint**         | `GET /api/v1/courses?search=<string>`                                                                            |
| **Method**           | GET                                                                                                              |
| **Business Purpose** | Retrieve list of active courses for browsing.                                                                    |
| **Access Control**   | Public                                                                                                           |
| **Response (200)**   | `[{ "id": "bigint", "title": "string", "slug": "string", "description": "string?", "thumbnailUrl": "string?" }]` |
| **Error (500)**      | `{ "error": "SERVER_ERROR", "message": "Internal server error occurred" }`                                       |

### UC-01: Course Detail
| **Attribute**        | **Specification**                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API Name**         | Get Course Detail                                                                                                                                                                     |
| **Endpoint**         | `GET /api/v1/courses/[id]`                                                                                                                                                            |
| **Method**           | GET                                                                                                                                                                                   |
| **Business Purpose** | Retrieve detailed information about a specific course.                                                                                                                                |
| **Access Control**   | Public                                                                                                                                                                                |
| **Response (200)**   | `{ "id": "bigint", "title": "string", "slug": "string", "description": "string?", "lecturerName": "string?", "isEnrolled": "boolean", "thumbnailUrl": "string?", "chapters": [...] }` |
| **Error (404)**      | `{ "error": "COURSE_NOT_FOUND", "message": "Course does not exist or is inactive" }`                                                                                                  |
| **Error (500)**      | `{ "error": "SERVER_ERROR", "message": "Internal server error occurred" }`                                                                                                            |

### Check Enrollment Status
| **Attribute**        | **Specification**                                                       |
| -------------------- | ----------------------------------------------------------------------- |
| **API Name**         | Check Enrollment Status                                                 |
| **Endpoint**         | `GET /api/v1/courses/[id]/enroll`                                       |
| **Method**           | GET                                                                     |
| **Business Purpose** | Check if the authenticated user is enrolled in a course for UI display. |
| **Access Control**   | Authenticated User                                                      |
| **Response (200)**   | `{ "enrolled": "boolean" }`                                             |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`     |
| **Error (404)**      | `{ "error": "COURSE_NOT_FOUND", "message": "Course does not exist" }`   |

### List Enrolled Courses
| **Attribute**        | **Specification**                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **API Name**         | List Enrolled Courses                                                                                                                                        |
| **Endpoint**         | `GET /api/v1/courses/enrolled?filter=<in_progress\|completed>&sort=<enrolled_at_desc>`                                                                       |
| **Method**           | GET                                                                                                                                                          |
| **Business Purpose** | Retrieve list of courses enrolled by the authenticated student with filtering and sorting.                                                                   |
| **Access Control**   | Authenticated User (Student)                                                                                                                                 |
| **Response (200)**   | `[{ "id": "bigint", "title": "string", "slug": "string", "status": "string", "thumbnailUrl": "string?", "completionRate": "number", "enrolledAt": "date" }]` |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                                                                                          |
| **Error (403)**      | `{ "error": "ROLE_DENIED", "message": "Student role required" }`                                                                                             |

### View Quiz Results
| **Attribute**        | **Specification**                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **API Name**         | View Quiz Results                                                                                                   |
| **Endpoint**         | `GET /api/v1/lessons/[id]/quiz/results`                                                                             |
| **Method**           | GET                                                                                                                 |
| **Business Purpose** | Retrieve past quiz attempts and results for a lesson.                                                               |
| **Access Control**   | Authenticated User (Enrolled Student)                                                                               |
| **Response (200)**   | `[{ "id": "bigint", "score": "number", "totalQuestions": "number", "isPassed": "boolean", "attemptedAt": "date" }]` |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                                                 |
| **Error (404)**      | `{ "error": "LESSON_NOT_FOUND", "message": "Lesson does not exist" }`                                               |

## 3. Learning Management APIs

### BUCD-05: Course Enrollment
| **Attribute**        | **Specification**                                                                       |
| -------------------- | --------------------------------------------------------------------------------------- |
| **API Name**         | Enroll in Course                                                                        |
| **Endpoint**         | `POST /api/v1/courses/[id]/enroll`                                                      |
| **Method**           | POST                                                                                    |
| **Business Purpose** | Enroll authenticated student in a course.                                               |
| **Access Control**   | Authenticated User                                                                      |
| **Response (201)**   | `{ "enrollmentId": "bigint", "message": "Enrolled successfully" }`                      |
| **Error (400)**      | `{ "error": "ALREADY_ENROLLED", "message": "User is already enrolled" }`                |
| **Error (400)**      | `{ "error": "COURSE_NOT_ACTIVE", "message": "Course is not available for enrollment" }` |
| **Error (403)**      | `{ "error": "ROLE_DENIED", "message": "Only students can enroll" }`                     |
| **Error (404)**      | `{ "error": "COURSE_NOT_FOUND", "message": "Course does not exist" }`                   |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                     |

### BUCD-06: Learning Progress
| **Attribute**        | **Specification**                                                             |
| -------------------- | ----------------------------------------------------------------------------- |
| **API Name**         | Get Lesson Progress                                                           |
| **Endpoint**         | `GET /api/v1/lessons/[id]/progress`                                           |
| **Method**           | GET                                                                           |
| **Business Purpose** | Retrieve progress for a specific lesson.                                      |
| **Access Control**   | Authenticated User                                                            |
| **Response (200)**   | `{ "progress": "number", "completed": "boolean", "lastAccessedAt": "date?" }` |
| **Error (404)**      | `{ "error": "PROGRESS_NOT_FOUND", "message": "No progress record found" }`    |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`           |

| **Attribute**        | **Specification**                                                           |
| -------------------- | --------------------------------------------------------------------------- |
| **API Name**         | Update Lesson Progress                                                      |
| **Endpoint**         | `PUT /api/v1/lessons/[id]/progress`                                         |
| **Method**           | PUT                                                                         |
| **Business Purpose** | Update progress for a lesson.                                               |
| **Access Control**   | Authenticated User                                                          |
| **Request Body**     | `{ "progress": "number (0-100)" }`                                          |
| **Response (200)**   | `{ "message": "Progress updated" }`                                         |
| **Error (400)**      | `{ "error": "INVALID_PROGRESS", "message": "Progress value out of range" }` |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`         |

### BUCD-07: Personal Notes
| **Attribute**        | **Specification**                                                           |
| -------------------- | --------------------------------------------------------------------------- |
| **API Name**         | Get Lesson Note                                                             |
| **Endpoint**         | `GET /api/v1/lessons/[id]/note`                                             |
| **Method**           | GET                                                                         |
| **Business Purpose** | Retrieve personal note for a lesson.                                        |
| **Access Control**   | Authenticated User                                                          |
| **Response (200)**   | `{ "note": "string", "updatedAt": "date" }`                                 |
| **Error (404)**      | `{ "error": "NOTE_NOT_FOUND", "message": "No note found for this lesson" }` |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`         |

| **Attribute**        | **Specification**                                                               |
| -------------------- | ------------------------------------------------------------------------------- |
| **API Name**         | Update Lesson Note                                                              |
| **Endpoint**         | `PUT /api/v1/lessons/[id]/note`                                                 |
| **Method**           | PUT                                                                             |
| **Business Purpose** | Save or update personal note for a lesson.                                      |
| **Access Control**   | Authenticated User                                                              |
| **Request Body**     | `{ "note": "string" }`                                                          |
| **Response (200)**   | `{ "message": "Note updated" }`                                                 |
| **Error (400)**      | `{ "error": "INVALID_CONTENT", "message": "Note content invalid or too long" }` |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`             |

### BUCD-08: Quiz Management

#### Start Quiz Session
| **Attribute**        | **Specification**                                                               |
| -------------------- | ------------------------------------------------------------------------------- |
| **API Name**         | Start Quiz Session                                                              |
| **Endpoint**         | `POST /api/v1/lessons/[id]/quiz/start`                                          |
| **Method**           | POST                                                                            |
| **Business Purpose** | Initialize quiz session and start 10-minute timer for time-limited quizzes.     |
| **Access Control**   | Authenticated User (Enrolled Student)                                           |
| **Response (200)**   | `{ "message": "Quiz started", "startTime": "date", "expiresAt": "date" }`       |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`             |
| **Error (403)**      | `{ "error": "QUIZ_ALREADY_STARTED", "message": "Quiz session already active" }` |
| **Error (404)**      | `{ "error": "LESSON_NOT_FOUND", "message": "Lesson does not exist" }`           |

### BUCD-08A: Generate Quiz Questions
| **Attribute**        | **Specification**                                                                    |
| -------------------- | ------------------------------------------------------------------------------------ |
| **API Name**         | Generate Quiz Questions                                                              |
| **Endpoint**         | `GET /api/v1/lessons/[id]/quiz`                                                      |
| **Method**           | GET                                                                                  |
| **Business Purpose** | Retrieve randomized quiz questions for a lesson after starting quiz session.         |
| **Access Control**   | Authenticated User (Enrolled Student)                                                |
| **Response (200)**   | `{ "questions": [{ "id": "bigint", "question": "string", "options": ["string"] }] }` |
| **Error (404)**      | `{ "error": "QUIZ_NOT_AVAILABLE", "message": "Quiz not available for this lesson" }` |
| **Error (403)**      | `{ "error": "QUIZ_NOT_STARTED", "message": "Quiz session must be started first" }`   |
| **Error (403)**      | `{ "error": "QUIZ_TIME_EXPIRED", "message": "Quiz session time has expired" }`       |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                  |

### BUCD-08B: Submit Quiz
| **Attribute**        | **Specification**                                                                     |
| -------------------- | ------------------------------------------------------------------------------------- |
| **API Name**         | Submit Quiz Answers                                                                   |
| **Endpoint**         | `POST /api/v1/lessons/[id]/quiz/submit`                                               |
| **Method**           | POST                                                                                  |
| **Business Purpose** | Submit answers and receive quiz results. Auto-submit with 0 score if time expired.    |
| **Access Control**   | Authenticated User (Enrolled Student)                                                 |
| **Request Body**     | `{ "answers": { "questionId": "userAnswer" } }`                                       |
| **Response (200)**   | `{ "score": "number", "isPassed": "boolean", "correction": { "qId": "correctAns" } }` |
| **Error (400)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid submission format" }`             |
| **Error (403)**      | `{ "error": "QUIZ_NOT_STARTED", "message": "Quiz session must be started first" }`    |
| **Error (403)**      | `{ "error": "QUIZ_TIME_EXPIRED", "message": "Quiz session time has expired" }`        |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                   |

## 4. Content Management APIs (Lecturer/Admin)

### Quiz Management
| **Attribute**        | **Specification**                                                            |
| -------------------- | ---------------------------------------------------------------------------- |
| **API Name**         | Parse Quiz File                                                              |
| **Endpoint**         | `POST /api/v1/management/quiz/parse`                                         |
| **Method**           | POST                                                                         |
| **Business Purpose** | Parse uploaded quiz file into questions.                                     |
| **Access Control**   | Lecturer/Admin                                                               |
| **Request Body**     | `FormData with file`                                                         |
| **Response (200)**   | `{ "questions": [...] }`                                                     |
| **Error (400)**      | `{ "error": "INVALID_FILE_FORMAT", "message": "File format not supported" }` |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Insufficient permissions" }`        |
| **Error (413)**      | `{ "error": "FILE_TOO_LARGE", "message": "File exceeds size limit" }`        |

| **Attribute**        | **Specification**                                                                |
| -------------------- | -------------------------------------------------------------------------------- |
| **API Name**         | Upload Quiz Questions                                                            |
| **Endpoint**         | `POST /api/v1/management/lessons/[id]/quiz/upload`                               |
| **Method**           | POST                                                                             |
| **Business Purpose** | Upload and replace all quiz questions for a lesson (BR-UPLOAD-01: Replace All).  |
| **Access Control**   | Lecturer/Admin                                                                   |
| **Request Body**     | `FormData with file (Excel .xlsx/.xls)`                                          |
| **Response (200)**   | `{ "message": "Quiz questions uploaded successfully", "uploadedCount": number }` |
| **Error (400)**      | `{ "error": "NO_FILE", "message": "No file provided" }`                          |
| **Error (400)**      | `{ "error": "INVALID_FILE_TYPE", "message": "Only Excel files allowed" }`        |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Lecturer or admin role required" }`     |
| **Error (404)**      | `{ "error": "LESSON_NOT_FOUND", "message": "Lesson does not exist" }`            |

### Course Publishing
| **Attribute**        | **Specification**                                                                |
| -------------------- | -------------------------------------------------------------------------------- |
| **API Name**         | Publish Course                                                                   |
| **Endpoint**         | `POST /api/v1/management/courses/[id]/publish`                                   |
| **Method**           | POST                                                                             |
| **Business Purpose** | Submit course for review.                                                        |
| **Access Control**   | Lecturer                                                                         |
| **Response (200)**   | `{ "message": "Course submitted for review" }`                                   |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Not the course owner" }`                |
| **Error (422)**      | `{ "error": "INCOMPLETE_CONTENT", "message": "Course lacks required sections" }` |

### Course Moderation
| **Attribute**        | **Specification**                                                           |
| -------------------- | --------------------------------------------------------------------------- |
| **API Name**         | Moderate Course                                                             |
| **Endpoint**         | `POST /api/v1/management/courses/[id]/moderate`                             |
| **Method**           | POST                                                                        |
| **Business Purpose** | Approve or reject course submission.                                        |
| **Access Control**   | Admin                                                                       |
| **Request Body**     | `{ "action": "APPROVE \| REJECT", "rejectNote": "string?" }`                |
| **Response (200)**   | `{ "message": "Course moderated" }`                                         |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Admin role required" }`            |
| **Error (404)**      | `{ "error": "COURSE_NOT_FOUND", "message": "Course not in pending state" }` |

### Course Content Management
| **Attribute**        | **Specification**                                                         |
| -------------------- | ------------------------------------------------------------------------- |
| **API Name**         | Update Course Content                                                     |
| **Endpoint**         | `POST /api/v1/management/courses/[id]/content`                            |
| **Method**           | POST                                                                      |
| **Business Purpose** | Update course structure and content.                                      |
| **Access Control**   | Lecturer                                                                  |
| **Request Body**     | `{ "title": "string", "description": "string", "chapters": [...] }`       |
| **Response (200)**   | `{ "message": "Content updated" }`                                        |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Not the course owner" }`         |
| **Error (422)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid content structure" }` |

### Section Management
| **Attribute**        | **Specification**                                                       |
| -------------------- | ----------------------------------------------------------------------- |
| **API Name**         | Delete Section                                                          |
| **Endpoint**         | `DELETE /api/v1/management/sections/[id]`                               |
| **Method**           | DELETE                                                                  |
| **Business Purpose** | Remove a section and its lessons.                                       |
| **Access Control**   | Lecturer                                                                |
| **Response (200)**   | `{ "message": "Section deleted" }`                                      |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Not the course owner" }`       |
| **Error (404)**      | `{ "error": "SECTION_NOT_FOUND", "message": "Section does not exist" }` |

### BUCD-09: Lecturer Course Management

#### Get Lecturer Courses
| **Attribute**        | **Specification**                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **API Name**         | Get Lecturer Courses                                                                                                                   |
| **Endpoint**         | `GET /api/v1/management/courses`                                                                                                       |
| **Method**           | GET                                                                                                                                    |
| **Business Purpose** | Retrieve list of courses owned by the authenticated lecturer with thumbnail and moderation info.                                       |
| **Access Control**   | Lecturer                                                                                                                               |
| **Response (200)**   | `[{ "id": "bigint", "title": "string", "status": "string", "thumbnailUrl": "string?", "rejectNote": "string?", "createdAt": "date" }]` |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                                                                    |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Lecturer role required" }`                                                                    |

#### Create Course
| **Attribute**        | **Specification**                                                   |
| -------------------- | ------------------------------------------------------------------- |
| **API Name**         | Create Course                                                       |
| **Endpoint**         | `POST /api/v1/management/courses`                                   |
| **Method**           | POST                                                                |
| **Business Purpose** | Create a new course with initial details.                           |
| **Access Control**   | Lecturer                                                            |
| **Request Body**     | `{ "title": "string", "description": "string?", "slug": "string" }` |
| **Response (201)**   | `{ "id": "bigint", "message": "Course created successfully" }`      |
| **Error (400)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid input data" }`  |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }` |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Lecturer role required" }` |

#### Get Course Sections
| **Attribute**        | **Specification**                                                                      |
| -------------------- | -------------------------------------------------------------------------------------- |
| **API Name**         | Get Course Sections                                                                    |
| **Endpoint**         | `GET /api/v1/management/courses/[id]/sections`                                         |
| **Method**           | GET                                                                                    |
| **Business Purpose** | Retrieve sections of a specific course owned by the lecturer.                          |
| **Access Control**   | Lecturer (Owner)                                                                       |
| **Response (200)**   | `[{ "id": "bigint", "title": "string", "orderIndex": "number", "createdAt": "date" }]` |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                    |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Not the course owner" }`                      |
| **Error (404)**      | `{ "error": "COURSE_NOT_FOUND", "message": "Course does not exist" }`                  |

#### Create Section
| **Attribute**        | **Specification**                                                     |
| -------------------- | --------------------------------------------------------------------- |
| **API Name**         | Create Section                                                        |
| **Endpoint**         | `POST /api/v1/management/courses/[id]/sections`                       |
| **Method**           | POST                                                                  |
| **Business Purpose** | Add a new section to a course owned by the lecturer.                  |
| **Access Control**   | Lecturer (Owner)                                                      |
| **Request Body**     | `{ "title": "string", "orderIndex": "number" }`                       |
| **Response (201)**   | `{ "id": "bigint", "message": "Section created successfully" }`       |
| **Error (400)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid section data" }`  |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`   |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Not the course owner" }`     |
| **Error (404)**      | `{ "error": "COURSE_NOT_FOUND", "message": "Course does not exist" }` |

#### Update Section
| **Attribute**        | **Specification**                                                       |
| -------------------- | ----------------------------------------------------------------------- |
| **API Name**         | Update Section                                                          |
| **Endpoint**         | `PUT /api/v1/management/sections/[id]`                                  |
| **Method**           | PUT                                                                     |
| **Business Purpose** | Update details of a section owned by the lecturer.                      |
| **Access Control**   | Lecturer (Owner)                                                        |
| **Request Body**     | `{ "title": "string?", "orderIndex": "number?" }`                       |
| **Response (200)**   | `{ "message": "Section updated successfully" }`                         |
| **Error (400)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid section data" }`    |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`     |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Not the course owner" }`       |
| **Error (404)**      | `{ "error": "SECTION_NOT_FOUND", "message": "Section does not exist" }` |

#### Create Lesson
| **Attribute**        | **Specification**                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------- |
| **API Name**         | Create Lesson                                                                               |
| **Endpoint**         | `POST /api/v1/management/sections/[id]/lessons`                                             |
| **Method**           | POST                                                                                        |
| **Business Purpose** | Add a new lesson to a section owned by the lecturer.                                        |
| **Access Control**   | Lecturer (Owner)                                                                            |
| **Request Body**     | `{ "title": "string", "content": "string", "videoUrl": "string?", "orderIndex": "number" }` |
| **Response (201)**   | `{ "id": "bigint", "message": "Lesson created successfully" }`                              |
| **Error (400)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid lesson data" }`                         |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                         |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Not the course owner" }`                           |
| **Error (404)**      | `{ "error": "SECTION_NOT_FOUND", "message": "Section does not exist" }`                     |

#### Update Lesson
| **Attribute**        | **Specification**                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **API Name**         | Update Lesson                                                                                  |
| **Endpoint**         | `PUT /api/v1/management/lessons/[id]`                                                          |
| **Method**           | PUT                                                                                            |
| **Business Purpose** | Update details of a lesson owned by the lecturer.                                              |
| **Access Control**   | Lecturer (Owner)                                                                               |
| **Request Body**     | `{ "title": "string?", "content": "string?", "videoUrl": "string?", "orderIndex": "number?" }` |
| **Response (200)**   | `{ "message": "Lesson updated successfully" }`                                                 |
| **Error (400)**      | `{ "error": "VALIDATION_ERROR", "message": "Invalid lesson data" }`                            |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                            |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Not the course owner" }`                              |
| **Error (404)**      | `{ "error": "LESSON_NOT_FOUND", "message": "Lesson does not exist" }`                          |

#### Delete Lesson
| **Attribute**        | **Specification**                                                     |
| -------------------- | --------------------------------------------------------------------- |
| **API Name**         | Delete Lesson                                                         |
| **Endpoint**         | `DELETE /api/v1/management/lessons/[id]`                              |
| **Method**           | DELETE                                                                |
| **Business Purpose** | Remove a lesson owned by the lecturer.                                |
| **Access Control**   | Lecturer (Owner)                                                      |
| **Response (200)**   | `{ "message": "Lesson deleted successfully" }`                        |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`   |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Not the course owner" }`     |
| **Error (404)**      | `{ "error": "LESSON_NOT_FOUND", "message": "Lesson does not exist" }` |

### Publishing & Moderation APIs

#### Get Approval Queue
| **Attribute**        | **Specification**                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------ |
| **API Name**         | Get Approval Queue                                                                         |
| **Endpoint**         | `GET /api/v1/management/approval-queue`                                                    |
| **Method**           | GET                                                                                        |
| **Business Purpose** | Retrieve list of courses pending approval for admin moderation.                            |
| **Access Control**   | Admin                                                                                      |
| **Response (200)**   | `[{ "id": "bigint", "title": "string", "lecturerName": "string", "submittedAt": "date" }]` |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                        |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Admin role required" }`                           |

#### Preview Lesson Content
| **Attribute**        | **Specification**                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **API Name**         | Preview Lesson Content                                                                                                        |
| **Endpoint**         | `GET /api/v1/management/courses/[id]/preview/lessons/[lessonId]`                                                              |
| **Method**           | GET                                                                                                                           |
| **Business Purpose** | Preview lesson content for moderation without enrollment requirement.                                                         |
| **Access Control**   | Lecturer/Admin                                                                                                                |
| **Response (200)**   | `{ "id": "bigint", "title": "string", "type": "string", "content": "string", "videoUrl": "string?", "quizQuestions": [...] }` |
| **Error (401)**      | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }`                                                           |
| **Error (404)**      | `{ "error": "LESSON_NOT_FOUND", "message": "Lesson not found" }`                                                              |

### Progress Preview
| **Attribute**        | **Specification**                                                     |
| -------------------- | --------------------------------------------------------------------- |
| **API Name**         | Preview Course Progress                                               |
| **Endpoint**         | `GET /api/v1/management/preview/progress`                             |
| **Method**           | GET                                                                   |
| **Business Purpose** | View course progress for moderation.                                  |
| **Access Control**   | Lecturer/Admin                                                        |
| **Response (200)**   | `{ "courses": [...] }`                                                |
| **Error (403)**      | `{ "error": "ACCESS_DENIED", "message": "Insufficient permissions" }` |

---

## Implementation Notes

- **Authentication**: All APIs except public browsing require JWT token in Authorization header
- **Error Handling**: Consistent error response format with appropriate HTTP status codes. All error cases are specific and tied to business rules, with no generic "OTHER" or "UNKNOWN" errors.
- **Validation**: Input validation at controller level with business rule enforcement
- **Traceability**: Each API maps to specific BUCD/UC for requirement traceability
- **Security**: Role-based access control and data isolation
- **Performance**: Efficient database queries with proper indexing
- **Quiz Timing**: Quiz sessions have 10-minute time limit enforced server-side. Start quiz session before generating questions.
- **Course Filtering**: Enrolled courses API supports filtering by completion status (in_progress/completed) and sorting by enrollment date.
- **Quiz Upload**: Upload replaces all existing questions for a lesson (BR-UPLOAD-01). Excel file must have columns: Content, Options (pipe-separated), CorrectAnswer.
- **Course Thumbnail**: thumbnailUrl is derived from the first video in the course, or a default placeholder image if no videos exist. Used for lecturer management UI preview.


