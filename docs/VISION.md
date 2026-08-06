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
| 2 | Cộng đồng hẹp, có đặc điểm chung rõ ràng (ví dụ: người tự học lập trình qua YouTube free) | Sau khi giai đoạn 1 có tín hiệu tốt |
| 3 | Mở rộng công khai (public, free) | Chỉ khi có bằng chứng retention thật ở giai đoạn 2 |

**Lí do đi từng bước nhỏ:** một audience quá rộng ("ai tự học cũng dùng được") không đo lường được, không lan truyền được, và không cho tín hiệu rõ ràng để ra quyết định tiếp theo. Một wedge hẹp, cụ thể, dễ đo hơn nhiều — và dễ lan truyền organic hơn (một cộng đồng cụ thể sẽ tự giới thiệu cho nhau).

---

## 5. Nguyên tắc sản phẩm — những điều không đánh đổi

Đây là các "luật bất biến" giúp mọi quyết định tính năng sau này có cùng kim chỉ nam:

1. **Phần lõi (tổ chức link thành khóa học, học tập trung không xao nhãng, theo dõi tiến độ) miễn phí mãi mãi.** Đây chính là lý do sản phẩm này khác Udemy — thu phí nó là tự xóa bỏ lợi thế cạnh tranh duy nhất.
2. **Không quảng cáo.** Quảng cáo trực tiếp mâu thuẫn với lời hứa "distraction-free" — sản phẩm sẽ tự phản bội chính giá trị cốt lõi của nó.
3. **Không tự sản xuất nội dung.** Dùng lại nguồn free có sẵn (video, blog) — giữ chi phí vận hành gần bằng 0, đúng với tinh thần ban đầu ("không tốn công tạo content").
4. **Không xây hạ tầng doanh nghiệp trước khi có bằng chứng cần** — không multi-tenant, không sales team, không hợp đồng B2B ở giai đoạn này. Kiến trúc phức tạp này chỉ hợp lý nếu có tín hiệu nhu cầu doanh nghiệp thật, chưa phải bây giờ.

---

## 6. Tính năng AI (kiểu NotebookLM) — chiến lược & lí do

**Vì sao muốn có:** biến các nguồn (video, blog, link) người dùng thêm vào thành có thể hỏi-đáp, tự sinh quiz/flashcard, tóm tắt, mindmap — tăng chiều sâu học tập, giống trải nghiệm NotebookLM đang được nhiều nơi học theo và người dùng đã quen thuộc.

**Vấn đề:** các tính năng này cần gọi AI (LLM) liên tục — tốn chi phí API thật. Sản phẩm không có ngân sách để gánh chi phí này cho tất cả người dùng miễn phí, vô thời hạn.

**Quyết định:**
- **Mặc định: BYOK (Bring Your Own Key)** — người dùng tự lấy API key miễn phí (vd Gemini free tier) và nhập vào app. Chi phí AI do người dùng tự chịu (gần như 0đ với họ, và 0đ với sản phẩm) — bền vững vô thời hạn.
- **Tối ưu thêm: cache theo nguồn, không theo người dùng** — nếu nhiều người cùng thêm 1 video/blog phổ biến, chỉ xử lý AI **một lần** cho nguồn đó, tái sử dụng cho tất cả. Giảm chi phí thực tế đáng kể nếu sau này có key dùng chung.
- **AI là lớp tính năng thêm (add-on), không phải điều kiện để ra mắt core.** Core (tổ chức học tập, tiến độ) ra mắt trước và tự đứng vững một mình; AI đi sau, không chặn đường.

---

## 7. Chiến lược kiếm tiền

Tiền **không phải mục tiêu sống còn** của dự án này (khác hẳn tinh thần dự án "Udemy để bán khóa học"), nhưng để mở đường nếu có cơ hội tự nhiên:

**Nguyên tắc:** không thu phí phần core (mục 5.1). Chỉ thu phí phần **"dư dả thêm"**:
- Dùng AI vượt quota free tier dùng chung
- Không phải tự setup API key (trả tiền để "khỏi làm gì cả")
- Sync nhiều thiết bị, backup, xuất dữ liệu
- Gói nhóm/lớp học cho nhóm bạn bè học chung

**Khi nào bắt đầu thu phí — theo tín hiệu, không theo lịch:**
1. Có retention thật (người dùng quay lại học tiếp đều đặn)
2. Chi phí AI dùng chung bắt đầu chạm giới hạn thường xuyên
3. Người dùng tự chủ động hỏi xin thêm tính năng/giới hạn
4. Đủ quy mô người dùng để việc thu phí đáng công sức vận hành

**Bước đệm rủi ro thấp, có thể bật ngay:** nút donate/ủng hộ (không ép buộc, không cần logic subscription) — mở khả năng có thu nhập từ ngày đầu mà không ảnh hưởng trải nghiệm free.

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
