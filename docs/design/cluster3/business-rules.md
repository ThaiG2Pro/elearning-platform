
### III. CỤM 3: BIÊN SOẠN & KIỂM DUYỆT (QUALITY GATE RULES)

#### 1. Luật về Vòng đời & Trạng thái (Lifecycle State Machine)

* **BR-STATE-01 (Editability):** Chỉ khóa học `Draft` mới được chỉnh sửa. `Pending` và `Active` là Read-only.
* **BR-STATE-02 (Immutability):** Khóa học `Active` là bất biến vĩnh viễn (Không Sửa/Xóa/Ẩn).
* **BR-STATE-03 (Reject Flow):** Khóa học bị `Rejected` quay về `Draft` để sửa chữa, đi kèm `Reject Note`.
* **BR-SEARCH-01 (Search Scope):** Kết quả tìm kiếm (Search) chỉ hiển thị các khóa học `Active`.

#### 2. Luật về Dữ liệu & Cấu trúc (Content Integrity)

* **BR-DATA-01 (Minimum Viable Content):** Điều kiện Post: Tiêu đề + Mô tả + Min 1 Chương + Min 1 Bài/Chương + Không bài rỗng.
* **BR-DATA-02 (Quiz Schema):** File Excel Quiz bắt buộc có: Câu hỏi, 4 Đáp án, 1 Đáp án đúng. Sai cấu trúc -> Từ chối cả file.
* **BR-DATA-03 (Isolation):** Hành động trong chế độ Preview không được tính vào thống kê hệ thống.
* **BR-DATA-04 (Physical Delete):** Xóa Chương/Bài học ở trạng thái `Draft` là xóa vật lý (Hard Delete) khỏi Database.
* **BR-UPLOAD-01 (Replace All):** Upload file Excel mới sẽ xóa sạch ngân hàng câu hỏi cũ của bài đó và thay thế bằng dữ liệu mới.

#### 3. Luật về Quy trình & Hàng đợi (Workflow & Queue)

* **BR-WF-01 (One-Way Approval):** Admin không thể thu hồi quyết định (Approve/Reject) sau khi đã thực hiện.
* **BR-WF-02 (Private Scope):** Lecturer chỉ được thao tác trên khóa học của chính mình.
* **BR-WF-03 (Note Cleanup):** `Reject Note` bị xóa ngay khi Lecturer nhấn `Post` lại.
* **BR-QUEUE-01 (FIFO Priority):** Danh sách chờ duyệt (Pending Queue) bắt buộc sắp xếp theo thời gian gửi: Cũ nhất lên đầu (First In - First Out).

---
