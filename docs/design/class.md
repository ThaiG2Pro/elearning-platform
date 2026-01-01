
@startuml
skinparam Style strictuml
skinparam packageStyle rect
skinparam BackgroundColor #FEFEFE

title Design Class Diagram - Technical Framework (Cluster 1, 2, 3)

'--- Presentation Layer ---
package "Controllers (Boundary)" #F1F3F5 {
    class AuthController <<Controller>>
    class EnrollmentController <<Controller>>
    class LearnController <<Controller>>
    class CourseManagementController <<Controller>>
}

'--- Application Layer ---
package "Services (Orchestration)" #E7F5FF {
    class RegisterUserService <<Service>>
    class LoginService <<Service>>
    class EnrollmentService <<Service>>
    class TrackProgressService <<Service>>
    class CoursePublishService <<Service>>
}

'--- Domain Layer ---
package "Domain (Business Logic)" #FFF9DB {
    class User <<Domain>>
    class Course <<Domain>>
    class Enrollment <<Domain>>
    class LearningProgress <<Domain>>

    class IdentityPolicy <<Domain>>
    class PublishingPolicy <<Domain>>
}

'--- Infrastructure Layer ---
package "Gateways (External & Data)" #F4FCE3 {
    interface UserRepository <<Repository>>
    interface EnrollmentRepository <<Repository>>
    interface CourseRepository <<Repository>>
    class EmailAdapter <<Adapter>>
    class YouTubeAdapter <<Adapter>>
}

'--- CONNECTIVITY & TRACEABILITY ---

' Cluster 1: Identity & Access
AuthController --> RegisterUserService
RegisterUserService --> IdentityPolicy : "Check BR-ID-01"
RegisterUserService --> UserRepository
RegisterUserService --> EmailAdapter

' Cluster 2: Learning
EnrollmentController --> EnrollmentService
EnrollmentService --> CourseRepository : "Validate Active"
EnrollmentService --> EnrollmentRepository

LearnController --> TrackProgressService
TrackProgressService --> EnrollmentRepository : "Update % (BR-CALC-01)"

' Cluster 3: Content Management
CourseManagementController --> CoursePublishService
CoursePublishService --> PublishingPolicy : "Validate BR-DATA-01"
CoursePublishService --> CourseRepository

' Quy tắc: Repository không gọi ngược Domain, chỉ trả về thực thể
UserRepository ..> User
CourseRepository ..> Course
@enduml
