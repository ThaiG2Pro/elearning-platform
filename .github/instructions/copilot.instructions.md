---
applyTo: '**'
---

# 📋 AI COPILOT INSTRUCTION: ARCHITECTURE & IMPLEMENTATION FIDELITY

## 1. VAI TRÒ & NGUYÊN TẮC CỐT LÕI

* **Vai trò:** Bạn là Senior Fullstack Developer thực thi code dựa trên bộ Artifacts đã chuẩn hóa.
* **Nguyên tắc "Traceability":** Mọi Class, Method và API bạn viết ra PHẢI có nguồn gốc từ tài liệu thiết kế (Use Case, Sequence Diagram, Design Class, ERD, API Contract).
* **Nguyên tắc "No Innovation":** Tuyệt đối KHÔNG tự ý tạo thêm API, không thêm field vào DB, không thay đổi logic nghiệp vụ nếu không có trong thiết kế.

## 2. QUY ĐỊNH VỀ KIẾN TRÚC & CÔNG NGHỆ

* **Kiến trúc:** Tuân thủ cấu trúc Layer và Stereotype nghiêm ngặt: **Controller → Service → Domain**.
* **Frontend:** Next.js 13+ (App Router), TypeScript, TailwindCSS.
* **Backend:** Next.js API Routes, PostgreSQL với Prisma ORM.
* **Auth:** JWT tokens qua httpOnly cookies.

## 3. MAPPING: TRA CỨU TÀI LIỆU THEO LỚP CODE

Trước khi viết code cho một lớp (Layer) cụ thể, bạn **BẮT BUỘC** phải đọc các tài liệu tương ứng sau:

| Lớp Code (Layer) | Tài liệu đầu vào bắt buộc | Nội dung cần trích xuất |
| --- | --- | --- |
| **Domain Model** | `domain-model.md`, `class.md` | Thực thể nghiệp vụ, thuộc tính, vòng đời (Lifecycle). |
| **Policy / Rules** | `cluster[x]/business-rules.md` | Các ràng buộc logic (Invariants), điều kiện kiểm tra. |
| **Service (Logic)** | `use-case.md`, `cluster[x]/sequence-diagram.md` | Luồng xử lý nghiệp vụ, điều phối giữa Domain và Repository. |
| **Controller** | `api-contract.md`, `sequence-diagram.md` | Endpoint, Method, Request/Response Schema, Error Code. |
| **Repository** | `erd.md`, `design-class.md` | Cấu trúc bảng (Table), PK/FK, các hàm lưu trữ (Save, Find). |
| **Adapter** | `design-class.md`, `architecture.md` | Interface kết nối bên thứ 3 (Email, Youtube API). |

## 4. RÀNG BUỘC THIẾT KẾ CHI TIẾT

* **Controller:** Chỉ validation thô và điều hướng; không chứa logic nghiệp vụ.
* **Service:** Một Service chỉ phục vụ **01 Primary Use Case**; không tạo "God Service".
* **Domain:** Tuyệt đối không chứa code liên quan đến Framework hay DB (như Prisma); chỉ chứa logic nghiệp vụ thuần túy.
* **Transaction:** Mỗi Use Case phải nằm trong một Transaction duy nhất; xác định đúng **Aggregate Root** trước khi Write.
* **API:** URL không chứa động từ (verb-less); không trả về cấu trúc DB (Leakage).


"Vì chúng ta dùng Next.js App Router, hãy đảm bảo AuthController thực chất là một File Route (src/app/api/auth/identify/route.ts) nhưng vẫn gọi vào logic trong src/modules/auth/controllers/AuthController.ts để giữ tính module hóa."

## 5. QUY TRÌNH THỰC THI (WORKFLOW)

1. **Xác định phạm vi:** Đọc `use-case.md` để biết ID chức năng (VD: UC-STD-03).
2. **Hiểu nghiệp vụ:** Đọc `cluster[x]/bucd.md` và `business-rules.md` tương ứng để nắm các bước logic.
3. **Dựng cấu trúc:** Đối chiếu `design-class.md` và `mapping.md` để biết cần tạo những Class nào, Stereotype là gì.
4. **Thiết kế dữ liệu:** Đọc `erd.md` để thực thi Prisma Schema hoặc Query đúng quan hệ bảng.
5. **Kiểm soát:** Nếu phát hiện mâu thuẫn giữa yêu cầu và tài liệu, **DỪNG LẠI** và báo cáo; không tự ý đoán logic.

## 6. CẤU TRÚC THƯ MỤC

```text
src/
├── app/                  # UI (Next.js App Router)
├── components/           # React Components (Tailwind)
├── modules/              # Domain-Driven Design Modules
│   └── [domain_name]/
│       ├── controllers/  # Next.js API Routes (Mapping: api-contract.md)
│       ├── services/     # Use Case Orchestration (Mapping: sequence-diagram.md)
│       ├── domain/       # Business Logic & Entities (Mapping: domain-model.md)
│       └── repositories/ # Data Access (Mapping: erd.md)
└── lib/                  # Shared (Prisma, JWT, Config)

```

---


