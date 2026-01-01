

### II. CỤM 2: TRẢI NGHIỆM HỌC TẬP (LEARNING RULES)

#### 1. Luật về Quyền truy cập & Hiển thị (Access & View)

* **BR-ENROLL-01 (Irreversible Action):** Hành động Ghi danh (Enroll) là cam kết vĩnh viễn. Không hỗ trợ chức năng Hủy ghi danh (Unenroll) hoặc xóa khóa học khỏi hồ sơ Student.
* **BR-ENROLL-02 (Role Restriction):** Chức năng Enroll bị vô hiệu hóa (Disabled/Hidden) đối với Lecturer và Admin.
* **BR-ACCESS-01 (Non-Sequential):** Student có quyền truy cập bất kỳ bài học nào trong khóa đã Enroll theo bất kỳ thứ tự nào (Không khóa bài sau).
* **BR-VIEW-01 (List Filtering):** Danh sách "Đang học" (`0% <= P < 100%`) và "Đã hoàn thành" (`P = 100%`) được phân loại dựa trên tiến độ tổng.
* **BR-VIEW-02 (Default Sort):** Danh sách khóa học của tôi ("My Learning") mặc định sắp xếp theo **Thời gian đăng ký mới nhất**.

#### 2. Luật về Tiến độ & Ghi chú (Progress & Note)

* **BR-PROG-01 (Completion Threshold):** Bài học (Video/Quiz) được tính là "Hoàn thành" khi đạt ngưỡng tiến độ **>= 80%**.
* **BR-PROG-02 (Monotonic Progress):** Trạng thái "Hoàn thành" là vĩnh viễn (Once True, Always True). Kết quả học lại thấp hơn không làm mất trạng thái này.
* **BR-PROG-03 (Last Write Wins):** Vị trí xem video (`last_position`) luôn lấy giá trị từ lần cập nhật mới nhất, chấp nhận ghi đè lên vị trí cũ.
* **BR-CALC-01 (Formula):** `% Tiến độ` = `(Số bài hoàn thành / Tổng số bài) * 100` (Làm tròn xuống số nguyên).
* **BR-NOTE-01 (Unique Instance):** Mỗi bài học chỉ tồn tại duy nhất 01 bản ghi chú cho một Student (ghi đè nội dung cũ, không versioning).

#### 3. Luật về Đánh giá (Assessment/Quiz)

* **BR-QUIZ-01 (Blind Client):** Đáp án đúng tuyệt đối KHÔNG được gửi xuống trình duyệt. So khớp đáp án bắt buộc thực hiện tại Server.
* **BR-QUIZ-02 (Submission Required):** Kết quả chỉ được ghi nhận khi có lệnh "Nộp bài". Thoát ngang/Mất mạng = Không tính điểm.
* **BR-QUIZ-03 (Time Limit):** Thời gian làm bài giới hạn cứng **10 phút**. Hết giờ hệ thống tự động thu bài (Auto-submit).
* **BR-QUIZ-04 (Unlimited Retakes):** Không giới hạn số lần làm lại bài Quiz.

---
