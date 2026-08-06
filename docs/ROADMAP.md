# Roadmap — Checkpoint & Milestone

> **Tài liệu liên quan** (không lặp lại nội dung nhau):
> 1. `docs/VISION.md` — nguồn sự thật về hướng đi sản phẩm; roadmap này hiện
>    thực hoá Vision mục 4 (lộ trình người dùng) và mục 10 (lộ trình giai đoạn)
>    thành các checkpoint quản lý được.
> 2. `ARCHITECTURE_NOTES.md` — nợ kỹ thuật & gap giữa code hiện tại và Vision.
> 3. `docs/design/ai-personalization-economics.md` — thiết kế chi tiết lớp AI,
>    được hiện thực hoá dần ở Checkpoint 2–3 dưới đây.
> 4. `docs/design/checkpoint-0-1-ux-audit.md` — audit code thật đối chiếu
>    Checkpoint 0/1, chi tiết hoá gap UI/UX ở 2 checkpoint đó.
> 5. `docs/design/ai-integration-plan.md` — kế hoạch kỹ thuật "làm thế nào" cho
>    lớp AI ở Checkpoint 2 (thư viện, kiến trúc module, rủi ro cụ thể).
>
> Đây là roadmap ở mức **work package (WP) level 2** — đủ để quản lý sản phẩm
> theo từng giai đoạn, **không chứa thời gian/deadline cụ thể**. Chuyển
> checkpoint theo **tín hiệu thật**, đúng tinh thần Vision mục 10, không theo lịch.

## Nguyên tắc xuyên suốt — không mất user một cách tự nhiên khi upgrade

Đây là câu trả lời cho yêu cầu cốt lõi: vừa ra demo sớm, vừa upgrade dần mà
không mất user. 4 quy tắc áp dụng cho **mọi** checkpoint từ Checkpoint 1 trở đi
(sau khi đã có người dùng ngoài):

1. **Breaking change chỉ được phép ở Checkpoint 0** — lúc chưa có user ngoài
   (Vision giai đoạn 0, chỉ founder dùng). Đây là cơ hội duy nhất để đổi data
   model/role model mạnh tay mà không ai bị ảnh hưởng. Từ Checkpoint 1 trở đi,
   mọi thay đổi schema phải **additive** (thêm cột/bảng nullable), không xoá
   hoặc đổi ý nghĩa field cũ mà course/tiến độ của user đang tham chiếu.
2. **Feature mới luôn optional, không chặn luồng cũ** — đúng nguyên tắc đã có
   sẵn ở `ai-personalization-economics.md` mục 8 (`aiGenerationId` luôn có thể
   `null`): AI, BYOK, thu phí đều là lớp cộng thêm, tắt được, không bao giờ là
   điều kiện bắt buộc để tiếp tục dùng phần đã có.
3. **Share link/URL đã phát ra không được vô hiệu khi nâng cấp** — vì lan
   truyền tự nhiên qua share link là kênh tăng trưởng chính (Vision mục 9),
   link cũ đổi/gãy sau 1 lần upgrade sẽ trực tiếp giết kênh tăng trưởng đó.
4. **Đổi giới hạn free phải báo trước, không âm thầm siết** — nếu sau này
   giảm quota AI free hoặc bật giới hạn mới, luôn thông báo rõ cho user đang
   dùng, không để họ phát hiện bằng cách... bị chặn giữa chừng.

---

## Checkpoint 0 — Nền móng kỹthuật & Pivot data model

**Mô tả sản phẩm:** Chưa có gì để demo cho user ngoài. Đây là bước dọn nền bắt
buộc trước khi build tiếp, tận dụng việc **chưa ai ngoài dùng** để đổi mạnh tay
mà không phá vỡ trải nghiệm của ai (nguyên tắc #1 ở trên).

**Vấn đề cần giải quyết** (theo `ARCHITECTURE_NOTES.md`): code hiện tại là mô
hình marketplace giảng viên cũ (LECTURER tạo course, ADMIN duyệt qua
approval-queue, STUDENT enroll) — không khớp Vision (course cá nhân từ link tự
chọn, không cần ai duyệt).

**Chi tiết audit code thật:** `docs/design/checkpoint-0-1-ux-audit.md`.

**WP:**
- **WP0.1 — Tập trung hoá auth/request-context.** Thay ~20+ route tự
  decode JWT + check role rời rạc bằng 1 điểm chung (`middleware.ts` hoặc
  `getRequestContext()`). Ưu tiên cao nhất vì mọi checkpoint sau (quota AI,
  feature flag, BYOK...) đều cần điểm neo này — làm sau sẽ phải sửa lại từng
  route một lần nữa.
- **WP0.2 — Pivot data model sang course cá nhân.** Thêm `Source` (dedup theo
  URL chuẩn hoá), đổi `Course` sang sở hữu cá nhân (`ownerId`, không cần
  duyệt). Gỡ approval-queue/enrollment-giữa-user khỏi luồng chính.
- **WP0.3 — Quyết định số phận dữ liệu cũ.** Vì đang ở giai đoạn cá nhân
  (Vision phase 0), dữ liệu marketplace cũ (courses/enrollments demo) nhiều
  khả năng không cần giữ — quyết định rõ: seed lại từ đầu hay migrate, tránh
  vừa giữ vừa pivot dở dang.

**Điều kiện qua checkpoint tiếp theo:** schema mới + auth-context tập trung
chạy ổn định cho chính founder dùng (Vision giai đoạn 0 tiếp tục tự kiểm chứng
trên nền mới).

---

## Checkpoint 1 — Demo lõi cho nhóm nhỏ (Vision giai đoạn 1)

**Mô tả sản phẩm:** Người dùng tự dán link (YouTube/blog) → nền tảng tạo
thành 1 course cá nhân có cấu trúc chương/bài → học trong giao diện tập trung,
không xao nhãng → theo dõi tiến độ. Có thể **share link course cho bạn bè
dùng ngay**. Chưa có AI, chưa thu phí. **Đây là bản demo sớm nhất đưa được
cho người ngoài.**

**Chi tiết audit code thật:** `docs/design/checkpoint-0-1-ux-audit.md`.

**WP:**
- **WP1.1 — CRUD course/course-item cá nhân từ link.** Nhập link → parse
  metadata cơ bản (tiêu đề, thumbnail, thời lượng nếu là video) → sắp xếp
  thành chương/bài.
- **WP1.2 — Trình học tập trung (focus mode).** Phát video/hiển thị bài viết
  trong khung nhìn tách khỏi môi trường gốc — không đề xuất/autoplay lạc đề.
- **WP1.3 — Theo dõi tiến độ.** Đánh dấu đã học/chưa học từng bài, % hoàn
  thành course.
- **WP1.4 — Share/invite course.** Tạo link chia sẻ course cho người khác
  dùng thử ngay, không cần thao tác phức tạp. **Bắt buộc có ở checkpoint này,
  không để sau** — đây chính là kênh đo tín hiệu retention/lan truyền thật
  theo Vision mục 9, và theo nguyên tắc #3 ở trên link này phải ổn định lâu dài.

**Điều kiện qua checkpoint tiếp theo:** có người ngoài thật sự quay lại học
tiếp (retention có ý nghĩa) — đúng exit signal Vision giai đoạn 1.

---

## Checkpoint 2 — Cộng đồng hẹp + lớp AI mặc định miễn phí (Vision giai đoạn 2)

**Mô tả sản phẩm:** Mở cho 1 cộng đồng hẹp cụ thể (vd người tự học lập trình
qua YouTube free). Mỗi course/bài giờ có thêm **tóm tắt & quiz tự sinh bằng
AI** theo cấu hình mặc định của hệ thống — tự động có, không cần user làm gì,
không tốn phí cho user lẫn nền tảng (trong giới hạn kiểm soát được).

**Chi tiết kỹ thuật:** `docs/design/ai-integration-plan.md`.

**WP:**
- **WP2.1 — Data model `Source`/`AIGeneration`.** Theo
  `ai-personalization-economics.md` mục 3, gồm cả 2 ghi chú mới
  (`modelVersion` trong `recipeHash`, `generatedByUserId` → NULL khi xoá tài
  khoản).
- **WP2.2 — Pipeline generate AI mặc định có kiểm soát chi phí.** Lazy-generate
  (chỉ chạy khi user thật sự bấm dùng, không tự động khi thêm Source), cache
  theo `(sourceId, recipeHash mặc định)`, rate-limit Source mới/user/ngày (mục
  6.1), quota tính theo token thực chứ không theo lượt (mục 6.3).
- **WP2.3 — UI hiển thị AI mặc định gắn vào course-item.** Luôn optional —
  generate lỗi/chưa xong không chặn việc học.
- **WP2.4 — Alerting chi phí AI theo ngày/tuần** (mục 6.7). Bắt buộc trước khi
  mở rộng thêm cộng đồng, để phát hiện sớm tăng trưởng đột biến ngoài dự tính.

**Điều kiện qua checkpoint tiếp theo:** retention tốt ở cộng đồng hẹp **và**
chi phí AI mặc định nằm trong ngân sách quan sát được, ổn định (không phải chờ
"có tiền" mà chờ số liệu ổn định để tự tin mở rộng).

---

## Checkpoint 3 — Tuỳ biến AI qua BYOK + bước đệm kiếm tiền nhẹ

**Mô tả sản phẩm:** User muốn tuỳ biến AI (độ khó, độ dài, giọng văn, tự chia
segment) → nhập API key miễn phí của riêng họ (BYOK), dùng không giới hạn.
Thêm hỗ trợ nguồn web/blog (không chỉ YouTube). Có nút donate/ủng hộ.

**WP:**
- **WP3.1 — Luồng BYOK.** UI nhập/validate key, generate qua key riêng của
  user, tuyệt đối không đụng cache/quota chung. Đúng 4 nhánh UX ở
  `ai-personalization-economics.md` mục 4. Lỗi BYOK luôn hiện rõ, không tự
  fallback âm thầm sang ngân sách chung (mục 6.2).
- **WP3.2 — Cơ chế chia sẻ bản AI tuỳ biến + fix free-rider.** Cho phép user
  chọn `SHARED` cho bản BYOK của họ để người khác tái dùng free; xây sẵn ràng
  buộc `PAID_TIER` luôn `PRIVATE` (mục 5) **ngay cả khi chưa bán thật** — để
  không phải sửa lại data model khi tới Checkpoint 4.
- **WP3.3 — Hỗ trợ nguồn web/blog** (mục 6.8): fetch/parse trang, kèm
  `fetchedAt` để đánh dấu cache có thể cũ, rate-limit riêng theo domain nguồn.
- **WP3.4 — Nút donate/ủng hộ.** Không cần logic subscription, bật ngay, rủi
  ro gần như bằng 0.

**Điều kiện qua checkpoint tiếp theo:** 1 trong các tín hiệu thu phí ở Vision
mục 7 xảy ra thật (retention ổn định + chi phí AI dùng chung chạm giới hạn
thường xuyên, hoặc user chủ động đòi hỏi thêm, hoặc đủ quy mô).

---

## Checkpoint 4 — Bật `PAID_TIER` thật + mở rộng công khai (Vision giai đoạn 3–4)

**Mô tả sản phẩm:** Khi tín hiệu thu phí xảy ra thật, cắm thanh toán thật vào
nhánh UX đã có sẵn từ Checkpoint 3 (không phải xây lại). Sau khi ổn định, mở
đăng ký công khai cho bất kỳ ai.

**WP:**
- **WP4.1 — Tích hợp thanh toán thật.** Bán theo gói credit/subscription,
  **không** pay-per-generation lẻ tẻ (phí xử lý thanh toán ăn mòn doanh thu
  nhỏ lẻ — đã ghi chú ở `ai-personalization-economics.md` mục 7). Chỉ cắm vào
  nhánh UX #4 có sẵn, data model không đổi.
- **WP4.2 — Policy dọn dữ liệu** (mục 6.4): archive `Source`/`AIGeneration`
  không truy cập lâu ngày và không còn course công khai nào tham chiếu —
  cần thiết khi quy mô đủ lớn để chi phí lưu trữ đáng kể.
- **WP4.3 — Mở đăng ký công khai.** Gỡ giới hạn invite-only, chuyển từ cộng
  đồng hẹp sang public free (Vision giai đoạn 4).

**Điều kiện:** có bằng chứng retention + lan truyền ổn định ở quy mô nhỏ trước
khi mở public — không mở rộng khi tín hiệu ở checkpoint trước còn mơ hồ.

---

## Bảng tổng quan

| Checkpoint | Ai dùng được | Có AI? | Có thu phí? | Rủi ro chính nếu bỏ qua thứ tự |
|---|---|---|---|---|
| 0 | Chỉ founder | Không | Không | Pivot dở dang, nợ kỹ thuật dồn sang mọi checkpoint sau |
| 1 | Nhóm bạn bè | Không | Không | Ra mắt AI/thu phí trước khi core ổn định → phân tán nguồn lực, chưa có gì để giữ chân user |
| 2 | Cộng đồng hẹp | Có (mặc định, free) | Không | Bỏ qua rate-limit/alerting (6.1, 6.7) → cost-DoS âm thầm trước khi kịp phát hiện |
| 3 | Cộng đồng hẹp (mở rộng) | Có (tuỳ biến qua BYOK) | Donate only | Không xây sẵn fix free-rider (mục 5) → `PAID_TIER` tự triệt tiêu ngay khi bật ở Checkpoint 4 |
| 4 | Public | Có (đủ 3 tier) | Có (khi tín hiệu thật) | Mở public/thu phí trước khi có tín hiệu retention thật → đốt chi phí hosting nhanh hơn doanh thu (mục 6.7) |
