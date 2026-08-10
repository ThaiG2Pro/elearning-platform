# Tầm Nhìn Sản Phẩm — [Tên nền tảng học tập cá nhân]

> Tài liệu này trả lời câu hỏi "chúng ta đang xây cái gì, và vì sao lại quyết định như vậy" — để cả team có chung một hình dung trước khi đi vào chi tiết triển khai. Plan triển khai kỹ thuật (schema, API, milestone) sẽ là tài liệu riêng, đi sau.

---

## 1. Câu chuyện khởi nguồn

YouTube chứa gần như mọi kiến thức trên đời, hoàn toàn miễn phí. Nhưng nó được đặt trong một **nền tảng giải trí**: autoplay, đề xuất video giật gân, không có khái niệm "tiến độ", "chương trình học", hay "đã học đến đâu". Kết quả: kiến thức có sẵn, nhưng người học không học hiệu quả — mở 1 video để học, 20 phút sau đang xem thứ khác.

Ý tưởng ban đầu rất đơn giản: **không cần tạo nội dung mới**, chỉ cần tạo ra một **nền tảng thiết kế riêng cho việc học** — nơi người dùng tự dán link video/bài viết free họ muốn học, và nền tảng lo phần còn lại: tổ chức thành khóa học có cấu trúc, tách khỏi môi trường giải trí, theo dõi tiến độ.

Ý tưởng này đã được **tự kiểm chứng bởi chính người sáng lập** — dùng thật, học thật, thấy hiệu quả hơn hẳn so với học trực tiếp trên YouTube. Đó là bằng chứng quan trọng nhất: sản phẩm giải quyết một nỗi đau có thật, không phải giả thuyết trên giấy.

---

## 2. Tầm nhìn

> **Một "lớp học tập nghiêm túc" bọc quanh kiến thức miễn phí sẵn có trên Internet — giúp bất kỳ ai tự học có kỷ luật, có cấu trúc, và không bị phân tâm — mà không cần ai phải tạo nội dung, và không cần ai phải trả tiền để bắt đầu.**

Ba chữ khóa cốt lõi: **miễn phí, có cấu trúc, không xao nhãng.**

---

## 3. Vì sao không đi theo lối mòn "LMS như Udemy" — và lí do

Thị trường LMS truyền thống (Udemy, Coursera, Teachable, LinkedIn Learning, Skillshare, Moodle, Docebo, Cornerstone...) đã rất chật. Nhưng phân tích kỹ thì tất cả các ông lớn đó thắng nhờ **content library + thương hiệu giảng viên + hiệu ứng mạng lưới nội dung** — không phải nhờ trải nghiệm học tốt hơn. Cạnh tranh trực diện bằng cách "làm giống họ nhưng nhỏ hơn" chắc chắn thua, vì:

- Không có catalog để hút người học đến trước
- Không có giảng viên có sẵn audience để hút nội dung chất lượng
- Feature (upload video, quiz, chứng chỉ) giờ là tiêu chuẩn tối thiểu, không phải lợi thế

**Quyết định:** không cạnh tranh ngang hàng với LMS. Định vị sản phẩm này thuộc một nhóm khác hẳn — gần với *Notion cho việc học*, *Class Central*, *roadmap.sh* — nơi giá trị không nằm ở "chúng tôi có khóa học gì" mà ở "chúng tôi giúp bạn học nội dung free bạn tự chọn tốt hơn."

**Hệ quả quan trọng:** đối thủ thực sự không phải Udemy. Đối thủ thực sự là **Notion + Google Sheet + ý chí tự học** — công cụ tạm bợ mà người tự học đang dùng để tự tổ chức link/tiến độ của họ. Đối thủ này yếu hơn nhiều, và đó là lý do một sản phẩm nhỏ, ít nguồn lực vẫn có cơ hội thắng.

---

## 4. Đối tượng người dùng & lộ trình mở rộng

Mở rộng theo từng vòng tròn nhỏ dần lớn, không nhảy thẳng lên "đại chúng":

| Giai đoạn | Đối tượng | Trạng thái |
|---|---|---|
| 0 | Chính người sáng lập | ✅ Đã xong — đã tự kiểm chứng hiệu quả |
| 1 | Một nhóm nhỏ, cùng chí hướng (bạn bè/đồng nghiệp tự học chung 1 kỹ năng) | Sắp tới |
| 2 | Cộng đồng hẹp: **người Việt tự học lập trình qua YouTube** (wedge VN-first) | Sau khi giai đoạn 1 có tín hiệu tốt |
| 3 | Mở rộng công khai (public, free) | Chỉ khi có bằng chứng retention thật ở giai đoạn 2 |

**Lí do đi từng bước nhỏ:** một audience quá rộng ("ai tự học cũng dùng được") không đo lường được, không lan truyền được, và không cho tín hiệu rõ ràng để ra quyết định tiếp theo. Một wedge hẹp, cụ thể, dễ đo hơn nhiều — và dễ lan truyền organic hơn (một cộng đồng cụ thể sẽ tự giới thiệu cho nhau).

**Vì sao wedge VN-first (quyết định 2026-08, xem `docs/wayfinder/checkpoint2-feasibility/`):**
nhãn rộng "self-taught devs" không có cộng đồng "nhà" nào trên thế giới, trong
khi wedge VN có cùng lúc 3 đặc tính không lựa chọn nào khác có: (1) chưa có
đối thủ cho đúng cơ chế này — F8/fullstack.edu.vn đã chứng minh "cấu trúc +
tiến độ trên video YouTube free" ở VN nhưng chỉ cho catalog của chính họ,
không cho playlist bất kỳ; (2) kênh tiếp cận thân thiện với "tôi vừa làm cái
này" (FB group, J2TEAM) thay vì ~61% subreddit tiếng Anh cấm self-promo;
(3) reach dày, đúng ngôn ngữ (~45k + ~630k chỉ trong 2 nhóm đầu). **Chỉ mở
kênh global (Show HN, Reddit) sau khi đạt mốc retention VN cụ thể ghi ở
`ROADMAP.md` Checkpoint 2 — đây là cổng thật, không phải hình thức.**

---

## 5. Nguyên tắc sản phẩm — những điều không đánh đổi

Đây là các "luật bất biến" giúp mọi quyết định tính năng sau này có cùng kim chỉ nam:

1. **Phần lõi (tổ chức link thành khóa học, học tập trung không xao nhãng, theo dõi tiến độ) miễn phí mãi mãi.** Đây chính là lý do sản phẩm này khác Udemy — thu phí nó là tự xóa bỏ lợi thế cạnh tranh duy nhất.
2. **Không quảng cáo.** Quảng cáo trực tiếp mâu thuẫn với lời hứa "distraction-free" — sản phẩm sẽ tự phản bội chính giá trị cốt lõi của nó.
3. **Không tự sản xuất nội dung.** Dùng lại nguồn free có sẵn (video, blog) — giữ chi phí vận hành gần bằng 0, đúng với tinh thần ban đầu ("không tốn công tạo content").
4. **Không xây hạ tầng doanh nghiệp trước khi có bằng chứng cần** — không multi-tenant, không sales team, không hợp đồng B2B ở giai đoạn này. Kiến trúc phức tạp này chỉ hợp lý nếu có tín hiệu nhu cầu doanh nghiệp thật, chưa phải bây giờ.

---

## 6. Tính năng AI — chiến lược & lí do (đã thu hẹp, 2026-08)

**Định vị (sửa sau nghiên cứu cạnh tranh, xem `docs/wayfinder/checkpoint2-feasibility/`):**
khả năng AI thô (sinh quiz từ YouTube, tóm tắt, flashcard) đã là **hàng
commodity miễn phí** — Quizlet/Knowt/Wisdolia làm ở quy mô lớn từ lâu. Sản
phẩm này **không cạnh tranh bằng độ sâu/độ rộng tính năng AI**, và không cố
trở thành NotebookLM. Lợi thế duy nhất đáng nói là **sự tích hợp**: kết quả
AI nằm ngay trong vỏ course/tiến độ/note (không phải chuyển tab sang tool
khác), gắn vào đúng bài học sinh ra nó, và chia sẻ được theo lineage course.

**Phạm vi AI ở Checkpoint 2 — chỉ 2 recipe mặc định:** tóm tắt + quiz cho
mỗi bài. **Không** mở rộng sang mindmap, flashcard, hỏi-đáp chat, hay audio
kiểu NotebookLM — người học cần các thứ đó cứ dùng tool chuyên miễn phí.
Đây là quyết định phạm vi, không phải giới hạn tạm thời.

**Vấn đề chi phí:** gọi AI (LLM) tốn chi phí API thật. Sản phẩm không có ngân sách để gánh chi phí này cho tất cả người dùng miễn phí, vô thời hạn.

**Quyết định (khớp thiết kế thật ở `ai-personalization-economics.md` mục 0):**
- **Mặc định không-cần-key: `SHARED_FREE`** — 2 recipe mặc định chạy trên
  key dùng chung của nền tảng, cache theo nguồn nên mỗi nguồn chỉ xử lý
  **một lần**, tái sử dụng cho mọi người. Quota chung có hạn (~250 req/ngày
  free tier); khi cạn, UX hiển thị rõ "thêm key của bạn hoặc chờ" — không
  âm thầm chặn.
- **BYOK (Bring Your Own Key) cho ai muốn hơn mặc định** — người dùng tự lấy
  API key miễn phí (vd Gemini free tier) và nhập vào app để tuỳ biến/không
  chịu quota chung. Thứ tự định tuyến chi phí: BYOK → SHARED_FREE (chỉ
  recipe mặc định) → PAID_TIER → chặn có thông báo.
- **AI là lớp tính năng thêm (add-on), không phải điều kiện để ra mắt core.** Core (tổ chức học tập, tiến độ) ra mắt trước và tự đứng vững một mình; AI đi sau, không chặn đường. **Lớp giữ chân chính là cơ chế "cùng học" (mục 9 / ROADMAP WP1.7), không phải AI.**

---

## 7. Chiến lược kiếm tiền

Tiền **không phải mục tiêu sống còn** của dự án này (khác hẳn tinh thần dự án "Udemy để bán khóa học"), nhưng để mở đường nếu có cơ hội tự nhiên:

**Nguyên tắc:** không thu phí phần core (mục 5.1). Chỉ thu phí phần **"dư dả thêm"**:
- Dùng AI vượt quota free tier dùng chung
- Không phải tự setup API key (trả tiền để "khỏi làm gì cả")
- Sync nhiều thiết bị, backup, xuất dữ liệu
- Gói nhóm/lớp học cho nhóm bạn bè học chung

**Khi nào bắt đầu thu phí — theo lực kéo tính năng (feature-pull), không theo số user hay theo lịch** (kiểm chứng bằng dữ liệu thật 2026-08, xem `docs/wayfinder/checkpoint2-feasibility/research/monetization-timing.md`):
1. Có retention thật (người dùng quay lại học tiếp đều đặn), **và**
2. Người dùng đụng giới hạn thật — quota AI dùng chung cạn thường xuyên,
   hoặc tự chủ động hỏi xin trả tiền/thêm giới hạn.

Số lượng user **không** là trigger: dưới vài trăm user retained, tier trả
phí chỉ mang lại vài chục $/tháng nhưng cộng thêm gánh vận hành
subscription/support — bật sớm để "bù chi phí hạ tầng" là tính sai.
Chi phí hạ tầng nền (~$5–12/tháng từ Checkpoint 1) do founder tự gánh —
bền vững vô thời hạn cho một dự án proof-of-work/CV; ngưỡng đau thực tế
(~$50/tháng do chi phí AI scale) đã được chặn bằng thiết kế BYOK-mặc-định
ở mục 6.

**Nút donate/ủng hộ: bật từ ngày đầu (Checkpoint 1), dạng thụ động.** Link
Ko-fi/GitHub Sponsors lặng lẽ, khung chữ trung tính kiểu "ủng hộ dự án" —
tuyệt đối không "giúp chúng tôi sống sót" (nghiên cứu cho thấy chỉ khung
chữ tuyệt vọng mới gây hại niềm tin). Không cần logic subscription. Kỳ vọng
thu về ở quy mô <1000 user là ~$0–5/tháng — đây là kênh tín hiệu
willingness-to-pay, không phải kênh bù chi phí.

---

## 8. Những gì chủ động KHÔNG làm (Non-goals)

Ghi rõ ra để tránh scope creep về sau:

- Không xây marketplace giảng viên (không cần ai "bán" khóa học trên nền tảng)
- Không xây multi-tenant / B2B enterprise ở giai đoạn này
- Không tự sản xuất nội dung học
- Không chạy đua tính năng với Udemy/Coursera/Docebo — so sánh feature-by-feature với họ là sai chuẩn, không phải mục tiêu

---

## 9. Đo lường thành công

Không đo bằng số lượt đăng ký. Đo bằng:
- **Retention:** % người quay lại học tiếp sau lần đầu
- **Completion:** % khóa học tự tạo được học hoàn chỉnh
- **Lan truyền tự nhiên:** người dùng tự chia sẻ link khóa học của họ cho người khác, không cần quảng cáo

Hai bổ sung (2026-08):
- **Cơ chế giữ chân chủ lực là "cùng học"** (thấy được ai đang học cùng
  course theo lineage share/clone — ROADMAP WP1.7): các sản phẩm wrapper
  thuần đều chững lại, còn các sản phẩm sống sót đều có một vòng lặp
  reinforcement xã hội. AI (mục 6) là tiện ích tích hợp, không phải cơ chế
  giữ chân.
- **Retention của wedge VN là con số gác cổng**: `ROADMAP.md` Checkpoint 2
  phải ghi một mốc retention VN cụ thể; chưa đạt mốc đó thì chưa mở kênh
  outreach global (mục 4).

---

## 10. Lộ trình theo giai đoạn (mức tầm nhìn, chưa chi tiết kỹ thuật)

| Phase | Trọng tâm | Điều kiện chuyển giai đoạn tiếp theo |
|---|---|---|
| **0 — Đã xong** | Core cá nhân: tạo khóa học từ link free, học tập trung, theo dõi tiến độ | Đã tự kiểm chứng hiệu quả |
| **1 — Mở nhóm nhỏ** | Chia sẻ cho nhóm bạn bè/cộng đồng hẹp dùng thử | Có người ngoài thật sự quay lại học tiếp (retention > 0 có ý nghĩa) |
| **2 — Thêm lớp AI** | Tích hợp hỏi-đáp/quiz/flashcard/mindmap qua BYOK + cache theo nguồn | AI thực sự được dùng, không phá vỡ ngân sách 0đ |
| **3 — Cân nhắc thu phí** | Mở tier trả phí cho phần "dư dả thêm", core vẫn free mãi mãi | Chạm 1 trong các tín hiệu ở mục 7 |
| **4 — Mở rộng công khai** | Ra mắt cho bất kỳ ai | Có bằng chứng retention + lan truyền ổn định ở quy mô nhỏ trước đó |

---

*Tài liệu này là kim chỉ nam định hướng — không phải cam kết deadline. Khi có tín hiệu mới (từ người dùng thật), tài liệu này nên được cập nhật lại, không phải bám cứng vào bản gốc.*

---

## Tài liệu kỹ thuật liên quan

Tài liệu này là nguồn sự thật duy nhất về hướng đi sản phẩm. Chi tiết kỹ thuật
triển khai theo hướng đi này nằm ở 2 file riêng (phải cập nhật theo nếu tài
liệu này thay đổi):

- `ARCHITECTURE_NOTES.md` — nợ kỹ thuật hiện tại, đối chiếu code hiện tại với
  hướng đi ở đây.
- `docs/design/ai-personalization-economics.md` — thiết kế chi tiết cho tính
  năng AI (mục 6) và chiến lược kiếm tiền (mục 7) ở trên.
- `docs/ROADMAP.md` — hiện thực hoá mục 4 và mục 10 ở trên thành checkpoint/WP
  quản lý được.
