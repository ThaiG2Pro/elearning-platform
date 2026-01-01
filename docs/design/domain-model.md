@startuml
skinparam class {
    BackgroundColor White
    ArrowColor Black
    BorderColor Black
}
hide circle
hide methods

title Domain Model (Conceptual) - Toàn hệ thống (Hợp nhất Cụm 1, 2, 3)

class User {
    email : String
    password : String
    full_name : String
    status : AccountStatus
}

class Role {
    name : RoleName
}

class Token {
    code : UUID
    type : TokenType
    expires_at : String
    is_used : Boolean
}

class Course {
    title : String
    slug : String
    status : CourseStatus
    reject_note : String
}

class Chapter {
    title : String
}

class Lesson {
    title : String
    type : LessonType
    content_url : String
}

class Enrollment {
    completion_rate : Integer
}

class LearningProgress {
    is_finished : Boolean
    personal_note : String
}

'--- Enumerations ---
enum RoleName {
    STUDENT
    LECTURER
    ADMIN
}

enum AccountStatus {
    INACTIVE
    ACTIVE
}

enum CourseStatus {
    DRAFT
    PENDING
    ACTIVE
    REJECTED
}

enum LessonType {
    VIDEO
    QUIZ
}

enum TokenType {
    ACTIVATION
    RECOVERY
}

'--- Relationships & Invariants ---

User "1" -- "1" Role : assigned_to
User "1" -- "0..*" Token : owns
note on link: BR-TK-03: Token mới vô hiệu hóa các token cũ

User "1" -- "0..*" Course : creates
note on link: BR-WF-02: Kiểm soát quyền theo chủ sở hữu

Course "1" *-- "0..*" Chapter : organized_into
note on link: FR-UC09a-01: Cascade Delete khi xóa chương

Chapter "1" *-- "1..*" Lesson : contains
note on link: BR-DATA-01: Ràng buộc cấu trúc tối thiểu

User "1" -- "0..*" Enrollment : participates
note on link: BR-ENROLL-02: Chỉ Student mới được Enroll

Enrollment "1" -- "1" Course : targets
note on link: BR-ENROLL-01: Ghi danh vĩnh viễn

Enrollment "1" -- "0..*" LearningProgress : tracks

LearningProgress "1" -- "1" Lesson : for
note on link: BR-PROG-02: Trạng thái hoàn thành là vĩnh viễn

@enduml
