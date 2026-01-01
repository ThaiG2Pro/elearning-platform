### BUCD-05: ĐĂNG KÝ HỌC (ENROLL)

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-05**                                                                                                                                                 |
| **Use Case Name**   | **Đăng ký học (Enroll)**                                                                                                                                    |
| **Actors**          | **Guest**, **Student**                                                                                                                                      |
| **Pre-conditions**  | Khóa học đang ở trạng thái hoạt động công khai (Active).                                                                                                    |
| **Post-conditions** | 1. Người học chính thức sở hữu quyền truy cập nội dung bài học.<br><br>  <br><br>2. Người học được chuyển tiếp ngay lập tức vào không gian học tập thực tế. |

#### **Main Flow (Luồng chính)**

1. **Student** yêu cầu tham gia một khóa học cụ thể.

2. **Hệ thống** xác lập quyền truy cập bài học vĩnh viễn cho Student đối với khóa học này.

3. **Hệ thống** thực hiện chuyển tiếp Student tới không gian học tập của khóa học.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 5a: Guest yêu cầu tham gia học**

    1. **Guest** yêu cầu tham gia khóa học khi chưa xác thực danh tính.

    2. **Hệ thống** thực hiện chuyển giao quyền kiểm soát sang hành trình **BUCD-00 (Gateway)** để xác định danh tính.

    3. Sau khi xác thực thành công, **Người dùng** bắt đầu lại hành trình từ Bước 1 của Luồng chính.

- **Alt 5b: Student đã có quyền truy cập yêu cầu tham gia lại**

    1. **Student** yêu cầu tham gia khóa học đã sở hữu quyền truy cập từ trước.

    2. **Hệ thống** nhận diện quyền hiện hữu và chuyển tiếp Student tới vị trí học tập hiện tại trong khóa học đó.


 Điểm quyết định nghiệp vụ (Dành cho Tầng 3 - Business Rules)

- **[Rule 16]**: Xác định hành động Enroll là cam kết cuối cùng, không thể hoàn tác hoặc hủy bỏ.

- **[Rule 17]**: Logic vô hiệu hóa hành động Enroll đối với các vai trò không được phép (Lecturer/Admin).

- **[Rule 18]**: Cơ chế nhận diện và khôi phục vị trí học tập hiện tại cho người học đã đăng ký.


---



### BUCD-06 : HỌC TẬP QUA VIDEO

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Use Case ID**     | **BUCD-06**                                                                                                                                                                                            |
| **Use Case Name**   | **Học tập qua Video**                                                                                                                                                                                  |
| **Actors**          | **Student**, **YouTube System**                                                                                                                                                                        |
| **Pre-conditions**  | 1. Student sở hữu quyền truy cập khóa học.<br><br>  <br><br>2. Nội dung video thuộc khóa học đang công khai.                                                                                           |
| **Post-conditions** | 1. Tiến trình học tập được hệ thống ghi nhận chính xác.<br><br>  <br><br>2. Hệ thống xác lập trạng thái hoàn thành khi đáp ứng tiêu chuẩn.<br><br>  <br><br>3. Vị trí học tập cuối cùng được bảo toàn. |

#### **Main Flow (Luồng chính)**

1. **Student** yêu cầu tiếp nhận nội dung của một bài giảng video.

2. **Hệ thống** cung cấp nội dung bài giảng và thực hiện khôi phục vị trí học tập gần nhất của Student (nếu có).

3. **Student** thực hiện việc tiếp nhận kiến thức từ video.

4. **Hệ thống** thực hiện ghi nhận tiến trình học tập của Student một cách liên tục trong suốt hành trình.

5. **Hệ thống** thực hiện xác lập trạng thái hoàn thành bài học khi Student đáp ứng đủ khối lượng nội dung quy định.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 6a: Người học xem lại nội dung đã hoàn thành**

    1. **Student** yêu cầu xem lại bài giảng đã đạt trạng thái hoàn thành.

    2. **Hệ thống** cung cấp nội dung từ thời điểm bắt đầu bài giảng.

    3. Hành trình tiếp tục như Luồng chính nhưng hệ thống bảo toàn trạng thái hoàn thành đã có.

- **Alt 6b: Người học chủ động dừng hành trình**

    1. **Student** rời khỏi bài giảng khi chưa hoàn thành nội dung.

    2. **Hệ thống** thực hiện ghi nhận vị trí học tập thực tế cuối cùng.


---

 🔍 Điểm rẽ nhánh nghiệp vụ (Dành cho Tầng 3 - Business Rules)

- **[Rule 19]**: Ngưỡng thời lượng tối thiểu để xác lập trạng thái hoàn thành (80%).

- **[Rule 20]**: Cơ chế bảo toàn trạng thái hoàn thành vĩnh viễn (Once True, Always True).

- **[Rule 21]**: Tần suất và điều kiện ghi nhận tiến trình tự động (Heartbeat logic).

- **[Exception Flow]**: Xử lý các trường hợp YouTube System không phản hồi hoặc nội dung video không khả dụng.

---

### BUCD-07 : GHI CHÚ BÀI HỌC

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-07**                                                                                                                                                 |
| **Use Case Name**   | **Ghi chú bài học**                                                                                                                                         |
| **Actors**          | **Student**                                                                                                                                                 |
| **Pre-conditions**  | Student đang tiếp nhận nội dung bài học video (đang thực hiện **BUCD-06**).                                                                                 |
| **Post-conditions** | 1. Hệ thống lưu trữ duy nhất một bản ghi chú mới nhất cho bài học.<br><br>  <br><br>2. Nội dung ghi chú cũ (nếu có) bị thay thế hoàn toàn bởi nội dung mới. |

#### **Main Flow (Luồng chính)**

1. **Student** thực hiện cập nhật nội dung tư duy cá nhân gắn liền với bài học đang xem.

2. **Student** yêu cầu hệ thống xác nhận lưu trữ nội dung.

3. **Hệ thống** thực hiện ghi đè nội dung mới lên bản ghi chú hiện tại của bài học đó.

4. **Hệ thống** xác nhận việc lưu trữ thành công và duy trì hiển thị nội dung vừa cập nhật.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 7a: Huỷ bỏ cập nhật**

    1. **Student** chủ động dừng hành trình ghi chú hoặc rời khỏi không gian bài học mà không yêu cầu lưu trữ.

    2. **Hệ thống** thực hiện bảo toàn nội dung ghi chú ở trạng thái đã lưu gần nhất.

🔍 Điểm quyết định nghiệp vụ (Dành cho Tầng 3 - Business Rules)

- **[Rule 23]**: Quy định về việc không hỗ trợ định dạng (Plain text only).

- **[Rule 24]**: Quy tắc "Không tự động lưu": Chỉ thực hiện lệnh ghi đè khi có yêu cầu chủ động từ người dùng.

- **[Rule 25]**: Sự tồn tại duy nhất (Unique Note): Mỗi cặp `Student - Lesson` chỉ tương ứng với một bản ghi dữ liệu ghi chú.

- **[Rule 26]**: Vô hiệu hóa tính năng ghi chú khi người dùng đang ở chế độ xem trước (Preview Mode).

---
### BUCD-08: THỰC HIỆN BÀI KIỂM TRA

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-08**                                                                                                                                                                                                                                             |
| **Use Case Name**   | **Thực hiện bài kiểm tra (Quiz)**                                                                                                                                                                                                                       |
| **Actors**          | **Student**                                                                                                                                                                                                                                             |
| **Pre-conditions**  | Student đã được xác lập quyền tiếp cận bài kiểm tra thuộc khóa học đang hoạt động.                                                                                                                                                                      |
| **Post-conditions** | 1. Kết quả đánh giá năng lực được hệ thống ghi nhận chính thức.<br><br>  <br><br>2. Trạng thái bài học được cập nhật dựa trên kết quả đạt được.<br><br>  <br><br>3. Hệ thống cung cấp thông tin đối chiếu giữa đáp án của Student và kết quả chính xác. |

#### **Main Flow (Luồng chính)**

1. **Student** yêu cầu bắt đầu lượt đánh giá năng lực.

2. **Hệ thống** cung cấp danh mục các câu hỏi và thực hiện ghi nhận thời gian bắt đầu hành trình.

3. **Student** thực hiện phản hồi các nội dung đánh giá do hệ thống đưa ra.

4. **Student** yêu cầu nộp bài để xác nhận hoàn tất lượt đánh giá.

5. **Hệ thống** thực hiện chấm điểm và phản hồi kết quả xác thực cùng thông tin đối chiếu đáp án cho Student.

6. **Hệ thống** cập nhật trạng thái hoàn thành cho bài kiểm tra nếu kết quả thỏa mãn tiêu chuẩn nghiệp vụ.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 8a: Thực hiện lại lượt đánh giá (Retake)**

    1. **Student** yêu cầu làm lại bài kiểm tra sau khi đã có kết quả từ các lượt trước đó.

    2. **Hệ thống** thực hiện làm mới hành trình đánh giá và quay lại Bước 2 của Luồng chính.

- **Alt 8b: Chủ động dừng hành trình đánh giá**

    1. **Student** thoát khỏi bài kiểm tra trước khi thực hiện lệnh nộp bài.

    2. **Hệ thống** không ghi nhận kết quả cho lượt làm bài này và bảo toàn trạng thái hiện tại của Student.


 🔍 Ghi chú chuyển tiếp (Dành cho Tầng 3 - Business Rules)

- **[Rule 27]**: Ngưỡng điểm để xác lập trạng thái hoàn thành (80%).

- **[Rule 28]**: Quy tắc "Once True, Always True" cho trạng thái hoàn thành của Quiz.

- **[Rule 29]**: Thời hạn làm bài quy định (Timeout).

- **[Exception Flow]**: Hệ thống tự động ghi nhận kết quả và chấm dứt lượt làm bài khi hết thời gian quy định (Timeout).
