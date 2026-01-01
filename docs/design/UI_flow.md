1. Luồng Duyệt Khóa học & Đăng ký (Public Flow)

Hành trình bắt đầu từ khi người dùng chưa xác thực (Guest) cho đến khi bắt đầu học.

    SCR-PUB-01 (Home):

        Hành động: Nhấn vào Card khóa học -> Chuyển sang SCR-PUB-02.

        Hành động: Nhấn nút "Join" trên Header -> Chuyển sang SCR-JOIN-01.

    SCR-PUB-02 (Course Detail):

        Hành động: Nhấn "Enroll Now" (Guest) -> Chuyển sang SCR-JOIN-01 (kèm tham số continueUrl).

        Hành động: Nhấn "Enroll Now" (Student chưa Enroll) -> Gọi API thành công -> Chuyển sang SCR-LRN-01.

        Hành động: Nhấn "Learn Now" (Student đã Enroll) -> Chuyển sang SCR-LRN-01.

2. Luồng Xác thực (Authentication Gateway Flow)

Đây là "cửa ngõ" định danh trung tâm (BUCD-00) để phân luồng người dùng.

    SCR-JOIN-01 (Join Gateway):

        Hành động: Nhập Email -> Gọi API Identify.

        Kết quả LOGIN: Chuyển sang SCR-AUTH-02.

        Kết quả REGISTER: Chuyển sang SCR-AUTH-03.

    SCR-AUTH-02 (Login):

        Hành động: Đăng nhập thành công -> Điều hướng về continueUrl (thường là SCR-PUB-02).

        Hành động: Nhấn "Quên mật khẩu" -> Chuyển sang SCR-AUTH-04.

    SCR-AUTH-03 (Register):

        Hành động: Gửi form đăng ký thành công -> Chờ người dùng kích hoạt Email -> Hệ thống gọi API Activate -> Điều hướng về SCR-JOIN-01.

    SCR-AUTH-04 (Forgot Password):

        Hành động: Gửi yêu cầu thành công -> Người dùng nhấn Link trong Email -> Chuyển sang SCR-AUTH-05.

    SCR-AUTH-05 (Set New Password):

        Hành động: Đổi mật khẩu thành công -> Điều hướng về SCR-JOIN-01.
3. Luồng Quản lý Tài khoản (User Management Flow)

Người dùng chủ động cập nhật thông tin cá nhân khi nhấn vào avatar.


        Hành động: Chọn "Edit Profile" -> Chuyển sang SCR-USR-01.


    SCR-USR-01 (Edit Profile):

        Hành động: nhập new name hoặc new age hoặc cả 2. Lưu thành công -> Header cập nhật Avatar mới theo tên.

    SCR-USR-02 (Change Password):

        Hành động: Đổi thành công -> Giữ nguyên trạng thái.

1. Luồng Học tập & Dashboard (Learning Flow)

Dành cho người dùng đã xác thực (Authenticated Student).



        Hành động: Chọn "My Learning" -> Chuyển sang SCR-STU-01.

    SCR-STU-01 (My Learning):

        Hành động: Nhấn vào khóa học -> Chuyển sang SCR-LRN-01.

    SCR-LRN-01 (Learning Interface):

        Nghiệp vụ: Học video, làm Quiz, lưu Ghi chú.

        nhấn Quay lại để về SCR-LRN-01 : My learning

1. Luồng Quản lý Khóa học của Giảng viên (Lecturer Flow)

Dành cho Actor là Lecturer để xây dựng nội dung bài giảng.


        Hành động: Chọn "My Courses" -> Chuyển sang SCR-LEC-01.

    SCR-LEC-01 (Lecturer Dashboard):

        Hành động: Nhấn "Create New Course" -> Chuyển sang SCR-LEC-02.

        Hành động: Nhấn vào một khóa học Draft  -> Chuyển sang SCR-LEC-02 (Chế độ chỉnh sửa).

        Hành động: Nhấn vào khóa học Pending/Active -> Mở màn hình SCR-COM-01 (Chế độ xem trước - Read-only).
    SCR-LEC-02 (Course Editor):

        Nghiệp vụ: Quản lý chương, bài học, tải lên Video, Quiz (Dùng API Content Management).

        Hành động: Nhấn "Save" -> Trạng thái khóa học chuyển sang Draft.

        Hành động: Nhấn "Publish" (Submit for Review) -> Trạng thái khóa học chuyển sang Pending và mất hết reject_note

        nhấn Quay lại để về SCR-LEC-01 : My Courses và mất hiện thông báo Save before return
    SCR-COM-01 (Common Preview):

        Màn hình dùng chung cho cả Lecturer và Admin để xem  nội dung.

Luồng Phê duyệt của Quản trị viên (Admin Flow)

Dành cho Actor là Admin để kiểm soát chất lượng nội dung trước khi công khai.
        Hành động: Chọn "Pending Queue" -> Chuyển sang SCR-ADM-01.

    SCR-ADM-01 (Approval Queue):

        Nghiệp vụ: Xem danh sách các khóa học đang chờ duyệt (Pending).

        Hành động: Chọn một khóa học -> Chuyển sang SCR-COM-01

        Hành động: Nhấn Approve (Chấp thuận) -> Khóa học chuyển sang trạng thái Active (Xuất hiện trên Home).

        Hành động: Nhấn Reject (Từ chối) -> Yêu cầu nhập rejectNote -> Khóa học quay về trạng thái Draft để Lecturer sửa lại.
