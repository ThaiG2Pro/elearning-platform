### BUCD-00: XÁC ĐỊNH DANH TÍNH (JOIN GATEWAY)

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-00**                                                                                                                                                                                                               |
| **Use Case Name**   | **Xác định danh tính (Join Gateway)**                                                                                                                                                                                     |
| **Actors**          | **Guest**                                                                                                                                                                                                                 |
| **Pre-conditions**  | Guest đang ở trạng thái chưa xác thực và có nhu cầu tham gia hệ thống.                                                                                                                                                    |
| **Post-conditions** | 1. Hệ thống xác định được trạng thái danh tính của Guest.<br><br>  <br><br>2. Hệ thống bảo toàn được ý định tham gia ban đầu của Guest.<br><br>  <br><br>3. Guest được chuyển đến hành trình nghiệp vụ tiếp theo phù hợp. |

#### **Main Flow (Luồng chính)**

1. **Guest** cung cấp thông tin định danh để hệ thống nhận diện.

2. **Hệ thống** ghi nhận mục đích tham gia ban đầu của Guest.

3. **Hệ thống** kiểm tra trạng thái hoạt động của danh tính trong cơ sở dữ liệu.

4. **Hệ thống** thực hiện chuyển hướng **Guest** sang hành trình tiếp theo dựa trên tình trạng danh tính:

    - _Trường hợp danh tính đã sẵn sàng:_ Chuyển đến luồng Đăng nhập.

    - _Trường hợp danh tính chưa sẵn sàng/chưa tồn tại:_ Chuyển đến luồng Đăng ký.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 1a: Thay đổi thông tin nhận diện**

    1. **Guest** yêu cầu quay lại bước nhận diện ban đầu.

    2. **Hệ thống** đưa **Guest** trở về trạng thái nhập thông tin nhận diện ban đầu.


> 📝 **Ghi chú chuyển tiếp (Tầng 3):** Các quy tắc về kiểm tra định dạng email và phân loại trạng thái chi tiết sẽ được xử lý tại **Business Rules**.

 Ghi chú nghiệp vụ (Dành cho Tầng 3)

- **Điểm rẽ nhánh nghiệp vụ (Decision Points):**

    - **[Rule 01]**: Kiểm tra định dạng email hợp lệ (theo quy tắc frontend) trước khi cho phép hệ thống xử lý.

    - **[Rule 02]**: Phân loại trạng thái Email (Đã kích hoạt / Chưa kích hoạt / Chưa tồn tại) để quyết định trang đích.

    - **[Rule 03]**: Cơ chế lưu giữ tham số điều hướng (continue_url) để đảm bảo trải nghiệm người dùng không bị gián đoạn sau khi định danh thành công.

    - **[BR-ID-01]**: Đảm bảo email là định danh duy nhất; kiểm tra không trùng lặp trong cơ sở dữ liệu trước khi chuyển hướng.

---

### BUCD-02: ĐĂNG KÝ TÀI KHOẢN

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-02**                                                                                                                                     |
| **Use Case Name**   | **Đăng ký tài khoản**                                                                                                                           |
| **Actors**          | **Guest**, **Email System**                                                                                                                     |
| **Pre-conditions**  | 1. Guest đã hoàn thành định danh tại **BUCD-00**.<br><br>  <br><br>2. Danh tính được xác định là chưa sẵn sàng để truy cập trực tiếp.           |
| **Post-conditions** | 1. Tài khoản được xác lập trạng thái hoạt động chính thức.<br><br>  <br><br>2. Guest kết thúc hành trình đăng ký và quay lại cửa ngõ định danh. |
#### **Main Flow 1: Yêu cầu kích hoạt (Execution Instance 1)**

_Kích hoạt khi Guest gửi thông tin đăng ký_.

1. **Guest** cung cấp các thông tin cá nhân để thiết lập hồ sơ.

2. **Guest** yêu cầu kích hoạt tài khoản.

3. **Hệ thống** ghi nhận thông tin hồ sơ và yêu cầu **Email System** chuyển liên kết xác thực.

4. **Email System** thực hiện gửi thông tin xác thực tới địa chỉ liên lạc của Guest.

5. **Hệ thống** kết thúc lượt xử lý và chờ phản hồi từ Guest.


#### **Main Flow 2: Xác thực tài khoản (Execution Instance 2)**

_Kích hoạt khi Guest nhấn vào liên kết trong Email_.

1. **Guest** thực hiện xác thực thông qua liên kết được cung cấp.

2. **Hệ thống** ghi nhận hành động xác thực và cập nhật trạng thái tài khoản thành hoạt động.

3. **Hệ thống** điều hướng **Guest** quay trở lại cửa ngõ định danh (Join Gateway).

#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 2a: Thay đổi thông tin đăng ký / Yêu cầu lại xác thực**

    1. **Guest** thực hiện cập nhật lại thông tin cá nhân hoặc yêu cầu phát hành lại liên kết xác thực mới.

    2. **Hệ thống** cập nhật thông tin mới và yêu cầu **Email System** gửi lại liên kết xác thực mới.

    3. **Hệ thống** vô hiệu hóa các liên kết xác thực đã phát hành trước đó.


> 📝 **Ghi chú chuyển tiếp (Tầng 3):** Các trường hợp liên kết không hợp lệ, hết hạn hoặc lỗi từ phía Email System (Exception Flows) sẽ được xử lý tại **Business Rules**.

Điểm quyết định nghiệp vụ (Dành cho Tầng 3)

- **[Rule 04]**: Kiểm tra định dạng và độ dài của các trường thông tin (Name, Age, Password) trước khi cho phép gửi yêu cầu.

- **[Rule 05]**: Cơ chế vô hiệu hóa link cũ khi có yêu cầu ghi đè để tránh xung đột dữ liệu.

- **[Rule 06]**: Tự động xóa dữ liệu đăng ký tạm sau 24 giờ nếu không có hành động kích hoạt thành công.

- **[Rule 07]**: Bảo lưu thông tin mục đích truy cập (id_course) trong suốt quá trình điều hướng giữa các trang.

- **[BR-ID-01]**: Đảm bảo email là định danh duy nhất; từ chối đăng ký nếu email đã tồn tại trong hệ thống.

- **[BR-ID-04]**: Kiểm tra mật khẩu có độ dài tối thiểu 6 ký tự; từ chối nếu không đạt yêu cầu.

- **[BR-ID-05]**: Kiểm tra tuổi là số nguyên dương lớn hơn 0; từ chối nếu không hợp lệ.

---
### BUCD-03: ĐĂNG NHẬP HỆ THỐNG

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case ID**     | **BUCD-03**                                                                                                                                                                                                                                                                  |
| **Use Case Name**   | **Đăng nhập hệ thống**                                                                                                                                                                                                                                                       |
| **Actors**          | **Guest** (sau đó trở thành Authenticated User)                                                                                                                                                                                                                              |
| **Pre-conditions**  | 1. Guest đã hoàn thành định danh tại **BUCD-00**.<br><br>  <br><br>2. Danh tính được xác định là tài khoản đã tồn tại và đã kích hoạt.                                                                                                                                       |
| **Post-conditions** | 1. Guest trở thành Người dùng đã xác thực (Authenticated User) trong hệ thống.<br><br>  <br><br>2. Hệ thống thiết lập quyền hạn tương ứng với vai trò (Role) của người dùng.<br><br>  <br><br>3. Người dùng được đưa tới vị trí làm việc/học tập phù hợp với ý định ban đầu. |

#### **Main Flow (Luồng chính)**

1. **Guest** cung cấp thông tin xác thực (mật khẩu) tương ứng với danh tính đã xác nhận.

2. **Hệ thống** thực hiện kiểm tra tính hợp lệ của thông tin xác thực.

3. **Hệ thống** xác lập quyền truy cập chính thức cho người dùng dựa trên vai trò (Role) đã được ghi nhận.

4. **Hệ thống** thực hiện đưa người dùng tới đích đến dựa trên mục đích tham gia được bảo toàn từ trước:

    - _Nếu có ý định tham gia khóa học cụ thể:_ Chuyển tới nội dung chi tiết của khóa học đó.

    - _Nếu không có ý định cụ thể:_ Chuyển tới danh sách khóa học chung.


#### **Alternate Flow (Luồng rẽ nhánh)**

- **Alt 3a: Chuyển giao yêu cầu khôi phục mật khẩu**

    1. **Guest** yêu cầu cấp lại mật khẩu do không thể cung cấp thông tin xác thực.

    2. **Hệ thống** thực hiện chuyển giao quyền kiểm soát sang hành trình **BUCD-04: Khôi phục mật khẩu**.


🔍 Điểm rẽ nhánh nghiệp vụ (Dành cho Tầng 3)

- **[Rule 08]**: Logic phân loại điều hướng dựa trên sự hiện diện của thông tin khóa học (id_course).

- **[Rule 09]**: Xác định quyền hạn hiển thị và tương tác của các thành phần chức năng (như nút Enroll hoặc thanh điều hướng) dựa trên vai trò (Role) sau khi xác thực.

- **[Exception Flow]**: Việc xử lý sai thông tin xác thực hoặc lỗi hệ thống sẽ được quy định tại tầng Business Rules và UI Spec.

- **[BR-ID-02]**: Chỉ cho phép đăng nhập nếu tài khoản có trạng thái Active; từ chối nếu Inactive.

---
### BUCD-04: KHÔI PHỤC MẬT KHẨU

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Use Case ID**     | **BUCD-04**                                                                                                                                                                                                                                            |
| **Use Case Name**   | **Khôi phục mật khẩu**                                                                                                                                                                                                                                 |
| **Actors**          | **Guest** (Người dùng chưa xác thực), **Email System**                                                                                                                                                                                                 |
| **Pre-conditions**  | Người dùng có nhu cầu thiết lập lại thông tin xác thực do không thể truy cập hệ thống.                                                                                                                                                                 |
| **Post-conditions** | 1. Thông tin xác thực (mật khẩu) được cập nhật mới.<br><br>  <br><br>2. Các liên kết xác thực liên quan bị chấm dứt hiệu lực.<br><br>  <br><br>3. Người dùng được đưa về cửa ngõ định danh ban đầu (không bảo toàn ý định tham gia khóa học trước đó). |

#### **Main Flow 1: Yêu cầu khôi phục (Execution Instance 1)**

_Kích hoạt khi Guest gửi email yêu cầu._

1. **Guest** cung cấp thông tin liên lạc (email) để yêu cầu khôi phục quyền truy cập.

2. **Hệ thống** tiếp nhận yêu cầu và đưa ra phản hồi xác nhận trung tính.

3. **Hệ thống** thực hiện kiểm tra ngầm và yêu cầu **Email System** chuyển liên kết thiết lập mật khẩu.

4. **Email System** thực hiện gửi thông tin xác thực tới địa chỉ liên lạc của Guest.

5. **Hệ thống** kết thúc lượt xử lý và đóng yêu cầu.


#### **Main Flow 2: Thiết lập mật khẩu mới (Execution Instance 2)**

_Kích hoạt khi Guest nhấn vào liên kết trong Email._

1. **Guest** thực hiện kích hoạt yêu cầu thiết lập lại thông qua liên kết xác thực được cung cấp.

2. **Guest** cung cấp thông tin mật khẩu mới để thiết lập lại bảo mật.

3. **Hệ thống** thực hiện cập nhật thông tin mật khẩu mới và chấm dứt hiệu lực của liên kết xác thực.

4. **Hệ thống** điều hướng Guest quay lại cửa ngõ định danh (Join Gateway) và xóa bỏ mọi ý định tham gia khóa học trước đó.


#### **Alternate Flow**

- **Alt 4a: Ghi đè yêu cầu khôi phục (Overwrite)**

    1. **Guest** thực hiện lại yêu cầu khôi phục mật khẩu (Trigger lại Main Flow 1).

    2. **Hệ thống** thực hiện lệnh hủy (Revoke) đối với tất cả các liên kết xác thực đã phát hành trước đó cho danh tính này.

    3. Luồng tiếp tục từ bước 2 của Main Flow 1.

---

 🔍 Điểm quyết định nghiệp vụ (Dành cho Tầng 3)

- **[Rule 10]**: Quy tắc kiểm tra ngầm trạng thái tài khoản (đã tồn tại và đã kích hoạt) để quyết định việc gửi mail.

- **[Rule 11]**: Nội dung phản hồi trung tính tại giao diện yêu cầu khôi phục.

- **[Rule 12]**: Cơ chế vô hiệu hóa (Revoke) liên kết cũ ngay khi yêu cầu mới được phát sinh hoặc khi mật khẩu đã đổi thành công.

- **[Rule 13]**: Quy định về việc xóa bỏ thông tin mục đích tham gia (id_course) sau khi hành trình khôi phục mật khẩu bắt đầu.

- **[BR-ID-04]**: Kiểm tra mật khẩu mới có độ dài tối thiểu 6 ký tự; từ chối nếu không đạt yêu cầu.

---

### BUCD-13a: CẬP NHẬT HỒ SƠ

| **Mục**             | **Nội dung nghiệp vụ**                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**   | **Cập nhật hồ sơ**                                                                                                      |
| **Actors**          | **Authenticated User**                                                                                                  |
| **Pre-conditions**  | Người dùng đã đăng nhập thành công vào hệ thống.                                                                        |
| **Post-conditions** | 1. Thông tin định danh được cập nhật mới.<br><br>  <br><br>2. Các yếu tố nhận diện liên quan được hệ thống đồng bộ hóa. |

**Main Flow (Luồng chính):**

1. **Người dùng** cung cấp các thông tin định danh mới.

2. **Hệ thống** ghi nhận và kiểm tra yêu cầu thay đổi thông tin.

3. **Hệ thống** cập nhật hồ sơ và các yếu tố nhận diện đi kèm của người dùng.

4. **Hệ thống** xác nhận việc cập nhật hoàn tất.


**Alternate Flow (Luồng rẽ nhánh):**

- **Alt 13a.1: Hủy bỏ thay đổi:** Người dùng chủ động dừng hành trình cập nhật trước khi xác nhận lưu, hệ thống bảo toàn dữ liệu cũ.


---

### BUCD-13b: ĐỔI MẬT KHẨU CHỦ ĐỘNG

| **Mục**             | **Nội dung nghiệp vụ**                                       |
| ------------------- | ------------------------------------------------------------ |
| **Use Case Name**   | **Đổi mật khẩu chủ động**                                    |
| **Actors**          | **Authenticated User**                                       |
| **Pre-conditions**  | Người dùng đã đăng nhập và có nhu cầu thiết lập lại bảo mật. |
| **Post-conditions** | Thông tin xác thực được cập nhật mới trong hệ thống.         |

**Main Flow (Luồng chính):**

1. **Người dùng** cung cấp thông tin mật khẩu mới.

2. **Hệ thống** ghi nhận và kiểm tra yêu cầu thiết lập mật khẩu.

3. **Hệ thống** thực hiện cập nhật thông tin xác thực cho tài khoản.

4. **Hệ thống** xác nhận việc thay đổi thành công.


**Alternate Flow (Luồng rẽ nhánh):**

- **Alt 13b.1: Hủy bỏ thiết lập:** Người dùng chủ động dừng hành trình đổi mật khẩu, hệ thống giữ nguyên mật khẩu hiện tại.


 Ghi chú chuyển tiếp (Dành cho Tầng 3 - Business Rules)

- **[Rule 14]**: Quy tắc lấy chữ cái đầu của Tên để tái lập Avatar mặc định.

- **[Rule 15]**: Danh sách các trường thông tin cấm sửa đổi (như Email).

- **[Exception Flow]**: Xử lý các trường hợp mật khẩu mới không trùng khớp hoặc không đạt yêu cầu về độ mạnh.

- **[BR-ID-03]**: Email là dữ liệu bất biến; từ chối mọi yêu cầu thay đổi email.

- **[BR-ID-04]**: Kiểm tra mật khẩu mới có độ dài tối thiểu 6 ký tự; từ chối nếu không đạt yêu cầu.

- **[BR-ID-05]**: Kiểm tra tuổi mới là số nguyên dương lớn hơn 0; từ chối nếu không hợp lệ.
