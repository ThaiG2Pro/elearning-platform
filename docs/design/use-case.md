# so do :

@startuml
' --- Cấu hình giao diện chuyên nghiệp ---
skinparam handwritten false
skinparam packageStyle rectangle
skinparam shadowing false
skinparam actor {
    BackgroundColor White
    BorderColor Black
}
skinparam usecase {
    BackgroundColor White
    BorderColor #2C3E50
    FontSize 13
}

left to right direction

' --- Định nghĩa Actor ---
actor "Guest" as G
actor "Authenticated User" as U <<Abstract>>
actor "Student" as S
actor "Lecturer" as L
actor "Admin" as A

actor "YouTube System" as YT <<System>>
actor "Email System" as ES <<System>>

' --- Phân tầng kế thừa ---
G <|-- U
U <|-- S
U <|-- L
U <|-- A

rectangle "Hệ thống YT Learning LMS" {

    package "Module: Tiếp cận & Định danh" {
        (UC-01: Tra cứu khóa học) as UC1
        (UC-02: Đăng ký tài khoản) as UC2
        (UC-03: Đăng nhập hệ thống) as UC3
        (UC-04: Khôi phục mật khẩu) as UC4
        (UC-13: Cập nhật hồ sơ & Mật khẩu) as UC13
    }

    package "Module: Học tập (Student)" #F9F9F9 {
        (UC-05: Đăng ký học - Enroll) as UC5
        (UC-06: Học tập qua video) as UC6
        (UC-07: Ghi chú bài học) as UC7
        (UC-08: Thực hiện bài kiểm tra - Quiz) as UC8
    }

    package "Module: Giảng dạy (Lecturer)" #EBFAFF {
        (UC-09: Biên soạn nội dung khóa học) as UC9
        (UC-10: Gửi yêu cầu phê duyệt) as UC10
    }

    package "Module: Kiểm duyệt (Admin)" #FFF4E6 {
        (UC-11: Xem trước khóa học - Preview) as UC11
        (UC-12: Phê duyệt / Từ chối khóa học) as UC12
    }
}

' --- Kết nối quan hệ ---
G -- UC1
G -- UC2
G -- UC3
G -- UC4
ES -- UC2
ES -- UC4

' Authenticated User dùng chung UC13
U -- UC13

S -- UC5
S -- UC6
S -- UC7
S -- UC8
UC6 -- YT

L -- UC9
L -- UC10
L -- UC11

A -- UC11
A -- UC12
@enduml

# Chia ra ra BUCD (Business usecase desscription) :


| **Cụm Nghiệp vụ**     | **STT** | **Mã BUCD** | **Tên BUCD**                      | **Map Use Case Layer 1** | **Quyết định nghiệp vụ**                             |
| --------------------- | ------- | ----------- | --------------------------------- | ------------------------ | ---------------------------------------------------- |
| **Cụm 1: Tiếp cận**   | 1       | BUCD-00     | Xác định danh tính (Join Gateway) | UC-02, UC-03             | Thêm( Là "Tiền-kiểm-tra" (Pre-check))                |
|                       | 2       | BUCD-02     | Đăng ký tài khoản                 | UC-02                    | Giữ 1 (Dùng Alternate Flow cho luồng ghi đè).        |
|                       | 3       | BUCD-03     | Đăng nhập                         | UC-03                    | Giữ 1 (Luồng vào hệ thống & Redirect).               |
|                       | 4       | BUCD-04     | Khôi phục mật khẩu                | UC-04                    | Giữ 1 (Cơ chế vô hiệu hóa link cũ).                  |
|                       | 5       | BUCD-13a    | Cập nhật hồ sơ                    | UC-13                    | Tách (Chỉ thay đổi thông tin :Name, Age).            |
|                       | 6       | BUCD-13b    | Đổi mật khẩu chủ động             | UC-13                    | Tách (Xác thực lại bảo mật).                         |
| **Cụm 2: Học tập**    | 7       | BUCD-05     | Đăng ký học (Enroll)              | UC-05                    | Giữ 1 (Điểm chuyển đổi trạng thái Guest -> Student). |
|                       | 8       | BUCD-06     | Học tập qua Video                 | UC-06                    | Giữ 1 (Cơ chế Heartbeat & Hoàn thành 80%).           |
|                       | 9       | BUCD-07     | Ghi chú bài học                   | UC-07                    | Giữ 1 (Hành động Lưu dữ liệu cá nhân).               |
|                       | 10      | BUCD-08     | Làm bài tập (Quiz)                | UC-08                    | Giữ 1 (Tính giờ, chấm điểm Server-side).             |
| **Cụm 3: Kiểm duyệt** | 11      | BUCD-09a    | Quản lý cấu trúc Chương           | UC-09                    | Tách (Thêm/Xóa & Cascade Delete).                    |
|                       | 12      | BUCD-09b    | Quản lý bài học Video             | UC-09                    | Tách (Link YouTube & Preview).                       |
|                       | 13      | BUCD-09c    | Quản lý bài học Quiz              | UC-09                    | Tách (Upload Excel & Validate Q&A).                  |
|                       | 14      | BUCD-10     | Gửi yêu cầu phê duyệt             | UC-10                    | Giữ 1 (Chuyển trạng thái sang Pending).              |
|                       | 15      | BUCD-11     | Xem trước (Preview)               | UC-11                    | Giữ 1 (Dùng chung cho Admin/Lecturer).               |
|                       | 16      | BUCD-12     | Phê duyệt / Từ chối               | UC-12                    | Giữ 1 (Ghi nhận Reject Note).                        |


### Trường hợp: 1 Use Case → 0 BUCD (Loại bỏ)
Dựa trên quy tắc: _"Chỉ xem / tra cứu → ❌ Không cần BUCD"_.
- **Tại dự án này:** **UC-01 (Tra cứu khóa học)**.
    - **Lý do:** Đây thuần túy là hành động tra cứu dữ liệu (Read-only), không làm thay đổi trạng thái của thực thể nghiệp vụ (Khóa học vẫn là Active, Guest vẫn là Guest).
    - **Quyết định:**  **không viết BUCD** cho UC-01. Các yêu cầu như "Debounce 500ms" hay "Search Tên khóa học" sẽ được đẩy thẳng xuống **Tầng 3 (Business Rules)** hoặc **Tầng 4 (UI Spec)** vì chúng là logic kỹ thuật/giao diện, không phải luồng hành động nghiệp vụ phức tạp.
