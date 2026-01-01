### BUCD-09a: QUẢN LÝ CẤU TRÚC CHƯƠNG

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-09a**                                                                                                                                                           |
| **Use Case Name**   | **Quản lý cấu trúc Chương**                                                                                                                                            |
| **Actors**          | **Lecturer**                                                                                                                                                           |
| **Pre-conditions**  | Khóa học đang ở trạng thái cho phép chỉnh sửa (**Draft** ).                                                                                                            |
| **Post-conditions** | 1. Hệ thống ghi nhận sự thay đổi về số lượng và thứ tự các Chương.<br><br>  <br><br>2. Các thành phần phụ thuộc (Bài học) được xử lý tương ứng khi có lệnh xóa Chương. |
#### **Main Flow (Luồng chính)**

1. **Lecturer** yêu cầu thiết lập khung cấu trúc cho khóa học.

2. **Lecturer** thực hiện các hành động bổ sung mới hoặc thay đổi tên gọi của các Chương.

3. **Hệ thống** ghi nhận cấu trúc mới và xác nhận việc lưu trữ thành công.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 9a.1: Xóa chương hiện có (Cascade Delete)**

    1. **Lecturer** thực hiện lệnh xóa một Chương đã có trong cấu trúc.

    2. **Hệ thống** đưa ra cảnh báo về việc các Bài học (Video/Quiz) bên trong chương đó cũng sẽ bị xóa bỏ hoàn toàn.

    3. **Lecturer** xác nhận việc loại bỏ.

    4. **Hệ thống** thực hiện xóa bỏ Chương cùng toàn bộ học liệu đi kèm và cập nhật lại danh sách.

 🔍 Điểm quyết định nghiệp vụ (Dành cho Tầng 3 - Business Rules)

- **[Rule 30]**: Khóa học phải duy trì ít nhất 01 Chương để đáp ứng cấu trúc tối thiểu.

- **[Rule 31]**: Cơ chế sắp xếp: Hệ thống tự động đánh số thứ tự Chương dựa trên trình tự tạo lập hoặc di chuyển của Actor.

- **[Rule 32]**: Quy tắc Cascade Delete: Mọi dữ liệu liên quan đến Bài học trong Chương bị xóa sẽ không thể khôi phục.


---
### BUCD-09b: QUẢN LÝ BÀI HỌC VIDEO

| **Mục**             | **Nội dung nghiệp vụ**                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-09b**                                                                                 |
| **Use Case Name**   | **Quản lý bài học Video**                                                                    |
| **Actors**          | **Lecturer**                                                                                 |
| **Pre-conditions**  | Khóa học hiện có cấu trúc chương hồi (BUCD-09a) và đang ở trạng thái cho phép chỉnh sửa.     |
| **Post-conditions** | Thông tin học liệu video được hệ thống ghi nhận tạm thời để chuẩn bị cho lệnh lưu tập trung. |

#### **Main Flow (Luồng chính)**

1. **Lecturer** cung cấp thông tin liên kết nội dung từ nguồn YouTube cho một bài học cụ thể.

2. **Hệ thống** thực hiện kiểm tra tính hợp lệ về định dạng liên kết (Chỉ chấp nhận định dạng từ YouTube).

3. **Hệ thống** xác nhận tính khả dụng của liên kết và ghi nhận nội dung vào cấu trúc bài học hiện tại.

4. **Lecturer** thực hiện lệnh lưu tập trung tại giao diện quản trị khóa học để chính thức ghi nhận thay đổi vào hệ thống.


Điểm quyết định nghiệp vụ (Dành cho Tầng 3 - Business Rules)

- **[Rule 43] - Xác thực liên kết:** Chỉ chấp nhận các chuỗi liên kết có cấu trúc tên miền thuộc YouTube. Mọi nguồn khác (Facebook, Cloud storage khác...) đều bị coi là không hợp lệ.


---
### BUCD-09c QUẢN LÝ BÀI HỌC QUIZ

| **Mục**             | **Nội dung nghiệp vụ**                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| **Use Case ID**     | **BUCD-09c**                                                             |
| **Use Case Name**   | **Quản lý bài học Quiz**                                                 |
| **Actors**          | **Lecturer**                                                             |
| **Pre-conditions**  | Khóa học đang ở trạng thái cho phép chỉnh sửa.                           |
| **Post-conditions** | Dữ liệu câu hỏi và đáp án được hệ thống trích xuất và ghi nhận tạm thời. |

#### **Main Flow (Luồng chính)**

1. **Lecturer** cung cấp tệp dữ liệu chứa danh mục câu hỏi và đáp án cho bài kiểm tra.

2. **Hệ thống** thực hiện xác thực cấu trúc và nội dung dữ liệu bên trong tệp cung cấp.

3. **Hệ thống** trích xuất thông tin và hiển thị danh mục bài tập để Lecturer kiểm tra.

4. **Lecturer** thực hiện lệnh lưu tập trung tại giao diện quản trị khóa học để xác lập dữ liệu bài kiểm tra vào hệ thống.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 9c.1: Tệp dữ liệu không hợp lệ**

    1. **Hệ thống** nhận diện dữ liệu trong tệp không đúng cấu trúc hoặc thiếu thông tin bắt buộc.

    2. **Hệ thống** từ chối trích xuất và thông báo lỗi dữ liệu cho Lecturer.

    3. **Lecturer** thực hiện điều chỉnh dữ liệu và cung cấp lại tệp mới hoặc dừng hành trình.

Điểm quyết định nghiệp vụ (Dành cho Tầng 3 - Business Rules)
- **[Rule 44] - Ràng buộc tệp Quiz:** Tệp cung cấp phải chứa đầy đủ cột thông tin: Câu hỏi, các phương án lựa chọn và đáp án đúng. Thiếu một trong các yếu tố này sẽ dẫn đến lỗi xác thực.

- **[Rule 45] - Tính nhất quán (Atomic Save):** Việc thay đổi tại 09b/09c sẽ không có hiệu lực nếu Lecturer thoát trình duyệt hoặc rời khỏi trang 09a mà không nhấn lệnh "Lưu" (Không tự động lưu).

---
### BUCD-10 Gửi yêu cầu phê duyệt

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-10**                                                                                                                                    |
| **Use Case Name**   | **Gửi yêu cầu phê duyệt**                                                                                                                      |
| **Actors**          | **Lecturer**                                                                                                                                   |
| **Pre-conditions**  | Khóa học đã hoàn thiện cấu trúc nội dung và đang ở trạng thái cho phép đăng tải.                                                               |
| **Post-conditions** | 1. Trạng thái khóa học chuyển đổi sang **Pending**.<br><br>  <br><br>2. Hệ thống chuyển giao quyền kiểm soát khóa học sang bộ phận kiểm duyệt. |

#### **Main Flow (Luồng chính)**

1. **Lecturer** yêu cầu đăng tải toàn bộ nội dung khóa học để phê duyệt.

2. **Hệ thống** xác nhận yêu cầu và thực hiện chuyển đổi trạng thái khóa học sang **Pending**.

3. **Hệ thống** thực hiện giới hạn quyền chỉnh sửa nội dung của Actor đối với khóa học này.

4. **Hệ thống** thông báo việc gửi yêu cầu phê duyệt hoàn tất.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 1a: Lecturer thay đổi quyết định trước khi gửi**

    1. **Lecturer** chủ động dừng yêu cầu đăng tải trước khi xác nhận cuối cùng.

    2. **Hệ thống** bảo toàn trạng thái hiện tại (Draft/Rejected) của khóa học.


🔍 Chuyển giao xuống Tầng 3 (Business Rules & Exception)

- **[Rule 40 - Điều kiện POST]**: Hệ thống chỉ thực thi lệnh tại Bước 2 nếu khóa học thỏa mãn cấu trúc: Tên + Mô tả + Ít nhất 1 Chương + Mỗi chương có ít nhất 1 bài học không rỗng.

- **[Exception 10.1]**: Nếu vi phạm **Rule 40**, hệ thống từ chối chuyển trạng thái và đưa ra danh mục các thành phần cần hoàn thiện.

- **[Rule 41]**: Trạng thái **Pending** kích hoạt chế độ Read-only trên giao diện biên tập của Lecturer.
---
### BUCD-11
| **Mục**             | **Nội dung nghiệp vụ**                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-11**                                                                                                 |
| **Use Case Name**   | **Xem trước (Preview)**                                                                                     |
| **Actors**          | **Lecturer**, **Admin**                                                                                     |
| **Pre-conditions**  | Khóa học đã có dữ liệu nội dung (Video/Quiz).                                                               |
| **Post-conditions** | Actor nhận diện được giao diện và luồng học tập thực tế của Student mà không làm thay đổi dữ liệu hệ thống. |


#### **Main Flow (Luồng chính)**

1. **Actor** yêu cầu trải nghiệm nội dung khóa học dưới vai trò người học.

2. **Hệ thống** thực hiện mô phỏng không gian học tập dựa trên dữ liệu hiện tại của khóa học.

3. **Actor** thực hiện tương tác với các nội dung bài giảng và bài kiểm tra để đánh giá trải nghiệm.

4. **Hệ thống** ghi nhận các tương tác tạm thời và không thực hiện lưu trữ tiến độ hay kết quả vào hồ sơ thật của Actor.

5. **Actor** yêu cầu kết thúc chế độ xem trước.

6. **Hệ thống** đóng không gian mô phỏng và đưa Actor quay lại khu vực quản trị.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 1a: Actor thay đổi thiết bị/môi trường xem**

    1. **Actor** yêu cầu thay đổi kích thước hoặc phương thức hiển thị mô phỏng.

    2. **Hệ thống** điều chỉnh không gian hiển thị tương ứng để Actor kiểm tra tính tương thích.

 🔍 Điểm quyết định nghiệp vụ (Dành cho Tầng 3 - Business Rules)

- **[Rule 45] - Tính cô lập dữ liệu:** Mọi hành động trong Preview (như làm Quiz, xem Video) đều không được tính vào báo cáo tổng quát của hệ thống và không kích hoạt các thông báo.

- **[Rule 46] - Phạm vi tiếp cận:** Preview cho phép xem toàn bộ các chương/bài kể cả khi khóa học chưa Active (Khác với Student chỉ xem được khi đã Enroll và khóa học Active).

- **[Rule 47] - Quyền hạn đặc biệt:** Chế độ Preview của Admin được kích hoạt ngay khi khóa học ở trạng thái **Pending** để phục vụ việc kiểm duyệt.


---
### BUCD-12: PHÊ DUYỆT / TỪ CHỐI

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Use Case ID**     | **BUCD-12**                                                                                                                                                  |
| **Use Case Name**   | **Phê duyệt / Từ chối**                                                                                                                                      |
| **Actors**          | **Admin**                                                                                                                                                    |
| **Pre-conditions**  | Khóa học đang ở trạng thái **Pending** (Chờ duyệt).                                                                                                          |
| **Post-conditions** | 1. Trạng thái khóa học được chuyển đổi sang **Active** hoặc **Rejected**.<br><br>  <br><br>2. Ghi chú phản hồi (nếu có) được lưu trữ cùng thực thể khóa học. |

#### **Main Flow (Luồng chính)**

1. **Admin** thực hiện đánh giá nội dung khóa học (có thể thông qua **BUCD-11**).

2. **Admin** yêu cầu xác lập trạng thái mới cho khóa học dựa trên kết quả kiểm duyệt.

3. **Hệ thống** thực hiện ghi nhận quyết định và chuyển đổi trạng thái nghiệp vụ tương ứng:

    - _Trường hợp Chấp thuận:_ Trạng thái chuyển sang **Active**.

    - _Trường hợp Không chấp thuận:_ Trạng thái chuyển sang **Rejected**.

4. **Hệ thống** xác nhận hoàn tất quy trình kiểm duyệt và thông báo tới các bên liên quan.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 12.1: Admin gửi phản hồi khi Từ chối**

    1. Tại thời điểm chọn trạng thái không chấp thuận, **Admin** cung cấp nội dung lý do từ chối (Reject Note).

    2. **Hệ thống** ghi nhận nội dung phản hồi này gắn liền với phiên bản kiểm duyệt của khóa học.

    3. Hành trình quay lại Bước 3 của Luồng chính.


 🔍 Điểm quyết định nghiệp vụ (Dành cho Tầng 3 - Business Rules)

- **[Rule 48] - Tính bất biến:** Khi trạng thái chuyển sang **Active**, hệ thống kích hoạt cơ chế khóa dữ liệu (Immutable) đối với cả Lecturer và Admin.

- **[Rule 49] - Hiệu lực của Reject Note:** Nội dung phản hồi chỉ được hiển thị cho Lecturer khi khóa học ở trạng thái **Rejected** để phục vụ việc sửa đổi tại **BUCD-09b**.

- **[Rule 50] - Quyền hạn:** Chỉ duy nhất vai trò Admin mới có thể thực hiện BUCD-12.

