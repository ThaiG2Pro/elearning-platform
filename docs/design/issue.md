# PHIẾU PHÂN TÍCH LỖI (TECHNICAL POST-MORTEM)

**Người thực hiện:** Senior Developer
**Mã Issue:** [ID từ Stakeholder]

---

### 1. Phân loại gốc rễ (Root Cause Classification)

*Đánh dấu [x] vào ô phù hợp:*

* [ ] **Logic Gap (Tầng 3):** Tài liệu BR/FR viết thiếu, chưa bao phủ trường hợp này.
* [ ] **Contract Breach (Tầng 4):** BE và FE không khớp API Spec/Field Contract dù tài liệu có ghi.
* [ ] **Execution Bug (BE):** Logic trong lớp `Policy` hoặc `Service` chạy sai kết quả.
* [ ] **Execution Bug (FE):** Thiếu logic ẩn/hiện, sai `State Matrix`, navigate sai API.
* [ ] **Ownership Gap:** Task chưa phân rõ nhiệm vụ (FE hay BE làm).

---

### 2. Bằng chứng điều tra (Technical Evidence)

*Mô tả ngắn gọn sự mâu thuẫn giữa Code và Artifact:*

* **Hiện tượng:** (Ví dụ: Bấm nút Duyệt nhưng không có phản hồi).
* **Kiểm tra BE:** (Ví dụ: API `/orders/approve` trả về 200 nhưng Database không update `status` do lớp `Policy` chặn sai điều kiện `is_risk`).
* **Kiểm tra FE:** (Ví dụ: Nhận mã 400 từ BE nhưng không hiển thị Message từ `Error Mapping Table`, đứng im màn hình).

---

### 3. Đối chiếu Artifact (Traceability Check)

*Sai lệch nằm ở đâu?*

* **Tầng 3 (Logic):** BR-ID [Mã số] có vấn đề / bị thiếu.
* **Tầng 4 (Kỹ thuật):** API Spec [Tên API] sai định dạng Field / thiếu Error Code.
* **UI Guideline:** Màn hình [ID] thiếu trạng thái `Error State` trong Matrix.

---

### 4. Đề xuất & Xử lý (Resolution)

* **Giải pháp:** (Ví dụ: Sửa logic hàm `validate()` trong BE Service; FE bổ sung `Toast.error` dựa trên BR-ID).
* **Người thực hiện:** [Tên Dev]
* **Mức độ ưu tiên:** (Gấp / Bình thường)

---

### 5. Kết luận của Senior Dev (Dành cho PM)

> *"Vấn đề này do **[BE/FE/Design]**. Nguyên nhân ẩn là do **[Lý do kỹ thuật]**. Cần cập nhật lại Artifact Tầng **[1/2/3/4]** để tránh lặp lại."*

---

## Cách dùng hiệu quả cho Senior Dev:

1. **Không viết văn xuôi:** Chỉ dùng gạch đầu dòng và từ khóa kỹ thuật/nghiệp vụ.
2. **Luôn có "Bằng chứng":** Code dòng mấy, API trả về gì, Artifact ghi gì.
3. **Phán quyết: Thẳng thắn.** Nếu lỗi do chia task thiếu (Ownership Gap), Senior phải chỉ rõ để PM rút kinh nghiệm.

