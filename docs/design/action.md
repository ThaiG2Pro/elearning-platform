Dưới đây là **hướng dẫn từng thao tác một**, đúng theo **luồng thực tế của sản phẩm LMS**, chỉ rõ **FE làm gì – BE làm gì – API nào được gọi – trạng thái dữ liệu**.
Tôi viết theo dạng **playbook** để bạn có thể dùng làm tài liệu thiết kế hoặc checklist triển khai.

---

# 🎓 PLAYBOOK: QUẢN LÝ KHÓA HỌC (CREATE → EDIT → SAVE → POST)

---

## 1️⃣ TẠO KHÓA HỌC MỚI → MỞ GIAO DIỆN EDIT

### FE (Frontend)

1. User bấm nút **“Create course”**
2. FE thu thập dữ liệu tối thiểu:

   * `title` (có thể cho trống, hoặc default “Untitled course”)
3. FE gọi API tạo course
4. Sau khi nhận `courseId` → redirect sang trang editor

### BE (Backend)

* Tạo course với trạng thái ban đầu `DRAFT`
* Chưa cần sections / lessons

### API

```http
POST /api/v1/management/courses
Content-Type: application/json

{
  "title": "My first course"
}
```

### Response

```json
{
  "courseId": 7,
  "status": "DRAFT"
}
```

### Kết quả

* Course đã tồn tại trong DB
* Editor mở với **nội dung rỗng**

---

## 2️⃣ CLICK VÀO KHÓA DRAFT → MỞ GIAO DIỆN EDIT

### FE

1. User click course có status `DRAFT`
2. FE gọi API load nội dung course
3. Render editor:

   * Nếu sections rỗng → hiển thị empty state

### BE

* Validate quyền sở hữu
* Trả về danh sách sections + lessons (có thể rỗng)

### API

```http
GET /api/v1/management/courses/{courseId}/sections
```

### Response (course mới)

```json
{
  "courseId": 7,
  "status": "DRAFT",
  "sections": []
}
```

---

## 3️⃣ THÊM / XÓA CHƯƠNG (SECTION)

### ➕ Thêm chương

#### FE

* User click **“Add chapter”**
* Nhập title
* Gọi API ngay (cần `sectionId`)

#### BE

* Tạo section mới
* Gắn với course

#### API

```http
POST /api/v1/management/courses/{courseId}/sections
```

```json
{
  "title": "Chương 1",
  "orderIndex": 1
}
```

#### Response

```json
{
  "sectionId": 12
}
```

---

### ❌ Xóa chương (case xóa cascade)

#### FE

* User click Delete chapter
* Confirm
* Gọi API ngay

#### BE

* Xóa section
* CASCADE:

  * Xóa lessons
  * Xóa quiz questions (nếu có)

#### API

```http
DELETE /api/v1/management/sections/{sectionId}
```

---

## 4️⃣ THÊM / XÓA LESSON TRONG CHƯƠNG

### ➕ Thêm lesson

#### FE

1. User click **“Add lesson”**
2. Chọn:

   * `type = VIDEO` hoặc `QUIZ`
3. FE gọi API để tạo lesson (lấy `lessonId`)

#### BE

* Tạo lesson rỗng
* Gắn type
* Chưa cần content

#### API

```http
POST /api/v1/management/sections/{sectionId}/lessons
```

```json
{
  "title": "Lesson 1",
  "type": "VIDEO",
  "orderIndex": 1
}
```

#### Response

```json
{
  "lessonId": 33
}
```

---

### ❌ Xóa lesson

#### FE

* User click delete lesson
* Gọi API ngay

#### BE

* Xóa lesson
* CASCADE:

  * Xóa quiz questions
  * Xóa progress liên quan (nếu cần)

#### API

```http
DELETE /api/v1/management/lessons/{lessonId}
```

---

## 5️⃣ CHỌN LOẠI LESSON: VIDEO HOẶC QUIZ

---

### 🎥 Lesson loại VIDEO

#### FE

1. User nhập `videoUrl`
2. FE có 2 lựa chọn:

   * (A) Chỉ lưu URL → save sau
   * (B) Fetch metadata ngay → gọi API sync

#### BE

* Validate URL
* (Optional) Fetch metadata (duration, thumbnail)

#### API (update lesson)

```http
PUT /api/v1/management/lessons/{lessonId}
```

```json
{
  "contentUrl": "https://youtube.com/..."
}
```

---

### 🧠 Lesson loại QUIZ (upload Excel)

#### FE

1. User chọn file Excel
2. Gọi API upload **NGAY** (không chờ Save)

#### BE

* Validate file
* Parse Excel
* Xóa questions cũ (nếu có)
* Insert questions mới

#### API

```http
POST /api/v1/management/lessons/{lessonId}/quiz/upload
Content-Type: multipart/form-data
```

---

## 6️⃣ NHẤN SAVE (LƯU TẤT CẢ THAY ĐỔI)

### FE

* Thu thập toàn bộ state hiện tại:

  * sections
  * lessons
  * orderIndex
  * titles
* Disable Save button khi đang lưu

### BE

* Validate:

  * Course tồn tại
  * Status = DRAFT
* Sync dữ liệu
* Update DB

### API

```http
PUT /api/v1/management/courses/{courseId}/content
```

### Response

```json
{
  "success": true
}
```

---

## 7️⃣ NHẤN POST / SUBMIT (CHUYỂN STATE)

### FE

* User click **Post / Submit**
* Gọi API
* Nếu lỗi → show message

### BE

* Validate nghiệp vụ:

  * Có ít nhất 1 section
  * Mỗi section có lesson
  * Quiz phải có câu hỏi
  * Video phải có URL
* Nếu OK → đổi state

### API

```http
PATCH /api/v1/management/courses/{courseId}/publish
```

### Response

```json
{
  "status": "PENDING"
}
```

---

## 🧠 STATE MACHINE (TƯ DUY QUAN TRỌNG)

```
DRAFT
  ↓ (submit)
PENDING
  ↓ (admin approve)
PUBLISHED
```

* DRAFT → editable
* PENDING → readonly
* PUBLISHED → readonly

---

## ✅ TÓM TẮT 1 CÂU

> **Tạo entity sớm – mọi thao tác phá cấu trúc gọi API ngay – chỉnh sửa nhẹ thì Save – Post để server validate & chuyển state.**

---
