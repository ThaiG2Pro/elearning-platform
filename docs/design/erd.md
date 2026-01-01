@startuml
skinparam Linetype ortho
skinparam ClassBackgroundColor White
skinparam ClassBorderColor Black

title ERD (Logical Data Model) - E-Learning System

entity "users" {
    * id : BIGINT <<PK>>
    --
    * email : VARCHAR(255) <<Unique>>
    * password_hash : VARCHAR(255)
    * full_name : VARCHAR(100)
    age : INT
    avatar_url : VARCHAR(500)
    * role_id : INT <<FK>>
    * status : VARCHAR(20) -- ACTIVE, INACTIVE
    created_at : TIMESTAMP
}

entity "roles" {
    * id : INT <<PK>>
    --
    * name : VARCHAR(20) -- STUDENT, LECTURER, ADMIN
}

entity "tokens" {
    * id : BIGINT <<PK>>
    --
    * user_id : BIGINT <<FK>>
    * code : UUID <<Unique>>
    * type : VARCHAR(20) -- ACTIVATION, RECOVERY
    * expires_at : TIMESTAMP
    * is_used : BOOLEAN
}

entity "courses" {
    * id : BIGINT <<PK>>
    --
    * lecturer_id : BIGINT <<FK>>
    * title : VARCHAR(255)
    * slug : VARCHAR(255) <<Unique>>
    description : TEXT
    * status : VARCHAR(20) -- DRAFT, PENDING, ACTIVE, REJECTED
    reject_note : TEXT
}

entity "chapters" {
    * id : BIGINT <<PK>>
    --
    * course_id : BIGINT <<FK>>
    * title : VARCHAR(255)
    * order_index : INT
}

entity "lessons" {
    * id : BIGINT <<PK>>
    --
    * chapter_id : BIGINT <<FK>>
    * title : VARCHAR(255)
    * type : VARCHAR(20) -- VIDEO, QUIZ
    content_url : VARCHAR(500)
    * order_index : INT
}

entity "enrollments" {
    * id : BIGINT <<PK>>
    --
    * student_id : BIGINT <<FK>>
    * course_id : BIGINT <<FK>>
    * completion_rate : INT
    enrolled_at : TIMESTAMP
}

entity "learning_progress" {
    * id : BIGINT <<PK>>
    --
    * enrollment_id : BIGINT <<FK>>
    * lesson_id : BIGINT <<FK>>
    * is_finished : BOOLEAN
    video_last_position : INT
    quiz_max_score : INT
    personal_note : TEXT
}

'--- Relationships ---

users }|--|| roles
tokens }|--|| users
courses }|--|| users : "owned by lecturer"
chapters }|--|| courses
lessons }|--|| chapters
enrollments }|--|| users : "student"
enrollments }|--|| courses
learning_progress }|--|| enrollments
learning_progress }|--|| lessons

@enduml
