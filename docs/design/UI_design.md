# UI SPECIFICATION: SCR-PUB-01 (HOME - COURSE LIST)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### 1. Thông tin chung

- **Screen ID**: `SCR-PUB-01`

- **UC liên quan**: UC-01 (Browse Courses)

- **Actor**: Tất cả người dùng (Guest, Student, Lecturer, Admin).

- **API liên quan**:

    - `GET /api/v1/courses?search=<string>`

    - `POST /api/v1/auth/logout`


### 2. Layout Structure

- **Header**:

    - Logo hệ thống.

    - Khu vực điều hướng/Tài khoản: Hiển thị nút tham gia hoặc thông tin người dùng.

- **Body**:

    - **Section 01 (Tìm kiếm)**: Thanh tìm kiếm tên khóa học.

    - **Section 02 (Danh sách)**: Danh sách phẳng (Flat list) các thẻ khóa học.


### 3. UI Components (Business-level)

| **Component ID** | **Type**  | **Business Meaning** | **Logic hiển thị**                                                                                        |
| ---------------- | --------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| **CMP-01**       | Input     | Thanh tìm kiếm       | Tìm theo Tên khóa học. Áp dụng **Debounce 500ms**.                                                        |
| **CMP-02**       | Button    | Nút Tham gia (Join)  | Hiển thị khi ở trạng thái Guest.                                                                          |
| **CMP-03**       | Display   | Avatar chữ cái       | Hiển thị khi đã đăng nhập. **Logic**: Trích xuất chữ cái đầu tiên từ `fullName` để hiển thị làm đại diện. |
| **CMP-04**       | Dropdown  | Menu tài khoản       | Hiển thị các lựa chọn: Đăng xuất, Đổi mật khẩu, Sửa hồ sơ.                                                |
| **CMP-05**       | Container | Thẻ khóa học         | Bao gồm thông tin cơ bản để dẫn vào trang chi tiết.                                                       |
| **CMP-06**       | Image     | Ảnh bìa khóa học     | Sử dụng `thumbnailUrl` từ hệ thống.                                                                       |

### 4. User Intent (UI → System)

| **Intent ID** | **Mô tả**                                      | **API**                            |
| ------------- | ---------------------------------------------- | ---------------------------------- |
| **INT-01**    | Người dùng yêu cầu tìm kiếm tên khóa học       | `GET /api/v1/courses?search=...`   |
| **INT-02**    | Người dùng chọn một khóa học cụ thể            | Điều hướng dựa trên `id` khóa học. |
| **INT-03**    | Người dùng yêu cầu thoát hệ thống              | `POST /api/v1/auth/logout`         |
| **INT-04**    | Người dùng yêu cầu vào trang đăng nhập/đăng ký | Điều hướng tới Join Gateway.       |

### 5. System Feedback (System → UI)

| **Case**      | **UI Reaction**                                                  |
| ------------- | ---------------------------------------------------------------- |
| **Success**   | Hiển thị danh sách thẻ khóa học tương ứng.                       |
| **Searching** | Hiển thị trạng thái đang truy xuất dữ liệu sau 500ms ngừng nhập. |
| **No Result** | Hiển thị thông báo không tìm thấy khóa học phù hợp.              |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| **State**         | **Mô tả**      | **Trigger**                              | **Behavior**                                    |
| ----------------- | -------------- | ---------------------------------------- | ----------------------------------------------- |
| **Guest View**    | Chưa đăng nhập | Hệ thống không tìm thấy token            | Hiện CMP-02 (Join).                             |
| **Auth View**     | Đã đăng nhập   | Hệ thống xác nhận token hợp lệ           | Hiện CMP-03 (Avatar chữ cái).                   |
| **Search Active** | Đang tìm kiếm  | CMP-01 nhận giá trị và hết thời gian chờ | Hiển thị trạng thái tải dữ liệu tại Section 02. |
| **System Error**  | Lỗi kết nối    | API trả về mã lỗi 500                    | Hiển thị thông báo lỗi hệ thống.                |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

**API Source**: `GET /api/v1/courses` và `POST /api/v1/auth/login`

| **Field**    | **UI Label**   | **API Field**  | **Rule**                                       | **Editable** |
| ------------ | -------------- | -------------- | ---------------------------------------------- | ------------ |
| Course Title | Tên khóa học   | `title`        | Hiển thị văn bản thuần                         | No           |
| Thumbnail    | Ảnh bìa        | `thumbnailUrl` | Hiển thị ảnh từ URL hoặc placeholder mặc định  | No           |
| Search Key   | Tìm kiếm       | `search`       | Debounce 500ms                                 | Yes          |
| User Name    | Tên người dùng | `fullName`     | Hiển thị trên Header sau khi đăng nhập         | No           |
| Avatar       | Ảnh đại diện   | `fullName`     | **Frontend tự render** chữ cái đầu tiên từ tên | No           |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| **BR / Error Code** | **Message (Business)**                         | **UI Behavior**                   |
| ------------------- | ---------------------------------------------- | --------------------------------- |
| `SERVER_ERROR`      | Hệ thống đang gặp sự cố, vui lòng thử lại sau. | Hiển thị thông báo dạng cảnh báo. |
| `COURSE_NOT_FOUND`  | Khóa học hiện không khả dụng hoặc đã bị gỡ bỏ. | Chặn điều hướng và thông báo lỗi. |

---


# UI SPECIFICATION: SCR-PUB-02 (COURSE DETAIL)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### A. Thông tin chung

- **Screen ID**: `SCR-PUB-02`

- **UC liên quan**: UC-01 (Course Detail), BUCD-05 (Course Enrollment)

- **Actor**: Guest, Student, Lecturer, Admin

- **API liên quan**: `GET /api/v1/courses/[id]`, `POST /api/v1/courses/[id]/enroll`, `POST /api/v1/auth/logout`


### B. Layout Structure

- **Header**: Thanh điều hướng chung (Logo, Hành động tài khoản).

- **Body**:

    - **Section 01 (Navigation)**: Nút quay lại trang danh sách.

    - **Section 02 (Visual Content)**: Ảnh đại diện khóa học.

    - **Section 03 (Information)**: Tiêu đề, thông tin giảng viên và mô tả chi tiết.

    - **Section 04 (Interaction)**: Vùng thực hiện đăng ký hoặc bắt đầu học.


### C. UI Components (Business-level)

| **Component ID** | **Type** | **Business Meaning**                 |
| ---------------- | -------- | ------------------------------------ |
| **CMP-01**       | Image    | Logo hệ thống                        |
| **CMP-02**       | Button   | Nút Tham gia (Join)                  |
| **CMP-03**       | Display  | Đại diện người dùng (Avatar chữ cái) |
| **CMP-04**       | Button   | Lệnh quay lại trang chủ              |
| **CMP-05**       | Image    | Ảnh bìa khóa học (Thumbnail)         |
| **CMP-06**       | Label    | Tên bài giảng/khóa học               |
| **CMP-07**       | Label    | Tên người phụ trách (Lecturer)       |
| **CMP-08**       | Button   | Lệnh đăng ký học (Enroll Now)        |
| **CMP-09**       | Button   | Lệnh bắt đầu học (Learn Now)         |
| **CMP-10**       | Text     | Nội dung mô tả chi tiết              |

### D. User Intent (UI → System)

| **Intent ID** | **Mô tả**                                   | **API**                            |
| ------------- | ------------------------------------------- | ---------------------------------- |
| **INT-01**    | Người dùng yêu cầu xem thông tin chi tiết   | `GET /api/v1/courses/[id]`         |
| **INT-02**    | Người dùng yêu cầu tham gia hệ thống (Join) | - (Redirect sang Join Gateway)     |
| **INT-03**    | Người dùng yêu cầu đăng ký học (Enroll)     | `POST /api/v1/courses/[id]/enroll` |
| **INT-04**    | Người dùng yêu cầu vào không gian học tập   | - (Chuyển sang SCR-LRN-01)         |
| **INT-05**    | Người dùng yêu cầu thoát hệ thống           | `POST /api/v1/auth/logout`         |

### E. System Feedback (System → UI)

| **Case**           | **UI Reaction**                               |
| ------------------ | --------------------------------------------- |
| Success            | Hiển thị đầy đủ nội dung từ CMP-05 đến CMP-10 |
| Course Enrolled    | Thay thế CMP-08 bằng CMP-09                   |
| Unauthorized Guest | Kích hoạt INT-02 khi người dùng chọn CMP-08   |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| **State**          | **Mô tả**                            | **Trigger**                                |
| ------------------ | ------------------------------------ | ------------------------------------------ |
| **Idle (Guest)**   | Trạng thái khách xem khóa học        | `Load screen` (không thông tin xác thực)   |
| **Idle (Student)** | Trạng thái học viên chưa đăng ký     | `Load screen` (có thông tin xác thực)      |
| **Enrolled**       | Trạng thái học viên đã đăng ký       | `INT-03` thành công hoặc đã có tiến độ     |
| **Restricted**     | Trạng thái dành cho Giảng viên/Admin | `Load screen` (vai trò không phải Student) |
| **Processing**     | Đang thực hiện đăng ký               | `INT-03`                                   |
| **System Error**   | Lỗi hệ thống/Không tìm thấy dữ liệu  | Phản hồi lỗi từ `INT-01` hoặc `INT-03`     |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

| **Field**   | **UI Label** | **API Field**  | **Rule**                               | **Editable** |
| ----------- | ------------ | -------------- | -------------------------------------- | ------------ |
| Thumbnail   | Ảnh bìa      | `thumbnailUrl` | Hiển thị hình ảnh từ hệ thống          | No           |
| Title       | Tên khóa học | `title`        | Hiển thị văn bản thuần                 | No           |
| Lecturer    | Giảng viên   | `lecturerName` | Hiển thị tên giảng viên                | No           |
| Description | Mô tả        | `description`  | Hiển thị nội dung chi tiết             | No           |
| Enrolled    | Trạng thái   | `isEnrolled`   | Quyết định hiển thị CMP-08 hoặc CMP-09 | No           |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| **BR / Error Code** | **Message (Business)**                   | **UI Behavior**                                |
| ------------------- | ---------------------------------------- | ---------------------------------------------- |
| `COURSE_NOT_FOUND`  | Khóa học không tồn tại hoặc đã bị tạm gỡ | Hiển thị thông báo và quay lại trang danh sách |
| `ALREADY_ENROLLED`  | Bạn đã tham gia khóa học này             | Tự động chuyển sang trạng thái Enrolled        |
| `COURSE_NOT_ACTIVE` | Khóa học hiện chưa cho phép đăng ký      | Vô hiệu hóa lệnh CMP-08                        |
---
# UI SPECIFICATION: SCR-AUTH-01 (JOIN GATEWAY)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### A. Thông tin chung

- **Screen ID**: `SCR-AUTH-01`

- **UC liên quan**: BUCD-00 (Xác định danh tính)

- **Actor**: Guest

- **API liên quan**: `POST /api/v1/auth/identify`


### B. Layout Structure

- **Header**: Thanh điều hướng tối giản (Logo hệ thống).

- **Body**:

    - Tiêu đề mời tham gia.

    - **Section Nghiệp vụ**: Form định danh tập trung (Chứa ô nhập Email và nút xác nhận).


### C. UI Components (Business-level)

| **Component ID** | **Type** | **Business Meaning**                 |
| ---------------- | -------- | ------------------------------------ |
| **CMP-01**       | Input    | Địa chỉ Email của người dùng         |
| **CMP-02**       | Button   | Lệnh xác nhận để tiếp tục hành trình |

### D. User Intent (UI → System)

| **Intent ID** | **Mô tả**                                            | **API**                      |
| ------------- | ---------------------------------------------------- | ---------------------------- |
| **INT-01**    | Người dùng gửi thông tin email để hệ thống nhận diện | `POST /api/v1/auth/identify` |

### E. System Feedback (System → UI)

| **Case**           | **UI Reaction**                                 |
| ------------------ | ----------------------------------------------- |
| Success (LOGIN)    | Chuyển hướng người dùng sang màn hình Đăng nhập |
| Success (REGISTER) | Chuyển hướng người dùng sang màn hình Đăng ký   |
| Business Reject    | Hiển thị thông báo lỗi định dạng email          |
| System Error       | Hiển thị thông báo lỗi hệ thống chung           |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| **State**          | **Mô tả**                                             | **Trigger**                      |
| ------------------ | ----------------------------------------------------- | -------------------------------- |
| **Idle**           | Trạng thái chờ người dùng nhập liệu                   | `Load screen`                    |
| **Submitting**     | Đang gửi thông tin định danh lên máy chủ              | `INT-01`                         |
| **Redirecting**    | Hệ thống đang chuyển hướng dựa trên kết quả định danh | Phản hồi API thành công          |
| **Business Error** | Email nhập vào không đúng định dạng quy định          | `BR-REG-01` (Rule 01)            |
| **System Error**   | Sự cố kết nối hoặc máy chủ bị quá tải                 | Phản hồi lỗi 5xx hoặc Rate Limit |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

**API Source**: `POST /api/v1/auth/identify`

| **Field**    | **UI Label** | **API Field** | **Rule**                                        | **Editable** |
| ------------ | ------------ | ------------- | ----------------------------------------------- | ------------ |
| Email        | Email        | `email`       | **Rule 01**: Kiểm tra định dạng email hợp lệ    | Yes          |
| Continue URL | (Dữ liệu ẩn) | `continueUrl` | **Rule 03**: Lưu giữ tham số điều hướng ban đầu | No           |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| **BR / Error Code**   | **Message (Business)**                                            | **UI Behavior**                               |
| --------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| `INVALID_FORMAT`      | Địa chỉ Email không đúng định dạng. Vui lòng kiểm tra lại.        | Hiển thị thông báo dưới trường Email (CMP-01) |
| `RATE_LIMIT_EXCEEDED` | Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau ít phút. | Hiển thị thông báo lỗi chung trên màn hình    |


---

# UI SPECIFICATION: SCR-AUTH-02 (LOGIN)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### A. Thông tin chung

* **Screen ID**: `SCR-AUTH-02`
* **UC liên quan**: BUCD-03 (Đăng nhập hệ thống)
* **Actor**: Guest
* **API liên quan**: `POST /api/v1/auth/login`

### B. Layout Structure

* **Header**: Logo hệ thống tối giản.
* **Body**:
* Tiêu đề xác thực.
* **Section Nghiệp vụ**: Form đăng nhập tập trung chứa thông tin định danh (đã khóa) và trường nhập mật khẩu.


* **Footer**: Liên kết hỗ trợ khôi phục mật khẩu.

### C. UI Components (Business-level)

| Component ID | Type    | Business Meaning                                 |
| ------------ | ------- | ------------------------------------------------ |
| **CMP-01**   | Display | Địa chỉ Email (đã được định danh tại bước trước) |
| **CMP-02**   | Input   | Mật khẩu tài khoản                               |
| **CMP-03**   | Button  | Lệnh xác nhận đăng nhập                          |
| **CMP-04**   | Link    | Lệnh yêu cầu khôi phục mật khẩu (Quên mật khẩu?) |

### D. User Intent (UI → System)

| Intent ID  | Mô tả                                              | API                             |
| ---------- | -------------------------------------------------- | ------------------------------- |
| **INT-01** | Người dùng gửi mật khẩu để xác thực quyền truy cập | `POST /api/v1/auth/login`       |
| **INT-02** | Người dùng yêu cầu thay đổi thông tin định danh    | Quay lại `SCR-JOIN-01` (Alt 1a) |
| **INT-03** | Người dùng yêu cầu khôi phục mật khẩu              | Chuyển tới `BUCD-04` (Alt 3a)   |

### E. System Feedback (System → UI)

| Case                | UI Reaction                                                      |
| ------------------- | ---------------------------------------------------------------- |
| **Success**         | Chuyển hướng theo `redirectUrl` hoặc về trang chủ/khóa học đích. |
| **Business Reject** | Hiển thị thông báo sai mật khẩu hoặc tài khoản bị khóa.          |
| **System Error**    | Hiển thị thông báo lỗi hệ thống chung.                           |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| State              | Mô tả                                            | Trigger                          |
| ------------------ | ------------------------------------------------ | -------------------------------- |
| **Idle**           | Chờ người dùng cung cấp mật khẩu                 | `Load screen`                    |
| **Submitting**     | Hệ thống đang kiểm tra thông tin xác thực        | `INT-01`                         |
| **Success**        | Xác thực thành công và thiết lập phiên đăng nhập | API trả về 200                   |
| **Business Error** | Thông tin xác thực không chính xác               | Phản hồi lỗi nghiệp vụ (401/403) |
| **System Error**   | Sự cố máy chủ hoặc giới hạn truy cập             | Phản hồi lỗi hệ thống (5xx/429)  |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

**API Source**: `POST /api/v1/auth/login`

| Field        | UI Label | API Field     | Rule                                | Editable |
| ------------ | -------- | ------------- | ----------------------------------- | -------- |
| Email        | Email    | `email`       | Kế thừa từ `SCR-JOIN-01`            | **No**   |
| Password     | Mật khẩu | `password`    | Tối thiểu 6 ký tự                   | **Yes**  |
| Continue URL | (Ẩn)     | `continueUrl` | Bảo toàn đích đến ban đầu [Rule 08] | **No**   |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| BR / Error Code       | Message (Business)                                           | UI Behavior                               |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| `AUTH_FAILED`         | Mật khẩu không chính xác. Vui lòng thử lại.                  | Hiển thị thông báo lỗi tại CMP-02         |
| `USER_INACTIVE`       | Tài khoản hiện đang bị khóa. Vui lòng liên hệ quản trị viên. | Hiển thị thông báo cảnh báo toàn màn hình |
| `RATE_LIMIT_EXCEEDED` | Quá nhiều lần thử sai. Vui lòng quay lại sau ít phút.        | Khóa tạm thời nút xác nhận (CMP-03)       |

---


---

# UI SPECIFICATION: SCR-AUTH-03 (REGISTER) - CẬP NHẬT

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### A. Thông tin chung

- **Screen ID**: `SCR-AUTH-03`

- **UC liên quan**: BUCD-02 (Đăng ký tài khoản)

- **Actor**: Guest

- **API liên quan**: `POST /api/v1/auth/register`


### B. Layout Structure

- **Header**: Logo hệ thống tối giản.

- **Body**:

    - Tiêu đề thông báo thiết lập hồ sơ.

    - **Section Hồ sơ**: Form nhập liệu tập trung các thông tin cá nhân cơ bản.

- **Footer**: Liên kết quay lại trang định danh.


### C. UI Components (Business-level)

| **Component ID** | **Type** | **Business Meaning** | **Logic hiển thị / Hành vi**                      |
| ---------------- | -------- | -------------------- | ------------------------------------------------- |
| **CMP-01**       | Display  | Địa chỉ Email        | Kế thừa từ bước định danh. Không cho phép sửa.    |
| **CMP-02**       | Input    | Họ và tên            | Nhập tên đầy đủ của người học.                    |
| **CMP-03**       | Input    | **Tuổi**             | **Nhập số tuổi thực tế của người học.**           |
| **CMP-04**       | Input    | Mật khẩu             | Thiết lập mật khẩu bảo mật (ẩn ký tự).            |
| **CMP-05**       | Button   | Lệnh đăng ký         | Gửi toàn bộ thông tin hồ sơ để yêu cầu kích hoạt. |

### D. User Intent (UI → System)

| **Intent ID** | **Mô tả**                                                             | **API**                      |
| ------------- | --------------------------------------------------------------------- | ---------------------------- |
| **INT-01**    | Người dùng gửi thông tin hồ sơ (Tên, Tuổi, Mật khẩu) để tạo tài khoản | `POST /api/v1/auth/register` |

### E. System Feedback (System → UI)

| **Case**            | **UI Reaction**                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Success**         | Hiển thị trạng thái gửi yêu cầu thành công và hướng dẫn kiểm tra email xác thực.                   |
| **Business Reject** | Hiển thị các thông báo lỗi dữ liệu (Sai định dạng email, sai quy tắc mật khẩu, tuổi không hợp lệ). |
| **System Error**    | Hiển thị thông báo sự cố kết nối hoặc lỗi máy chủ chung.                                           |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| **State**          | **Mô tả**                                                         | **Trigger**                      |
| ------------------ | ----------------------------------------------------------------- | -------------------------------- |
| **Idle**           | Trạng thái chờ người dùng nhập liệu hồ sơ                         | `Load screen`                    |
| **Submitting**     | Hệ thống đang ghi nhận thông tin và xử lý yêu cầu kích hoạt       | `INT-01`                         |
| **Request Sent**   | Hồ sơ được ghi nhận, chờ kích hoạt từ hòm thư                     | Phản hồi thành công từ API (201) |
| **Business Error** | Thông tin nhập vào vi phạm quy tắc định dạng hoặc logic [Rule 04] | Phản hồi lỗi từ nghiệp vụ (400)  |
| **System Error**   | Gặp sự cố kỹ thuật hoặc giới hạn yêu cầu                          | Phản hồi lỗi hệ thống (5xx/429)  |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

**API Source**: `POST /api/v1/auth/register`

| **Field**    | **UI Label** | **API Field** | **Rule**                                      | **Editable** |
| ------------ | ------------ | ------------- | --------------------------------------------- | ------------ |
| Email        | Email        | `email`       | Kế thừa từ BUCD-00                            | **No**       |
| Full Name    | Họ và tên    | `fullName`    | [Rule 04]: Kiểm tra định dạng văn bản         | **Yes**      |
| **Age**      | **Tuổi**     | `age`         | **[Rule 04]: Giá trị phải là số dương (> 0)** | **Yes**      |
| Password     | Mật khẩu     | `password`    | [Rule 04]: Độ dài tối thiểu 6 ký tự           | **Yes**      |
| Continue URL | (Dữ liệu ẩn) | `continueUrl` | [Rule 07]: Bảo lưu mục đích truy cập ban đầu  | **No**       |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| **BR / Error Code**   | **Message (Business)**                                    | **UI Behavior**                                   |
| --------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| **INVALID_AGE**       | **Tuổi phải là một số dương hợp lệ.**                     | Hiển thị thông báo lỗi dưới trường Tuổi (CMP-03). |
| `PASSWORD_TOO_SHORT`  | Mật khẩu phải chứa ít nhất 6 ký tự.                       | Hiển thị thông báo dưới trường Mật khẩu (CMP-04). |
| `USER_ALREADY_ACTIVE` | Địa chỉ email đã được đăng ký và kích hoạt.               | Hiển thị cảnh báo và gợi ý đăng nhập ngay.        |
| `VALIDATION_ERROR`    | Thông tin nhập vào chưa chính xác. Vui lòng kiểm tra lại. | Hiển thị tại các trường dữ liệu vi phạm.          |

---


---

# MÀN HÌNH 1: SCR-AUTH-04 (REQUEST PASSWORD RESET)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### A. Thông tin chung

* **Screen ID**: `SCR-AUTH-04`
* **UC liên quan**: BUCD-04 (Khôi phục mật khẩu)
* **Actor**: Guest
* **API liên quan**: `POST /api/v1/auth/forgot-password`

### B. Layout Structure

* **Header**: Logo hệ thống tối giản.
* **Body**:
* **Section Nhập liệu**: Vùng thu thập email để hệ thống kiểm tra ngầm.


* **Footer**: Lệnh quay lại cửa ngõ định danh (Join Gateway).

### C. UI Components (Business-level)

| Component ID | Type   | Business Meaning                    |
| ------------ | ------ | ----------------------------------- |
| **CMP-01**   | Input  | Địa chỉ Email định danh tài khoản   |
| **CMP-02**   | Button | Lệnh xác nhận gửi yêu cầu khôi phục |

### D. User Intent (UI → System)

| Intent ID  | Mô tả                                                              | API                                 |
| ---------- | ------------------------------------------------------------------ | ----------------------------------- |
| **INT-01** | Người dùng gửi thông tin email để nhận liên kết khôi phục mật khẩu | `POST /api/v1/auth/forgot-password` |

### E. System Feedback (System → UI)

| Case                | UI Reaction                                              |
| ------------------- | -------------------------------------------------------- |
| **Success**         | Hiển thị thông báo xác nhận trung tính (Neutral Success) |
| **Business Reject** | Hiển thị thông báo lỗi định dạng dữ liệu                 |
| **System Error**    | Hiển thị thông báo lỗi hệ thống chung                    |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| State               | Mô tả                                                                     | Trigger                   |
| ------------------- | ------------------------------------------------------------------------- | ------------------------- |
| **Idle**            | Chờ người dùng nhập Email                                                 | `Load screen`             |
| **Submitting**      | Đang gửi yêu cầu khôi phục                                                | `INT-01`                  |
| **Neutral Success** | Hiển thị thông báo xác nhận (bất kể email có tồn tại hay không - Rule 11) | API trả về 200            |
| **Business Error**  | Email không đúng định dạng                                                | Phản hồi lỗi 400          |
| **System Error**    | Lỗi server hoặc quá tải yêu cầu                                           | Phản hồi lỗi 5xx hoặc 429 |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

| Field | UI Label | API Field | Rule                 | Editable |
| ----- | -------- | --------- | -------------------- | -------- |
| Email | Email    | `email`   | Đúng định dạng email | Yes      |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| BR / Error Code       | Message (Business)                                                | UI Behavior                       |
| --------------------- | ----------------------------------------------------------------- | --------------------------------- |
| `INVALID_FORMAT`      | Định dạng Email không hợp lệ. Vui lòng kiểm tra lại.              | Hiển thị lỗi ngay tại CMP-01      |
| `RATE_LIMIT_EXCEEDED` | Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau ít phút. | Hiển thị thông báo cảnh báo chung |

---

# MÀN HÌNH 2: SCR-AUTH-05 (SET NEW PASSWORD)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### A. Thông tin chung

* **Screen ID**: `SCR-AUTH-05`
* **UC liên quan**: BUCD-04 (Khôi phục mật khẩu)
* **Actor**: Guest
* **API liên quan**: `POST /api/v1/auth/reset-password`

### B. Layout Structure

* **Header**: Logo hệ thống tối giản.
* **Body**:
* **Section Đổi mật khẩu**: Vùng thiết lập mật khẩu mới sau khi xác thực liên kết.


* **Footer**: Không có (Người dùng tập trung hoàn thành việc đổi mật khẩu).

### C. UI Components (Business-level)

| Component ID | Type   | Business Meaning                    |
| ------------ | ------ | ----------------------------------- |
| **CMP-01**   | Input  | Mật khẩu mới                        |
| **CMP-02**   | Button | Lệnh xác nhận cập nhật mật khẩu mới |

### D. User Intent (UI → System)

| Intent ID  | Mô tả                                                                   | API                                |
| ---------- | ----------------------------------------------------------------------- | ---------------------------------- |
| **INT-01** | Người dùng gửi mật khẩu mới kèm mã xác thực (token) để đặt lại mật khẩu | `POST /api/v1/auth/reset-password` |

### E. System Feedback (System → UI)

| Case                | UI Reaction                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Success**         | Điều hướng về cửa ngõ định danh (Join Gateway) và xóa bỏ ý định tham gia khóa học (Rule 13) |
| **Business Reject** | Hiển thị lỗi mật khẩu yếu hoặc liên kết hết hạn                                             |
| **System Error**    | Hiển thị thông báo lỗi hệ thống chung                                                       |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| State              | Mô tả                                    | Trigger                           |
| ------------------ | ---------------------------------------- | --------------------------------- |
| **Idle**           | Chờ người dùng nhập mật khẩu mới         | `Load screen` (Từ liên kết email) |
| **Submitting**     | Đang cập nhật mật khẩu mới               | `INT-01`                          |
| **Success**        | Cập nhật thành công                      | API trả về 200                    |
| **Business Error** | Mật khẩu không đủ mạnh hoặc liên kết lỗi | Phản hồi lỗi 400/410/422          |
| **System Error**   | Lỗi server                               | Phản hồi lỗi 5xx                  |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

| Field        | UI Label     | API Field  | Rule                                   | Editable |
| ------------ | ------------ | ---------- | -------------------------------------- | -------- |
| New Password | Mật khẩu mới | `password` | Tối thiểu 6 ký tự                      | Yes      |
| Reset Token  | (Dữ liệu ẩn) | `token`    | Lấy từ tham số trên URL liên kết email | No       |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| BR / Error Code     | Message (Business)                | UI Behavior                           |
| ------------------- | --------------------------------- | ------------------------------------- |
| `TOKEN_INVALID`     | Liên kết khôi phục không hợp lệ.  | Điều hướng người dùng về SCR-AUTH-04  |
| `TOKEN_EXPIRED`     | Liên kết khôi phục đã hết hạn.    | Hiển thị thông báo và nút yêu cầu lại |
| `PASSWORD_TOO_WEAK` | Mật khẩu phải có ít nhất 6 ký tự. | Hiển thị lỗi ngay tại CMP-01          |

---

Chào bạn, tôi là **Junior UI Designer (Presentation Contractor)**.

Dựa trên nghiệp vụ **BUCD-13a (Cập nhật hồ sơ)**, **BUCD-13b (Đổi mật khẩu chủ động)** và tài liệu **API docs.md**, tôi xin trình bày bộ Artifact chuẩn cho hai màn hình quản lý tài khoản người dùng.

---

# MÀN HÌNH 1: SCR-USR-01 (EDIT PROFILE)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### A. Thông tin chung

* **Screen ID**: `SCR-USR-01`
* **UC liên quan**: BUCD-13a (Cập nhật hồ sơ)
* **Actor**: Authenticated User
* **API liên quan**: `PUT /api/v1/auth/profile`

### B. Layout Structure

* **Header**: Giữ nguyên Header hệ thống (Logo, Avatar).
* **Body**:
* Tiêu đề trang: "Cập nhật hồ sơ".
* **Section Form**: Khu vực nhập liệu thông tin cá nhân.
* **Section Actions**: Các nút lệnh Lưu và Hủy.



### C. UI Components (Business-level)

| Component ID | Type    | Business Meaning  | Logic hiển thị / Hành vi                           |
| ------------ | ------- | ----------------- | -------------------------------------------------- |
| **CMP-01**   | Display | Email tài khoản   | **[Rule 15]**: Không cho phép sửa đổi.             |
| **CMP-02**   | Input   | Họ và tên         | Nhận dữ liệu văn bản để cập nhật danh tính.        |
| **CMP-03**   | Input   | Tuổi              | Nhận dữ liệu số dương.                             |
| **CMP-04**   | Button  | Lệnh lưu thay đổi | Gửi yêu cầu cập nhật hồ sơ.                        |
| **CMP-05**   | Button  | Lệnh hủy bỏ       | **Alt 13a.1**: Quay lại trang trước đó, không lưu. |

### D. User Intent (UI → System)

| Intent ID  | Mô tả                                           | API                        |
| ---------- | ----------------------------------------------- | -------------------------- |
| **INT-01** | Người dùng yêu cầu cập nhật thông tin hồ sơ mới | `PUT /api/v1/auth/profile` |

### E. System Feedback (System → UI)

| Case                | UI Reaction                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| **Success**         | Hiển thị thông báo thành công và cập nhật Avatar trên Header [Rule 14]. |
| **Business Reject** | Hiển thị thông báo lỗi dữ liệu (ví dụ: tuổi không hợp lệ).              |
| **System Error**    | Hiển thị thông báo lỗi hệ thống chung.                                  |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| State              | Mô tả                                    | Trigger          |
| ------------------ | ---------------------------------------- | ---------------- |
| **Idle**           | Chờ người dùng chỉnh sửa thông tin       | `Load screen`    |
| **Submitting**     | Đang gửi yêu cầu cập nhật dữ liệu        | `INT-01`         |
| **Success**        | Cập nhật thành công                      | API trả về 200   |
| **Business Error** | Dữ liệu không thỏa mãn quy tắc nghiệp vụ | Phản hồi lỗi 400 |
| **System Error**   | Lỗi kết nối hoặc lỗi máy chủ             | Phản hồi lỗi 5xx |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

**API Source**: `PUT /api/v1/auth/profile`

| Field     | UI Label  | API Field  | Rule                     | Editable |
| --------- | --------- | ---------- | ------------------------ | -------- |
| Email     | Email     | -          | **[Rule 15]**: Read-only | No       |
| Full Name | Họ và tên | `fullName` | Không để trống           | Yes      |
| Age       | Tuổi      | `age`      | Phải là số dương (> 0)   | Yes      |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| BR / Error Code    | Message (Business)               | UI Behavior                             |
| ------------------ | -------------------------------- | --------------------------------------- |
| `VALIDATION_ERROR` | Thông tin nhập vào không hợp lệ. | Hiển thị thông báo tại trường lỗi.      |
| `INVALID_AGE`      | Tuổi phải là một số dương.       | Hiển thị lỗi dưới trường Tuổi (CMP-03). |

---

# MÀN HÌNH 2: SCR-USR-02 (CHANGE PASSWORD)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### A. Thông tin chung

* **Screen ID**: `SCR-USR-02`
* **UC liên quan**: BUCD-13b (Đổi mật khẩu chủ động)
* **Actor**: Authenticated User
* **API liên quan**: `PUT /api/v1/auth/change-password`

### B. Layout Structure

* **Header**: Giữ nguyên Header hệ thống.
* **Body**:
* Tiêu đề trang: "Đổi mật khẩu".
* **Section Form**: Các trường nhập mật khẩu cũ và mới.
* **Section Actions**: Nút xác nhận thay đổi.



### C. UI Components (Business-level)

| Component ID | Type   | Business Meaning           |
| ------------ | ------ | -------------------------- |
| **CMP-01**   | Input  | Mật khẩu hiện tại          |
| **CMP-02**   | Input  | Mật khẩu mới               |
| **CMP-03**   | Input  | Xác nhận mật khẩu mới      |
| **CMP-04**   | Button | Lệnh xác nhận đổi mật khẩu |

### D. User Intent (UI → System)

| Intent ID  | Mô tả                                                  | API                                |
| ---------- | ------------------------------------------------------ | ---------------------------------- |
| **INT-01** | Người dùng gửi yêu cầu thiết lập mật khẩu xác thực mới | `PUT /api/v1/auth/change-password` |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| State              | Mô tả                                          | Trigger          |
| ------------------ | ---------------------------------------------- | ---------------- |
| **Idle**           | Chờ nhập thông tin mật khẩu                    | `Load screen`    |
| **Submitting**     | Đang kiểm tra và cập nhật mật khẩu             | `INT-01`         |
| **Success**        | Thay đổi mật khẩu thành công                   | API trả về 200   |
| **Business Error** | Sai mật khẩu cũ hoặc mật khẩu mới không hợp lệ | Phản hồi lỗi 400 |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

**API Source**: `PUT /api/v1/auth/change-password`

| Field            | UI Label              | API Field         | Rule                       | Editable |
| ---------------- | --------------------- | ----------------- | -------------------------- | -------- |
| Current Password | Mật khẩu hiện tại     | `currentPassword` | Phải khớp với mật khẩu cũ  | Yes      |
| New Password     | Mật khẩu mới          | `newPassword`     | Tối thiểu 6 ký tự          | Yes      |
| Confirm Password | Xác nhận mật khẩu mới | `confirmPassword` | Phải khớp với mật khẩu mới | Yes      |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| BR / Error Code                  | Message (Business)                      | UI Behavior                     |
| -------------------------------- | --------------------------------------- | ------------------------------- |
| `CURRENT_PASSWORD_INVALID`       | Mật khẩu hiện tại không chính xác.      | Hiển thị lỗi tại trường CMP-01. |
| `PASSWORD_CONFIRMATION_MISMATCH` | Xác nhận mật khẩu mới không trùng khớp. | Hiển thị lỗi tại trường CMP-03. |
| `PASSWORD_TOO_WEAK`              | Mật khẩu mới phải có ít nhất 6 ký tự.   | Hiển thị lỗi tại trường CMP-02. |

---

### Ghi chú bổ sung cho Frontend:

1. **Avatar [Rule 14]**: Sau khi `INT-01` tại màn hình `SCR-USR-01` thành công, FE thực hiện lấy chữ cái đầu của `fullName` để hiển thị Avatar mới trên toàn hệ thống.
2. **Xóa mục đích (Redirect)**: Cả hai màn hình này không mang theo tham số `continueUrl`, sau khi hoàn tất có thể điều hướng về trang chủ hoặc giữ nguyên tại trang Profile.


# UI SPECIFICATION: SCR-STU-01 (MY LEARNING)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### 1. Thông tin chung

- **Screen ID**: `SCR-STU-01`

- **UC liên quan**: UC-01 (List Enrolled Courses)

- **Actor**: Student

- **API liên quan**: `GET /api/v1/courses/enrolled`


### 2. Layout Structure

- **Header**: Thanh điều hướng chính của hệ thống.

- **Section 01 (Bộ lọc)**: Tab phân loại khóa học theo tiến độ (Đang học/Hoàn thành).

- **Section 02 (Danh sách)**: Lưới/Danh sách các thẻ khóa học cá nhân.


### 3. UI Components (Business-level)

| **Component ID** | **Type**  | **Business Meaning** | **Logic hiển thị**                                             |
| ---------------- | --------- | -------------------- | -------------------------------------------------------------- |
| **CMP-01**       | Tab       | Bộ lọc tiến độ       | Chuyển đổi giữa trạng thái `in_progress` và `completed`.       |
| **CMP-02**       | Container | Thẻ khóa học         | Hiển thị thông tin tổng quát của một khóa học đã đăng ký.      |
| **CMP-03**       | Progress  | Thanh tiến độ        | Biểu diễn phần trăm hoàn thành dựa trên dữ liệu hệ thống.      |
| **CMP-04**       | Label     | Tên khóa học         | Hiển thị tiêu đề chính của khóa học.                           |
| **CMP-05**       | Image     | Ảnh minh họa         | Thumbnail khóa học (Lấy từ bài học đầu tiên hoặc placeholder). |

### 4. User Intent (UI → System)

| **Intent ID** | **Mô tả**                                    | **API / Action**                   |
| ------------- | -------------------------------------------- | ---------------------------------- |
| **INT-01**    | Người dùng yêu cầu tải danh sách khóa học    | `GET /api/v1/courses/enrolled`     |
| **INT-02**    | Người dùng lọc danh sách theo tiến độ        | `GET .../enrolled?filter=<status>` |
| **INT-03**    | Người dùng chọn một khóa học để tiếp tục học | Điều hướng sang **SCR-LRN-01**     |

### 5. System Feedback (System → UI)

| **Case**         | **UI Reaction**                                                    |
| ---------------- | ------------------------------------------------------------------ |
| **Success**      | Hiển thị danh sách thẻ khóa học tương ứng với bộ lọc.              |
| **Empty Data**   | Hiển thị thông báo "Bạn chưa tham gia khóa học nào trong mục này". |
| **System Error** | Hiển thị thông báo lỗi hệ thống và nút tải lại.                    |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| **State**      | **Mô tả**                         | **Trigger**                  | **Behavior**                              |
| -------------- | --------------------------------- | ---------------------------- | ----------------------------------------- |
| **Idle**       | Đang hiển thị danh sách khóa học  | Tải màn hình thành công      | Hiển thị các CMP từ danh sách API.        |
| **Loading**    | Đang truy xuất dữ liệu từ máy chủ | Thực hiện INT-01 hoặc INT-02 | Hiển thị hiệu ứng tải dữ liệu (Skeleton). |
| **No Results** | Không có khóa học thỏa mãn bộ lọc | API trả về mảng rỗng `[]`    | Hiển thị nội dung thông báo trống.        |
| **Error**      | Gặp sự cố kết nối hoặc quyền hạn  | API trả về mã lỗi 4xx/5xx    | Hiển thị bảng thông báo lỗi nghiệp vụ.    |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

**API Source**: `GET /api/v1/courses/enrolled`

| **Field**       | **UI Label**  | **API Field**    | **Rule**                                   | **Editable** |
| --------------- | ------------- | ---------------- | ------------------------------------------ | ------------ |
| Course Title    | Tên khóa học  | `title`          | Hiển thị văn bản thuần                     | No           |
| Progress Rate   | Tiến độ học   | `completionRate` | Hiển thị dạng % trên CMP-03                | No           |
| Status          | Trạng thái    | `status`         | Map giá trị `in_progress` hoặc `completed` | No           |
| Enrollment Date | Ngày tham gia | `enrolledAt`     | Định dạng: dd/mm/yyyy                      | No           |
| ID              | (Ẩn)          | `id`             | Dùng để định danh khi chuyển hướng học     | No           |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| **BR / Error Code** | **Message (Business)**                              | **UI Behavior**                                  |
| ------------------- | --------------------------------------------------- | ------------------------------------------------ |
| `UNAUTHORIZED`      | Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại. | Điều hướng người dùng về màn hình Identify User. |
| `ROLE_DENIED`       | Tài khoản của bạn không có quyền học viên.          | Hiển thị thông báo từ chối truy cập.             |
| `SERVER_ERROR`      | Hệ thống không thể tải danh sách khóa học lúc này.  | Hiển thị thông báo lỗi chung và nút "Thử lại".   |



# UI SPECIFICATION: SCR-LRN-01 (LEARNING INTERFACE)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### 1. Thông tin chung

- **Screen ID**: `SCR-LRN-01`

- **UC liên quan**: UC-06 (Học video), UC-07 (Ghi chú), UC-08 (Làm Quiz)

- **Actor**: Student

- **API liên quan**:

    - `GET /api/v1/lessons/[id]/progress`: Lấy trạng thái bài học.

    - `PUT /api/v1/lessons/[id]/progress`: Cập nhật tiến độ video.

    - `POST /api/v1/lessons/[id]/quiz/start`: Khởi tạo phiên làm bài.

    - `GET /api/v1/lessons/[id]/quiz/questions`: Lấy danh sách câu hỏi.

    - `POST /api/v1/lessons/[id]/quiz/submit`: Nộp bài chấm điểm.

    - `PUT /api/v1/lessons/[id]/notes`: Lưu ghi chú.


### 2. Layout Structure

- **Header**: Hiển thị tên khóa học và tổng tiến độ (Progress Bar).

- **Body**:

    - **Vùng chính (Trái)**: Chứa Player (Video) hoặc Quiz Area (Câu hỏi & Kết quả).

    - **Vùng phụ (Dưới)**: Vùng nhập liệu ghi chú.

- **Sidebar (Phải)**: Danh mục bài học, đánh dấu bài nào đã hoàn thành.


### 3. UI Components (Business-level)

| **Component ID** | **Type** | **Business Meaning**                                |
| ---------------- | -------- | --------------------------------------------------- |
| **CMP-01**       | Embed    | Trình phát bài giảng (Video Player)                 |
| **CMP-02**       | Button   | Lệnh bắt đầu lượt đánh giá (Start Quiz)             |
| **CMP-03**       | List     | Danh sách câu hỏi và các phương án trả lời duy nhất |
| **CMP-04**       | Display  | Đồng hồ hiển thị thời gian làm bài còn lại          |
| **CMP-05**       | Button   | Lệnh nộp bài để chấm điểm (Submit)                  |
| **CMP-06**       | Display  | Khu vực hiển thị điểm số và đối chiếu đáp án        |
| **CMP-07**       | Input    | Vùng soạn thảo ghi chú bài học                      |
| **CMP-08**       | Button   | Lệnh xác nhận lưu trữ ghi chú                       |

### 4. User Intent (UI → System)

| **Intent ID** | **Mô tả**                                    | **API**                                 |
| ------------- | -------------------------------------------- | --------------------------------------- |
| **INT-01**    | Tự động cập nhật vị trí xem video và tiến độ | `PUT /api/v1/lessons/[id]/progress`     |
| **INT-02**    | Yêu cầu bắt đầu lượt làm bài mới             | `POST /api/v1/lessons/[id]/quiz/start`  |
| **INT-03**    | Yêu cầu nộp đáp án để chấm điểm              | `POST /api/v1/lessons/[id]/quiz/submit` |
| **INT-04**    | Yêu cầu lưu trữ nội dung ghi chú             | `PUT /api/v1/lessons/[id]/notes`        |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| **State**       | **Mô tả**             | **Trigger**           | **Behavior**                         |
| --------------- | --------------------- | --------------------- | ------------------------------------ |
| **Idle**        | Xem video bài giảng   | Lesson Type = VIDEO   | CMP-01 phát từ `lastPosition`.       |
| **Quiz Ready**  | Sẵn sàng làm bài      | Lesson Type = QUIZ    | Hiển thị CMP-02 (Bắt đầu).           |
| **Quiz Doing**  | Đang làm bài tính giờ | Sau INT-02 thành công | Hiện CMP-03, CMP-04 bắt đầu đếm lùi. |
| **Quiz Result** | Đã có kết quả         | Sau INT-03 thành công | Hiện CMP-06, khóa toàn bộ CMP-03.    |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)


### 1. Luồng Video (INT-01)

| Field    | UI Label        | API Field         | Rule                        | Editable |
| -------- | --------------- | ----------------- | --------------------------- | -------- |
| Position | Vị trí hiện tại | `currentPosition` | Lấy từ trình phát theo giây | No       |

### 2. Luồng Quiz (INT-02 & INT-03)

| Field      | UI Label          | API Field                | Rule                                 | Editable |
| ---------- | ----------------- | ------------------------ | ------------------------------------ | -------- |
| Timer      | Thời gian còn lại | `expiresAt`              | Tính toán: `expiresAt - CurrentTime` | No       |
| Question   | Nội dung câu hỏi  | `questions[].text`       | Hiển thị văn bản thuần               | No       |
| Option     | Phương án chọn    | `questions[].selectedId` | Chỉ chọn 1 (Single choice)           | **Yes**  |
| Score      | Điểm số           | `score`                  | Hiển thị sau khi có kết quả          | No       |
| Correction | Đáp án đúng       | `questions[].correctId`  | Hiển thị để đối chiếu                | No       |


### 3. Luồng Ghi chú (INT-04)

| Field | UI Label         | API Field | Rule                 | Editable |
| ----- | ---------------- | --------- | -------------------- | -------- |
| Note  | Nội dung ghi chú | `content` | Plain text (Rule 23) | **Yes**  |


---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| **Context** | **Error Code**      | **Message (Business)**                                        | **UI Behavior**                    |
| ----------- | ------------------- | ------------------------------------------------------------- | ---------------------------------- |
| **Quiz**    | `QUIZ_TIME_EXPIRED` | Thời gian làm bài đã kết thúc. Hệ thống đang tự động nộp bài. | Thực hiện nộp dữ liệu hiện có.     |
| **Video**   | `VIDEO_NOT_FOUND`   | Nội dung bài giảng hiện không khả dụng.                       | Hiển thị màn hình báo lỗi bài học. |
| **Note**    | `SAVE_FAILED`       | Không thể lưu ghi chú. Vui lòng kiểm tra kết nối.             | Hiển thị thông báo cạnh nút Lưu.   |



# SCR-LEC-01 – MY COURSE

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### A. Thông tin chung

- **Screen ID**: SCR-LEC-01

- **UC liên quan**: UC-09 (Lecturer Course Management)

- **Actor**: Lecturer

- **API liên quan**: `GET /api/v1/management/courses`


---

### B. Layout Structure

- **Header**: Thanh điều hướng và thông tin người dùng.

- **Body**:

    - **Section 01**: Bộ lọc trạng thái khóa học (Draft, Pending, Active).

    - **Section 02**: Danh sách các thẻ khóa học hiện có.


---

### C. UI Components (Business-level)

| **Component ID** | **Type**  | **Business Meaning**                                 |
| ---------------- | --------- | ---------------------------------------------------- |
| CMP-01           | Tab       | Phân loại trạng thái khóa học                        |
| CMP-02           | Container | Thẻ thông tin khóa học                               |
| CMP-03           | Image     | Ảnh minh họa khóa học (Thumbnail)                    |
| CMP-04           | Label     | Tên khóa học                                         |
| CMP-05           | Badge     | Trạng thái hiển thị (Draft/Pending/Active)           |
| CMP-06           | Alert Box | Nội dung lý do từ chối (Chỉ hiện ở trạng thái Draft) |

---

### D. User Intent (UI → System)

| **Intent ID** | **Mô tả**                                              | **API**                                         |
| ------------- | ------------------------------------------------------ | ----------------------------------------------- |
| INT-01        | Người dùng yêu cầu xem danh sách khóa học              | `GET /api/v1/management/courses`                |
| INT-02        | Người dùng chọn xem khóa học trạng thái Draft          | Chuyển sang màn hình **SCR-LEC-02**             |
| INT-03        | Người dùng chọn xem khóa học trạng thái Pending/Active | Chuyển sang màn hình **SCR-COM-01** (Read-only) |

---

### E. System Feedback (System → UI)

| **Case**        | **UI Reaction**                                                      |
| --------------- | -------------------------------------------------------------------- |
| Success         | Hiển thị danh sách khóa học theo các thành phần từ CMP-02 đến CMP-06 |
| Business Reject | Hiển thị thông báo lỗi nghiệp vụ cụ thể                              |
| System Error    | Hiển thị thông báo chung về lỗi kết nối hệ thống                     |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| **State**        | **Mô tả**                                      | **Trigger**              |
| ---------------- | ---------------------------------------------- | ------------------------ |
| **Idle**         | Trạng thái chờ sau khi tải màn hình thành công | Load screen xong         |
| **Loading**      | Đang tải dữ liệu danh sách                     | INT-01                   |
| **Empty**        | Hệ thống phản hồi không có dữ liệu khóa học    | API 200 trả về mảng rỗng |
| **Populated**    | Hiển thị danh sách đầy đủ                      | API 200 trả về danh sách |
| **System Error** | Lỗi hệ thống khi gọi danh sách                 | API trả về mã 5xx        |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

| **Field**    | **UI Label**  | **API Field**  | **Rule**                                   | **Editable** |
| ------------ | ------------- | -------------- | ------------------------------------------ | ------------ |
| Course ID    | (Ẩn)          | `id`           | -                                          | No           |
| Thumbnail    | Ảnh minh họa  | `thumbnailUrl` | Hiển thị placeholder nếu trống             | No           |
| Course Title | Tên khóa học  | `title`        | -                                          | No           |
| Status       | Trạng thái    | `status`       | Ánh xạ nhãn Draft/Pending/Active           | No           |
| Reject Note  | Lý do từ chối | `rejectNote`   | Chỉ hiện khi status là Draft và có dữ liệu | No           |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| **BR / Error Code** | **Message (Business)**                             | **UI Behavior**                           |
| ------------------- | -------------------------------------------------- | ----------------------------------------- |
| ACCESS_DENIED       | Bạn không có quyền giảng viên để xem danh sách này | Chặn hiển thị và thông báo lỗi            |
| UNAUTHORIZED        | Phiên đăng nhập đã hết hạn                         | Yêu cầu đăng nhập lại                     |
| COURSE_NOT_FOUND    | Không tìm thấy thông tin khóa học                  | Hiển thị thông báo không tìm thấy dữ liệu |

---


# UI SPECIFICATION: SCR-COM-01 (PREVIEW ONLY)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### 1. Thông tin chung

- **Screen ID**: `SCR-COM-01`

- **UC liên quan**: UC-Preview (Xem trước nội dung)

- **Actor**: Lecturer, Admin

- **API liên quan**:

    - `GET /api/v1/courses/[id]` (Lấy cấu trúc cây thư mục)

    - `GET /api/v1/management/courses/[id]/preview/lessons/[lessonId]` (Lấy nội dung chi tiết bài học)


---

### 2. Layout Structure

- **Header**:

    - Nút Quay lại (Back).

    - Tiêu đề khóa học.

- **Body**:

    - **Section Sidebar (Trái)**: Cây thư mục chương/bài học.

    - **Section Content (Phải)**: Vùng hiển thị nội dung (Video/Quiz).


---

### 3. UI Components (Business-level)

| **Component ID** | **Type** | **Business Meaning**                                       |
| ---------------- | -------- | ---------------------------------------------------------- |
| **CMP-01**       | List     | Danh sách chương và bài học (Cấu trúc khóa học)            |
| **CMP-02**       | Display  | Trình phát video (Chế độ xem trước)                        |
| **CMP-03**       | List     | Danh sách câu hỏi kiểm tra (Chế độ tĩnh, hiện đáp án đúng) |
| **CMP-04**       | Text     | Nội dung văn bản chi tiết của bài học                      |

---

### 4. User Intent (UI → System)

| **Intent ID** | **Mô tả**                                   | **API**                              |
| ------------- | ------------------------------------------- | ------------------------------------ |
| **INT-01**    | Người dùng yêu cầu tải cấu trúc khóa học    | `GET /api/v1/courses/[id]`           |
| **INT-02**    | Người dùng chọn một bài học để xem chi tiết | `GET .../preview/lessons/[lessonId]` |

---

### 5. System Feedback (System → UI)

| **Case**                   | **UI Reaction**                           |
| -------------------------- | ----------------------------------------- |
| **Load Structure Success** | Hiển thị danh sách tại CMP-01             |
| **Select Lesson (Video)**  | Hiển thị CMP-02 (Video Player), ẩn CMP-03 |
| **Select Lesson (Quiz)**   | Hiển thị CMP-03 (Quiz List), ẩn CMP-02    |
| **Select Lesson (Text)**   | Hiển thị CMP-04 (Content Body)            |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| **State**           | **Mô tả**                                | **Trigger**              |
| ------------------- | ---------------------------------------- | ------------------------ |
| **Idle**            | Trạng thái mặc định khi vừa vào màn hình | Load screen xong         |
| **Loading Content** | Đang tải dữ liệu bài học chi tiết        | INT-02                   |
| **Viewing Video**   | Đang hiển thị nội dung Video             | API trả về `type: VIDEO` |
| **Viewing Quiz**    | Đang hiển thị nội dung Quiz              | API trả về `type: QUIZ`  |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

### 1. Object: Course Structure (Sidebar)

_Nguồn: `GET /api/v1/courses/[id]`_

| **Field**    | **UI Label**     | **API Field** | **Rule**                 | **Editable** |
| ------------ | ---------------- | ------------- | ------------------------ | ------------ |
| Course Title | Tên khóa học     | `title`       | Hiển thị trên Header     | No           |
| Chapters     | Danh sách chương | `chapters`    | Hiển thị dạng cây        | No           |
| Lesson ID    | (Ẩn)             | `id`          | Tham số gọi API chi tiết | No           |

### 2. Object: Lesson Detail (Content Area)

_Nguồn: `GET /api/v1/management/courses/[id]/preview/lessons/[lessonId]`_

| **Field**      | **UI Label**      | **API Field**   | **Rule**                      | **Editable** |
| -------------- | ----------------- | --------------- | ----------------------------- | ------------ |
| Lesson Title   | Tiêu đề bài học   | `title`         | -                             | No           |
| Content Type   | (Logic hiển thị)  | `type`          | Phân loại VIDEO / QUIZ / TEXT | No           |
| Video Source   | (Nguồn Video)     | `videoUrl`      | Hiện khi Type = VIDEO         | No           |
| Quiz Questions | Danh sách câu hỏi | `quizQuestions` | Hiện khi Type = QUIZ          | No           |
| Body Content   | Nội dung chi tiết | `content`       | Render HTML/Text              | No           |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| **BR / Error Code** | **Message (Business)**              | **UI Behavior**                        |
| ------------------- | ----------------------------------- | -------------------------------------- |
| `ACCESS_DENIED`     | Bạn không có quyền xem nội dung này | Quay lại màn hình trước                |
| `LESSON_NOT_FOUND`  | Bài học không tồn tại               | Hiển thị thông báo trống (Empty State) |
| `SERVER_ERROR`      | Lỗi tải nội dung                    | Hiển thị nút "Thử lại"                 |

---

Bản sửa đổi này đã loại bỏ hoàn toàn các nút Approve/Reject, đảm bảo đúng tính chất **Read-only** của màn hình xem trước.

# UI SPECIFICATION PACK: SCR-LEC-02 (FINAL STANDARD)

## I. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### 1. Thông tin chung

- **Screen ID:** `SCR-LEC-02`

- **UC liên quan:** BUCD-09a, BUCD-09b, BUCD-09c, BUCD-10

- **Actor:** Lecturer

- **API liên quan:** Course Management APIs, Quiz Management APIs


### 2. Layout Structure

- **Header:** Khu vực hành động chính (Lưu, Gửi duyệt) và trạng thái hiển thị.

- **Body:**

    - **Section Cấu trúc (Trái):** Danh sách phân cấp Chương/Bài học.

    - **Section Biên tập (Phải):** Khu vực nhập liệu chi tiết cho từng loại bài học.


### 3. UI Components (Business-level)

_Tuân thủ Mục VI.2.C - Không mô tả màu sắc, px._

| **Component ID** | **Type** | **Business Meaning**                                  |
| ---------------- | -------- | ----------------------------------------------------- |
| **CMP-01**       | Button   | Yêu cầu lưu các thay đổi cục bộ xuống hệ thống (Save) |
| **CMP-02**       | Button   | Yêu cầu gửi khóa học đi phê duyệt (Post)              |
| **CMP-03**       | Tree     | Danh sách cấu trúc khóa học (Chương/Bài học)          |
| **CMP-04**       | Input    | Tiêu đề của Chương hoặc Bài học                       |
| **CMP-05**       | Input    | Đường dẫn nguồn video bài giảng                       |
| **CMP-06**       | Embed    | Khung hiển thị trước nội dung video                   |
| **CMP-07**       | Input    | Khu vực chọn tệp dữ liệu câu hỏi (Excel)              |
| **CMP-08**       | Button   | Yêu cầu xem trước danh sách câu hỏi (Parse)           |
| **CMP-09**       | Table    | Bảng hiển thị danh sách câu hỏi đã trích xuất         |

### 4. User Intent (UI → System)

_Tuân thủ Mục VI.2.D - Định dạng: ID | Mô tả | API._

| **Intent ID** | **Mô tả**                               | **API**                                            |
| ------------- | --------------------------------------- | -------------------------------------------------- |
| **INT-01**    | Tạo chương mới                          | `POST /api/v1/management/courses/[id]/sections`    |
| **INT-02**    | Cập nhật thông tin chương               | `PUT /api/v1/management/sections/[id]`             |
| **INT-03**    | Xóa chương và nội dung bên trong        | `DELETE /api/v1/management/sections/[id]`          |
| **INT-04**    | Tạo bài học mới                         | `POST /api/v1/management/sections/[id]/lessons`    |
| **INT-05**    | Cập nhật nội dung bài học               | `PUT /api/v1/management/lessons/[id]`              |
| **INT-06**    | Xóa bài học                             | `DELETE /api/v1/management/lessons/[id]`           |
| **INT-07**    | Trích xuất dữ liệu câu hỏi để xem trước | `POST /api/v1/management/quiz/parse`               |
| **INT-08**    | Tải lên dữ liệu câu hỏi chính thức      | `POST /api/v1/management/lessons/[id]/quiz/upload` |
| **INT-09**    | Gửi yêu cầu phê duyệt khóa học          | `POST /api/v1/management/courses/[id]/publish`     |

### 5. System Feedback (System → UI)

_Tuân thủ Mục VI.2.E._

| **Case**               | **UI Reaction**                                          |
| ---------------------- | -------------------------------------------------------- |
| **Delete Warning**     | Hiển thị cảnh báo xác nhận xóa dữ liệu vĩnh viễn         |
| **Quiz Parse Success** | Hiển thị bảng danh sách câu hỏi tại CMP-09               |
| **Post Blocked**       | Hiển thị danh sách các mục nội dung còn thiếu            |
| **Post Success**       | Chuyển trạng thái sang Chờ duyệt và khóa quyền chỉnh sửa |

---

## II. ARTIFACT 4 – UI STATE MATRIX

_Tuân thủ Mục VII - Không tự nghĩ State._

| **State**         | **Mô tả**                                         | **Trigger**                           |
| ----------------- | ------------------------------------------------- | ------------------------------------- |
| **Idle**          | Trạng thái mặc định, hiển thị cấu trúc            | Load screen                           |
| **Editing Video** | Đang nhập liệu cho bài học Video                  | Người dùng chọn bài học Video         |
| **Editing Quiz**  | Đang nhập liệu cho bài học Quiz                   | Người dùng chọn bài học Quiz          |
| **Processing**    | Hệ thống đang xử lý tệp tin (Parse/Upload)        | INT-07, INT-08                        |
| **Reviewing**     | Hiển thị kết quả trích xuất câu hỏi               | API Parse trả về thành công           |
| **Read-only**     | Chế độ chỉ xem (Khóa học đang chờ duyệt/đã duyệt) | Trạng thái khóa học là Pending/Active |

---

## III. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

_Tuân thủ Mục VIII.2 - 5 cột bắt buộc, không dùng từ kỹ thuật (Int, String)._

### 1. Object: Lesson Information (Video)

| **Field** | **UI Label**     | **API Field** | **Rule**                   | **Editable** |
| --------- | ---------------- | ------------- | -------------------------- | ------------ |
| Title     | Tên bài học      | `title`       | Bắt buộc nhập              | Yes          |
| Content   | Mô tả nội dung   | `content`     | Thông tin bổ sung          | Yes          |
| Source    | Liên kết YouTube | `videoUrl`    | Định dạng tên miền YouTube | Yes          |
| Sequence  | Thứ tự hiển thị  | `orderIndex`  | Số tự nhiên                | Yes          |

### 2. Object: Quiz Preview Data

_Nguồn dữ liệu hiển thị sau khi Parse thành công._

| **Field**  | **UI Label**      | **API Field** | **Rule**               | **Editable** |
| ---------- | ----------------- | ------------- | ---------------------- | ------------ |
| List       | Danh sách câu hỏi | `questions`   | Hiển thị dạng bảng     | No           |
| Question   | Nội dung câu hỏi  | `question`    | Bắt buộc có dữ liệu    | No           |
| Options    | Các phương án     | `options`     | Danh sách các lựa chọn | No           |
| Identifier | (Ẩn)              | `id`          | Mã định danh hệ thống  | No           |

### 3. Object: Quiz Upload Action

_Dữ liệu gửi đi khi người dùng Upload._

| **Field** | **UI Label**     | **API Field** | **Rule**                | **Editable** |
| --------- | ---------------- | ------------- | ----------------------- | ------------ |
| File      | Chọn tệp dữ liệu | (FormData)    | Định dạng Excel (.xlsx) | Yes          |

### 4. Object: Publishing Validation

| **Field** | **UI Label**  | **API Field** | **Rule**             | **Editable** |
| --------- | ------------- | ------------- | -------------------- | ------------ |
| Errors    | Danh sách lỗi | `message`     | Phản hồi từ hệ thống | No           |

---

## IV. ARTIFACT 6 – ERROR & MESSAGE MAPPING

_Tuân thủ Mục IX - Mapping mã lỗi sang ngôn ngữ người dùng._

| **BR / Error Code**   | **Message (Business)**                                  | **UI Behavior**                                 |
| --------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| `INVALID_FILE_FORMAT` | Định dạng tệp không hợp lệ. Vui lòng sử dụng tệp Excel. | Xóa tệp đã chọn khỏi vùng nhập liệu             |
| `FILE_TOO_LARGE`      | Dung lượng tệp vượt quá giới hạn cho phép.              | Hiển thị cảnh báo tại vùng nhập liệu            |
| `INCOMPLETE_CONTENT`  | Khóa học chưa đủ điều kiện gửi duyệt.                   | Hiển thị danh sách chi tiết các mục cần bổ sung |
| `ACCESS_DENIED`       | Bạn không có quyền chỉnh sửa nội dung này.              | Điều hướng người dùng về trang danh sách        |
| `SECTION_NOT_FOUND`   | Dữ liệu chương không tồn tại hoặc đã bị xóa.            | Tự động tải lại cấu trúc khóa học               |


# UI SPECIFICATION: SCR-ADM-01 (PENDING QUEUE)

## VI. ARTIFACT 3 – UI SPECIFICATION (SCREEN-LEVEL)

### 1. Thông tin chung

- **Screen ID**: `SCR-ADM-01`

- **UC liên quan**: UC-Moderate (Duyệt khóa học)

- **Actor**: Admin

- **API liên quan**:

    - `GET /api/v1/management/approval-queue` (Lấy danh sách chờ)

    - `POST /api/v1/management/courses/[id]/moderate` (Duyệt/Từ chối)


### 2. Layout Structure

- **Header**: Thanh tiêu đề hệ thống quản trị.

- **Body**:

    - **Section 01**: Bộ lọc và tìm kiếm khóa học theo tên giảng viên/ngày gửi.

    - **Section 02**: Bảng danh sách khóa học chờ duyệt theo quy tắc FIFO (Cũ nhất lên đầu).


### 3. UI Components (Business-level)

| **Component ID** | **Type** | **Business Meaning**        | **Logic hiển thị / Hành vi**                               |
| ---------------- | -------- | --------------------------- | ---------------------------------------------------------- |
| **CMP-01**       | Table    | Danh sách khóa học Pending  | Hiển thị thông tin ID, Tên khóa học, Giảng viên, Ngày gửi. |
| **CMP-02**       | Button   | Chấp thuận (Approve)        | Gửi lệnh phê duyệt cho khóa học tương ứng.                 |
| **CMP-03**       | Button   | Từ chối (Reject)            | Kích hoạt hộp thoại nhập lý do từ chối.                    |
| **CMP-04**       | Input    | Lý do từ chối (Reject Note) | Vùng nhập văn bản giải thích lý do không duyệt.            |
| **CMP-05**       | Action   | Xem chi tiết                | Click vào dòng dữ liệu để mở chế độ xem trước.             |

### 4. User Intent (UI → System)

| **Intent ID** | **Mô tả**                                 | **API**                                                  |
| ------------- | ----------------------------------------- | -------------------------------------------------------- |
| **INT-01**    | Người dùng yêu cầu tải danh sách hàng chờ | `GET /api/v1/management/approval-queue`                  |
| **INT-02**    | Người dùng yêu cầu xem nội dung khóa học  | Chuyển sang **SCR-COM-01** (Preview Mode)                |
| **INT-03**    | Admin xác nhận duyệt khóa học             | `POST .../moderate` (action: APPROVE)                    |
| **INT-04**    | Admin xác nhận từ chối khóa học           | `POST .../moderate` (action: REJECT, rejectNote: CMP-04) |

### 5. System Feedback (System → UI)

| **Case**             | **UI Reaction**                                                   |
| -------------------- | ----------------------------------------------------------------- |
| **Moderate Success** | Loại bỏ khóa học khỏi danh sách hiện tại và thông báo thành công. |
| **Reject Initial**   | Hiển thị vùng nhập liệu CMP-04 cho người dùng.                    |
| **System Error**     | Hiển thị thông báo lỗi chung và giữ nguyên trạng thái danh sách.  |

---

## VII. ARTIFACT 4 – UI STATE MATRIX

| **State**      | **Mô tả**                     | **Trigger**          | **Behavior đặc biệt**                       |
| -------------- | ----------------------------- | -------------------- | ------------------------------------------- |
| **Idle**       | Trạng thái hiển thị danh sách | Load screen xong     | Dữ liệu sắp xếp theo submittedAt (FIFO).    |
| **Processing** | Đang gửi quyết định duyệt     | INT-03 hoặc INT-04   | Khóa các nút tương tác tại dòng đó.         |
| **Empty**      | Không có khóa học chờ duyệt   | API trả về mảng rỗng | Hiển thị thông báo "Hàng chờ trống".        |
| **Error**      | Lỗi tải dữ liệu               | API 5xx hoặc 403     | Thông báo lỗi quyền truy cập hoặc hệ thống. |

---

## VIII. ARTIFACT 5 – FIELD CONTRACT (UI ↔ API)

### 1. Object: Approval Queue (Display)

_Nguồn: `GET /api/v1/management/approval-queue`_

| **Field** | **UI Label** | **API Field**  | **Rule**             | **Editable** |
| --------- | ------------ | -------------- | -------------------- | ------------ |
| Course ID | (Ẩn)         | `id`           | Dùng cho lệnh duyệt  | No           |
| Title     | Tên khóa học | `title`        | Hiển thị tên đầy đủ  | No           |
| Lecturer  | Giảng viên   | `lecturerName` | Tên người đăng       | No           |
| Date      | Ngày gửi     | `submittedAt`  | Định dạng dd/mm/yyyy | No           |

### 2. Object: Moderation Decision (Submit)

_Đích: `POST /api/v1/management/courses/[id]/moderate`_

| **Field** | **UI Label** | **API Field** | **Rule**                | **Editable**   |
| --------- | ------------ | ------------- | ----------------------- | -------------- |
| Action    | Quyết định   | `action`      | "APPROVE" hoặc "REJECT" | No (By Button) |
| Note      | Lý do        | `rejectNote`  | Bắt buộc nếu là REJECT  | Yes            |

---

## IX. ARTIFACT 6 – ERROR & MESSAGE MAPPING

| **BR / Error Code** | **Message (Business)**                                    | **UI Behavior**              |
| ------------------- | --------------------------------------------------------- | ---------------------------- |
| `ACCESS_DENIED`     | Bạn không có quyền Admin để thực hiện duyệt bài.          | Redirect hoặc chặn thao tác. |
| `COURSE_NOT_FOUND`  | Khóa học đã được duyệt bởi người khác hoặc không tồn tại. | Tải lại danh sách (INT-01).  |
| `UNAUTHORIZED`      | Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.          | Chuyển về màn hình Login.    |
