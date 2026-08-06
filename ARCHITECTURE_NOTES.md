# Ghi Chú Kỹ Thuật — Architecture Notes

> **Tài liệu liên quan** (đọc theo thứ tự này, không lặp lại nội dung nhau):
> 1. `docs/VISION.md` — nguồn sự thật duy nhất về hướng đi sản phẩm.
> 2. File này — nợ kỹ thuật & trạng thái codebase hiện tại, đối chiếu với Vision.
> 3. `docs/design/ai-personalization-economics.md` — thiết kế chi tiết cho
>    tính năng AI cá nhân hoá + mô hình kinh tế chi phí (chi tiết hoá Vision mục 6-7).
>
> Khi 1 trong 3 file thay đổi hướng đi/kết luận, phải cập nhật 2 file còn lại
> trong cùng lần sửa — không để lệch.

## Trạng thái hiện tại (2026-08-06)

- **Hướng đi sản phẩm**: theo `docs/VISION.md` — nền tảng cá nhân giúp người
  dùng tự dán link video/blog free (YouTube, blog...) và tổ chức thành course
  có cấu trúc, học tập trung, theo dõi tiến độ. Core free mãi mãi, không
  marketplace giảng viên, không multi-tenant/B2B ở giai đoạn này (Vision mục
  5, mục 8).
- **Code hiện tại chưa khớp Vision**: vẫn là mô hình marketplace giảng viên
  cũ — role `LECTURER` tạo/publish course, `ADMIN` duyệt qua approval-queue,
  `STUDENT` enroll vào course người khác tạo (`EnrollmentService`,
  `ApprovalService`, `AccessControlPolicy`...). Đây là **gap lớn nhất hiện
  tại** giữa Vision và code — cần 1 plan pivot riêng (data model + role model),
  **chưa lên plan cụ thể**, chưa làm.
- **Hệ quả**: vì role model (`STUDENT`/`LECTURER`/`ADMIN`) và luồng
  approval-queue/enrollment nhiều khả năng bị thay thế khi pivot, **không nên
  đầu tư sâu polish luồng Lecturer/Admin/Approval hiện tại**.

## Nợ kỹ thuật — đúng bất kể pivot theo Vision hay không (khảo sát CodeGraph, 2026-08-05)

- **User/Auth**: `src/modules/auth/` — có `UserEntity`, `RoleEntity`, policies
  (`IdentityPolicy`, `RegistrationPolicy`, `RecoveryPolicy`, `TokenPolicy`).
  Role là bảng flat (`roles.name`), gắn 1:1 vào user qua `role_id`. Không có
  organization/tenant/workspace/account nào trong schema.
- **Middleware**: **không có `middleware.ts`** ở root. Auth được check ad-hoc
  — mỗi route tự gọi `getUserFromRequest()` (`src/shared/middleware/auth.ts`)
  rồi tự viết if/else check role (ví dụ `user.role !== 'STUDENT'`), lặp lại ở
  ~20+ route file.
- **Prisma schema hiện tại** — mọi FK trỏ trực tiếp về `users`, không có
  `organization_id`/`tenant_id`: `users`, `roles`, `tokens`, `courses`,
  `chapters`, `lessons`, `enrollments`, `learning_progress`, `questions`. Sẽ
  đổi khi pivot theo Vision (thêm `Source`, đổi `courses` thành course cá
  nhân — xem `ai-personalization-economics.md`).

### 3 điểm nghẽn thật (không phụ thuộc hướng đi, nên sửa sớm)

1. **Auth/request-context bị rải rác** — ưu tiên cao nhất. ~20+ route tự
   decode JWT + tự check role riêng lẻ, không qua 1 điểm chung. Bất kể sau
   này thêm gì (AI quota check, feature flag...), đều phải sửa lại từng route
   nếu không tập trung hoá trước. → Đề xuất: `middleware.ts` root hoặc 1 hàm
   `getRequestContext()` duy nhất, mọi route dùng chung.
2. **Role check bằng string literal rải rác** — `user.role !== 'STUDENT'`
   lặp lại nhiều nơi thay vì qua policy tập trung (đã có tiền lệ tốt:
   `AccessControlPolicy`, `EnrollmentPolicy` — nên nhân rộng pattern này).
3. **Thiếu điểm neo (extension point) ở hành động nghiệp vụ chính** —
   `EnrollmentService`, `CourseService`... chạy thẳng 1 luồng, không có chỗ
   "gắn thêm" side-effect (quota check, trigger AI...) mà không sửa logic lõi.

## Kết luận về đầu tư kiến trúc

- **Chưa build** `Organization`/`Plan`/`Subscription`/`Billing` table, **chưa
  tích hợp Stripe** — lý do bây giờ **không phải "chưa rõ hướng đi"** (đã rõ,
  theo Vision) mà vì Vision mục 5 và mục 8 nói rõ **không multi-tenant/B2B ở
  giai đoạn này**. Mô hình kiếm tiền thật (Vision mục 7 +
  `ai-personalization-economics.md` mục 7) không cần Organization/Tenant —
  chỉ cần 1 field/enum nhỏ (`AIGeneration.keySource: PAID_TIER`) khi tới thời
  điểm, không cần hạ tầng billing phức tạp.
- **Nên đầu tư ngay**: tập trung hoá auth/request-context (điểm nghẽn #1) —
  có lợi bất kể pivot theo Vision diễn ra thế nào, vì mọi hướng đi đều cần 1
  điểm auth chung duy nhất.

## Khi nào quay lại tài liệu này

- Khi lên plan pivot data model/role model theo Vision — cập nhật lại mục
  "Trạng thái hiện tại" ở trên sau khi có plan.
- Khi tín hiệu thu phí ở Vision mục 7 xảy ra thật — tham chiếu
  `ai-personalization-economics.md` mục 7 để triển khai, không lặp lại nội
  dung đó ở đây.
