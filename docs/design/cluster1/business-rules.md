
### I. CỤM 1: TIẾP CẬN & ĐỊNH DANH (IDENTITY RULES)

#### 1. Luật về Danh tính & Bảo mật (Identity & Security)

* **BR-ID-01 (Unique Identity):** Email là định danh duy nhất trong hệ thống. Một Email không thể tồn tại song song ở hai tài khoản, bất kể Vai trò.
* **BR-ID-02 (Activation Gate):** Chỉ những tài khoản có trạng thái `Active` mới được cấp quyền Đăng nhập (Login). Tài khoản `Inactive` bị từ chối truy cập ở mọi cổng Login.
* **BR-ID-03 (Immutable Email):** Email đã đăng ký và kích hoạt thành công là dữ liệu bất biến (Read-only), người dùng không được phép tự thay đổi.
* **BR-ID-04 (Password Strength):** Mật khẩu người dùng bắt buộc phải có độ dài tối thiểu **6 ký tự**. Hệ thống từ chối thiết lập nếu mật khẩu không đạt độ dài này.
* **BR-ID-05 (Age Constraint):** Tuổi của người dùng (`Age`) phải là số nguyên dương lớn hơn 0.

#### 2. Luật về Phiên làm việc (Session Management)

* **BR-SESSION-01 (Multi-Device):** Hệ thống cho phép một tài khoản đăng nhập đồng thời trên nhiều thiết bị (Concurrent Sessions). Đăng nhập mới không làm logout phiên cũ.
* **BR-SESSION-02 (Session Persistence):** Phiên làm việc được duy trì (Remember Me) ngay cả khi đóng trình duyệt, trừ khi người dùng chủ động Logout hoặc Cookie hết hạn.

#### 3. Luật về Vòng đời Token (Token Lifecycle)

* **BR-TK-01 (Strict Expiry):** Mọi liên kết xác thực (Kích hoạt / Quên mật khẩu) có hiệu lực tối đa **24 giờ** kể từ thời điểm phát hành.
* **BR-TK-02 (One-Time Use):** Mã xác thực (Token) bị vô hiệu hóa ngay lập tức sau khi được sử dụng thành công lần đầu tiên.
* **BR-TK-03 (Auto Revoke):** Khi một Token mới được sinh ra cho cùng một hành động/tài khoản, toàn bộ Token cũ chưa sử dụng của hành động đó lập tức mất hiệu lực.

#### 4. Luật về Xử lý Quy trình (Processing Logic)

* **BR-PR-01 (Lazy Cleanup):** Khi có một yêu cầu đăng ký mới, hệ thống tự động xóa vĩnh viễn (Hard Delete) các tài khoản `Inactive` đã tồn tại quá 24 giờ.
* **BR-PR-02 (Intent Reset):** Khi kích hoạt luồng "Quên mật khẩu", hệ thống hủy bỏ tham số điều hướng (`continue_url`) để đảm bảo an toàn, đưa người dùng về trang chủ sau khi hoàn tất.
* **BR-PR-03 (Role-based Redirect):** Nếu không có đích đến cụ thể (`continue_url`), hệ thống điều hướng mặc định: Student -> "My Learning", Lecturer -> "My Course", Admin -> "Pending Queue".

