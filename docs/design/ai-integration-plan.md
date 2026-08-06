# Kế Hoạch Kỹ Thuật Tích Hợp AI — Checkpoint 2

> **Tài liệu liên quan**: `docs/VISION.md` mục 6 (lý do), `docs/design/ai-personalization-economics.md`
> (đã quyết định kinh tế chi phí/data model — tài liệu này KHÔNG lặp lại, chỉ
> trả lời phần kỹ thuật "làm thế nào"), `docs/ROADMAP.md` Checkpoint 2.
> Ghi lại 2026-08-06. Xác nhận: **codebase hiện có 0 dòng code AI/LLM** (grep
> `gemini|openai|anthropic|transcript|llm` trên `src/` không ra kết quả liên
> quan; `package.json` không có dependency AI nào).

## ✅ Đã chốt: đích deploy = Docker/self-host

Repo có cả cấu hình Vercel (`vercel.json`) lẫn Docker
(`Dockerfile`/`docker-compose.yml`/`next.config.js: output: standalone`) —
**đã xác nhận đích deploy thật là Docker/self-host**, không phải Vercel
serverless. Hệ quả: **không bị giới hạn timeout cứng của serverless function**,
nên xử lý AI đồng bộ đơn giản hơn ở giai đoạn đầu là chấp nhận được — vẫn nên
giữ thiết kế enqueue nhẹ (mục 4) làm sẵn cho tương lai, nhưng không còn là
yêu cầu bắt buộc để né timeout như trường hợp Vercel.

## 1. Lấy transcript/nội dung từ Source

**YouTube** — 4 lựa chọn, khuyến nghị `youtube-transcript-plus` hoặc
`youtubei.js` cho MVP (lấy được cả auto-generated caption, khác YouTube Data
API chính thức chỉ tải được caption do chính chủ kênh upload — phần lớn video
giáo dục free không có caption chính chủ). Đây là loại thư viện unofficial,
rủi ro breakage khi Google đổi format — **bắt buộc cô lập sau 1 interface
`TranscriptProvider`** để đổi thư viện không đụng phần còn lại.

**Blog/web** (hoãn sang Checkpoint 3 theo Roadmap) — `@mozilla/readability` +
`jsdom`, miễn phí, đủ dùng cho MVP, không cần dịch vụ ngoài trả phí (khớp
nguyên tắc BYOK-first).

## 2. LLM cho recipe mặc định (SHARED_FREE)

**Gemini API qua `@google/genai`** (SDK hiện hành, thay `@google/generative-ai`
đã deprecated), model `gemini-2.5-flash`/`gemini-2.0-flash`. Free tier tồn
tại nhưng **số liệu quota dao động theo thời điểm/khu vực** — không hard-code
con số cụ thể, đọc lỗi 429/response header thực tế lúc runtime và tự đặt quota
nội bộ **thấp hơn** một khoảng an toàn so với giới hạn Google công bố.

BYOK không cần đổi kiến trúc: 1 interface `LLMProvider.generate(prompt, opts)`
duy nhất, `GeminiProvider` là implementation đầu tiên; BYOK chỉ khác ở API key
truyền vào — routing/cache/quota (đã thiết kế ở economics doc) chỉ quan tâm
`keySource`, không quan tâm provider cụ thể.

## 3. Kiến trúc trong codebase (theo pattern module hiện có)

```
src/modules/ai-generation/
  domain/
    RecipeHash.ts          — hash(type, params, segmentRange, modelVersion)
    AIGenerationPolicy.ts  — enforce ranh giới default/custom + routing keySource
  repositories/
    SourceRepository.ts
    AIGenerationRepository.ts   — unique(sourceId, recipeHash) khi SHARED_FREE
  services/
    TranscriptService.ts        — interface TranscriptProvider
    LLMProvider.ts (interface) + GeminiProvider.ts
    AIGenerationService.ts      — cache check → quota check → gọi LLM → lưu
  controllers/
    AIGenerationController.ts
```

**Route API tối thiểu:**
- `POST /api/v1/sources/:sourceId/ai-generations` — lazy-trigger (không auto
  khi thêm Source, đúng mục 6.1 economics doc)
- `GET /api/v1/sources/:sourceId/ai-generations?type=summary|quiz` — đọc cache

**Feature slice tối thiểu cho Checkpoint 2: chỉ tóm tắt + quiz mặc định.**
Hoãn flashcard/mindmap/chat — chat cần streaming + giữ session, phá vỡ tính
"1 request ngắn, cache 1 lần" mà toàn bộ mô hình `SHARED_FREE` dựa vào.

**Gắn vào data model có sẵn**: `CourseItem.aiGenerationId?` trỏ tới bản
`AIGeneration`. Route generate chỉ tạo `AIGeneration`; gán vào `CourseItem` là
bước UI riêng — giữ nguyên tắc "AI optional, lỗi không chặn học".

## 4. Rủi ro kỹ thuật cụ thể

- **Timeout không còn là rủi ro cứng** (đích deploy = Docker/self-host, không
  giới hạn function duration như serverless) — video dài → transcript dài vẫn
  tốn thời gian gọi Gemini, nhưng không bị nền tảng hosting cắt ngang.
- **Vẫn nên xử lý bất đồng bộ ở mức tối thiểu ngay từ Checkpoint 2** — không
  phải để né timeout, mà vì UX: gọi Gemini đồng bộ trong 1 request HTTP vẫn
  khiến người dùng chờ vài giây đến vài chục giây tuỳ độ dài transcript. Route
  `POST` nên enqueue nhẹ (lưu trạng thái `PENDING` trên `AIGeneration`, trả
  202 ngay), xử lý ngay trong cùng process (chưa cần queue engine riêng vì
  không bị áp lực timeout) rồi update trạng thái; UI poll đơn giản. Khớp
  nguyên tắc "generate chưa xong không chặn học" (WP2.3).
- **Streaming** (cho chat, hoãn sau): Next.js route handler hỗ trợ qua
  `ReadableStream`, Gemini SDK có `generateContentStream`. Không cần dựng
  ngay, nhưng thiết kế `LLMProvider` nên chừa sẵn method `generateStream()`.
- **Rate-limit cost-DoS** (mục 6.1 economics doc): đếm số Source mới được
  kích hoạt AI lần đầu theo `userId`/ngày ở tầng `AIGenerationPolicy`.
- **BYOK lỗi không fallback ngầm** (mục 6.2): catch lỗi Gemini riêng biệt cho
  nhánh BYOK, không dùng chung try/catch có thể rơi xuống `SHARED_FREE`.

## Tóm tắt việc làm trước (minimal slice)

1. `src/modules/ai-generation/` + `Source`/`AIGeneration` Prisma model
   (additive, không đổi bảng cũ).
2. `TranscriptProvider` + 1 impl `youtube-transcript-plus` (chỉ YouTube).
3. `LLMProvider` + `GeminiProvider` (`@google/genai`), 2 recipe cứng: tóm tắt
   mặc định + quiz 10 câu mặc định.
4. Route enqueue (không gọi đồng bộ) — né timeout mà chưa cần hạ tầng queue
   phức tạp.
5. Rate-limit theo user/ngày trước khi cho kích hoạt AI trên Source mới.
