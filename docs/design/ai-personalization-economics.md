# Mô Hình AI Cá Nhân Hoá & Kinh Tế Chi Phí

> **Tài liệu liên quan** (không lặp lại nội dung nhau):
> 1. `docs/VISION.md` — nguồn sự thật về hướng đi sản phẩm; tài liệu này chi
>    tiết hoá riêng mục 6 (tính năng AI) và mục 7 (chiến lược kiếm tiền).
> 2. `ARCHITECTURE_NOTES.md` — nợ kỹ thuật & trạng thái codebase hiện tại.
>
> Ghi lại ngày 2026-08-06, qua nhiều lượt phân tích và fix lỗ hổng phát hiện
> được. Đây là **thiết kế**, chưa phải code — chưa cần build billing/Stripe
> thật (xem mục 7). Nếu kết luận ở đây thay đổi, cập nhật lại phần tham chiếu
> tương ứng trong `ARCHITECTURE_NOTES.md` (mục "Kết luận về đầu tư kiến trúc").

## 0. Nguyên tắc bao trùm duy nhất

> **Chi phí AI luôn route theo thứ tự ưu tiên cố định: BYOK của chính user →
> cache dùng chung (chỉ với recipe mặc định) → trả phí cho nền tảng gánh →
> nếu không thoả điều nào, chặn và yêu cầu chọn 1 trong 2 trên.**

Mọi rule dưới đây suy ra từ câu này. Nếu sau này cần thêm tính năng AI mới,
luôn tự hỏi: tính năng đó có tuân theo đúng thứ tự ưu tiên chi phí này không?

## 1. Vấn đề gốc cần giải quyết

- Vision (mục 6): mặc định BYOK, cache theo nguồn (không theo user) để giữ chi
  phí AI ~0đ cho nền tảng.
- Nhưng nhiều user muốn **tuỳ biến** quiz/tóm tắt theo ý riêng (độ khó, độ dài,
  ngôn ngữ, giọng văn, chia đoạn thời gian riêng...) — tuỳ biến thì không thể
  cache 1 bản chung cho tất cả được nữa.
- Cần dung hoà: cho phép tuỳ biến, nhưng **không để chi phí lại scale theo số
  user** như trước khi có cache.

## 2. Ranh giới default/custom — phải do hệ thống định nghĩa cứng

"Recipe mặc định" (default) là **1 cấu hình duy nhất, cố định, do hệ thống
quyết định** (VD: tóm tắt độ dài chuẩn, quiz 10 câu độ khó trung bình, tiếng
Việt, segment = toàn bộ video). User **không được chọn tham số** cho bản mặc
định. Đổi bất kỳ tham số nào — kể cả chỉ đổi **khoảng thời gian/segment**
(video dài, user tự chia đoạn khác nhau) — lập tức rời khỏi "mặc định", bắt
buộc rơi vào BYOK hoặc trả phí.

Không có ranh giới cứng này, khái niệm cache theo Source vô nghĩa — mỗi user
chỉnh 1 tham số sẽ tạo cache-miss mới, chi phí quay lại scale theo user như cũ.

## 3. Mô hình dữ liệu

```
Source                                    — dedup theo video ID chuẩn hoá
  id, canonicalUrl, platform, title
  (transcript lưu Ở ĐÂY DUY NHẤT — xem mục 6.5, không lặp lại ở AIGeneration)

AIGeneration                              — 1 bản output AI cụ thể
  id, sourceId → Source
  recipeHash                              — hash(type, params, segmentRange)
  isDefaultRecipe: boolean                — true chỉ khi recipe == cấu hình
                                             mặc định hệ thống (không do user chọn)
  keySource: SHARED_FREE | BYOK | PAID_TIER
  generatedByUserId (null nếu hệ thống seed)
  visibility: PRIVATE | SHARED
  content (output đã xử lý — KHÔNG chứa lại transcript gốc)

  RÀNG BUỘC 1: unique(sourceId, recipeHash) khi keySource = SHARED_FREE
    → mỗi (Source, recipe mặc định) chỉ có đúng 1 bản cache dùng chung
  RÀNG BUỘC 2: visibility = SHARED chỉ hợp lệ khi keySource = BYOK
    → keySource = PAID_TIER LUÔN bị ép cứng visibility = PRIVATE (mục 5)

Course
  id, ownerId, visibility: PRIVATE | PUBLIC, forkedFromCourseId?

CourseItem                                — chương/bài trong course
  id, courseId, sourceId, order, segmentRange?
  aiGenerationId? → AIGeneration          — NULL hợp lệ, AI luôn optional (mục 8)
```

## 4. UX — 4 nhánh cố định, không nhánh nào mơ hồ

| Tình huống | Hành vi |
|---|---|
| Có BYOK key, bất kỳ recipe nào | Luôn dùng key riêng, generate trực tiếp, không đụng cache/quota chung |
| Không có key, dùng recipe mặc định | Tra cache `(sourceId, recipeHash mặc định)` — có thì trả ngay (free, tức thời); chưa có thì generate 1 lần bằng `SHARED_FREE`, lưu cache |
| Không có key, muốn tuỳ biến, đã có ai `SHARED` đúng recipe đó **và bản đó là BYOK** | Trả ngay bản `SHARED` có sẵn — free |
| Không có key, muốn tuỳ biến, không có bản `SHARED`-BYOK trùng (kể cả khi có bản `PAID_TIER` trùng — coi như không tồn tại, xem mục 5) | 2 lựa chọn hiện song song: "Nhập API key miễn phí" hoặc "Trả phí để nền tảng tạo giúp" — không generate nếu chưa chọn |

## 5. Fix free-rider — điểm quan trọng nhất, ảnh hưởng trực tiếp đến doanh thu

**Vấn đề phát hiện được**: nếu cho phép tái dùng free **bất kỳ** bản custom đã
tồn tại (kể cả bản người khác **trả phí** tạo ra) → không ai còn động lực trả
phí, chiến lược tối ưu luôn là "chờ người khác trả tiền trước, xin lại free".
`PAID_TIER` sẽ tự triệt tiêu ngay từ thiết kế.

**Fix**: phân biệt theo nguồn chi phí gốc của bản được chia sẻ:

| `keySource` gốc | Cho tái dùng free? | Lý do |
|---|---|---|
| `BYOK` | ✅ Nếu người tạo chọn `SHARED` | Không ai mất tiền — người tạo tốn key riêng, nền tảng tốn 0đ, người tái dùng tốn 0đ |
| `PAID_TIER` | ❌ Luôn `PRIVATE`, không cho opt-in `SHARED` | Free-rider sẽ giết chết động lực trả phí |
| `SHARED_FREE` (bản mặc định) | ✅ Luôn free cho mọi người | Đây vốn là mục đích thiết kế ban đầu |

**Hệ quả cần áp lại nơi khác:**
- **Fork Course**: nếu Course công khai của A tham chiếu `AIGeneration` với
  `keySource = PAID_TIER`, người fork **không kế thừa** bản này — `aiGenerationId`
  sau khi fork rơi về `null`/bản mặc định, người fork phải tự tạo lại nếu muốn
  bản tương đương.
- Ràng buộc này nằm ở **tầng logic**, không chỉ UI — hệ thống ép cứng, không
  cho user tự chọn "làm từ thiện" chia sẻ bản đã trả tiền.

## 6. Lỗ hổng kinh tế khác — không chỉ AI, còn hosting/DB

### 6.1 Spam Source mới để đốt quota chung (cost-DoS)
`SHARED_FREE` tính theo số Source độc nhất, không theo user — ai đó dán hàng
nghìn link khác nhau liên tiếp có thể đốt hết ngân sách chung trong vài phút.
**Fix**: không auto-generate `SHARED_FREE` ngay khi thêm Source — chỉ generate
lazy khi user thật sự bấm dùng tính năng; rate-limit số Source mới/user/ngày
được phép kích hoạt AI lần đầu.

### 6.2 BYOK lỗi → fallback ngầm về ngân sách chung
Nếu code "tiện tay" fallback sang `SHARED_FREE` khi key BYOK lỗi/hết hạn →
biến mọi lỗi cá nhân thành chi phí của nền tảng. **Fix**: lỗi BYOK luôn hiện
rõ cho user, không bao giờ tự fallback âm thầm.

### 6.3 Quota tính theo SỐ LƯỢT, không theo CHI PHÍ THỰC
Video 5 phút và video 10 giờ tính "1 generation" như nhau trong quota, nhưng
chi phí token thực chênh hàng chục-hàng trăm lần. **Fix**: quota `SHARED_FREE`
tính theo token/chi phí thực tiêu tốn; video quá dài có thể bị từ chối tạo bản
mặc định miễn phí, bắt buộc BYOK/trả phí ngay từ đầu.

### 6.4 Source/AIGeneration không có cơ chế dọn
Video xem thử rồi bỏ vẫn lưu vĩnh viễn — DB phình vô hạn theo tổng số video
từng được dán qua, không theo số user hoạt động thật. **Fix**: policy dọn định
kỳ — Source không truy cập trong N tháng và 0 Course công khai tham chiếu →
archive/xoá cache AI (giữ metadata nhẹ), tái tạo lại nếu cần sau.

### 6.5 Lưu transcript lặp lại ở mỗi AIGeneration
Nếu mỗi bản custom tự lưu lại nguyên transcript thay vì tham chiếu tới Source
→ transcript (nặng nhất) bị nhân bản N lần. **Fix**: transcript chỉ lưu 1 lần
ở `Source` (đã áp vào mô hình dữ liệu mục 3); `AIGeneration` chỉ lưu output
đã xử lý, tham chiếu qua `sourceId`.

### 6.6 YouTube Data API quota (metadata: tiêu đề, thumbnail, thời lượng)
Cũng là "ngân sách chung" có hạn/ngày — phải đảm bảo luôn check Source tồn tại
trước khi gọi API ngoài, không gọi lại cho video đã có Source.

### 6.7 Hosting cost tăng theo viral growth nhanh hơn doanh thu
Vision đã tự phòng bằng lộ trình mở rộng theo từng vòng nhỏ (giai đoạn 0→3).
Cần thêm lớp phòng thủ kỹ thuật thứ 2: alerting chi phí AI theo ngày/tuần, để
phát hiện sớm tăng trưởng đột biến ngoài dự tính.

## 7. Khi triển khai `PAID_TIER` thật (chưa cần làm ngay)

- `keySource: PAID_TIER` trong schema **chỉ là chỗ trống**, chưa cần build
  billing/Stripe thật — khớp với kết luận cũ trong `ARCHITECTURE_NOTES.md`.
- Khi tín hiệu ở Vision mục 7 xảy ra thật, chỉ cần cắm luồng thanh toán vào
  nhánh UX #4 (mục 4) — không phải đổi lại data model.
- **Ghi chú tránh sai lầm trước**: nên bán theo gói **credit/subscription**,
  không pay-per-generation lẻ tẻ — phí xử lý thanh toán (~2.9% + phí cố định)
  ăn mòn gần hết doanh thu nếu bán từng giao dịch nhỏ.

## 8. Ranh giới với "core free mãi mãi" (Vision mục 5.1)

`CourseItem.aiGenerationId` luôn có thể `null` — tổ chức link, học, theo dõi
tiến độ hoàn toàn không cần chạm AI. "Free mãi mãi" chỉ áp dụng cho lớp này.
Lớp AI (kể cả bản mặc định dùng cache chung) là add-on **"free trong giới hạn
ngân sách chung"** — không phải free vô điều kiện vĩnh viễn. Khi ngân sách
chung chạm giới hạn thường xuyên, đó là tín hiệu #2 ở Vision mục 7 để bật
`PAID_TIER` thật.

## 9. Việc cần làm khi bắt đầu code (tóm tắt)

Bắt buộc từ ngày đầu (an ninh kinh tế): mục 6.1, 6.2, 6.3, 6.6.
Tối ưu dài hạn, làm sau khi có dữ liệu usage thật: mục 6.4, 6.5, 6.7.
Chưa cần code, chỉ ghi chú: mục 7.
