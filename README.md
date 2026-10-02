# Spacely

*[English](README.en.md)*

**Dán một link YouTube, có ngay một chỗ để học nó nghiêm túc.**
Ghi chú theo mốc thời gian, quiz tự kiểm tra (AI soạn từ chính video), tiến độ tự lưu, chia sẻ hoặc sao chép Space của người khác.

[![CI](https://github.com/ThaiG2Pro/elearning-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ThaiG2Pro/elearning-platform/actions/workflows/ci.yml)
![Next.js 14](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748) ![tests](https://img.shields.io/badge/tests-387%20passing-brightgreen)

<p align="center">
  <img src="docs/screenshots/home.png" alt="Trang chủ: dán link YouTube, 58 Space tuyển chọn" width="820">
</p>
<p align="center">
  <img src="docs/screenshots/learn.png" alt="Màn hình học: video, danh sách bài, ghi chú, tiến độ" width="400">
  <img src="docs/screenshots/support-chat.png" alt="Widget CSKH: AI trả lời có dẫn nguồn, luôn có lối sang người thật" width="400">
</p>

> Vì sao có sản phẩm này: kiến thức miễn phí trên YouTube không thiếu, thiếu là một chỗ để học nó mà không bị autoplay, gợi ý và quảng cáo kéo đi. Tôi làm cho chính mình học trước và vẫn dùng mỗi ngày. Chi tiết: [`docs/VISION.md`](docs/VISION.md).

## Người dùng làm được gì

| | |
|---|---|
| **Tạo Space từ 1 link** | Dán link YouTube ở trang chủ → có Space với tiêu đề, ảnh bìa; sắp thành chương / bài học. |
| **Học tập trung** | Chế độ tập trung ẩn mọi thứ ngoài bài đang xem; vị trí xem tự lưu; ghi chú gắn vào đúng giây, bấm là tua lại. |
| **Quiz** | Tự soạn (tải file) hoặc **AI tạo quiz từ transcript video**; chấm khi nộp, bài dở giữ tạm trên máy nếu mất mạng. |
| **Tiến độ** | Mục *Đang học* ở trang chủ, trang *Học tiếp* với % hoàn thành thật, lọc chưa học / đang học / xong. |
| **Chia sẻ & sao chép** | Link chia sẻ xem không cần tài khoản; *Sao chép về học* để có bản riêng; ai sao chép cùng Space thấy tiến độ của nhau (*Cùng học*). |
| **Khám phá** | 58 playlist tuyển chọn xếp theo lượt xem YouTube (`/spaces/tuyen-chon`), trang chủ gợi ý theo hoạt động thật. |
| **Credit & thanh toán** | AI theo cấu hình chuẩn miễn phí có hạn mức ngày; tuỳ biến thì dùng API key riêng hoặc mua credit qua Stripe. |
| **Trợ lý CSKH** | Widget chat: menu FAQ tĩnh + gõ tự do → AI agent thật (RAG trên FAQ/guide/about, có ngưỡng tự tin, luôn có lối sang người thật). |
| **Dữ liệu là của bạn** | Xuất toàn bộ hồ sơ/Space/tiến độ/ghi chú ra JSON; xoá tài khoản là xoá thật; không quảng cáo. |

## Chạy thử trong 5 phút

Cần Node LTS (`mise install`), pnpm (`corepack enable pnpm`), Docker.

```bash
pnpm install
cp .env.example .env
# sửa 2 dòng trong .env cho Postgres của docker compose:
#   DATABASE_URL="postgresql://elearning_user:elearning_pass@localhost:15432/elearning"
#   JWT_SECRET=<chuỗi ngẫu nhiên bất kỳ>
docker compose up -d db         # Postgres :15432
pnpm prisma migrate deploy
pnpm seed:showcase              # 5 Space mẫu, không cần key gì
pnpm dev                        # http://localhost:3000
```

Muốn đủ 58 playlist tuyển chọn như ảnh: lấy `YOUTUBE_API_KEY` (Google Cloud, miễn phí) vào `.env` rồi `pnpm seed:launch` (idempotent: showcase + 58 playlist + social proof). Không cần key AI để chạy: tính năng AI và widget tự tắt khi thiếu biến môi trường. Muốn bật AI tạo quiz: `docker compose up -d litellm` + `GROQ_API_KEY` (xem `.env.example`). Chi tiết lệnh, seed, quy ước: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md). Ảnh trong README chụp bằng `scripts/screenshots.mjs`.

## Kiến trúc

```mermaid
flowchart LR
    B[Browser<br/>Next.js App Router pages] --> API[/api/v1 route handlers/]
    API --> M[modules: auth · space-management<br/>ai-generation · billing · data-retention<br/>controller → service → domain policy → repository]
    M --> P[(PostgreSQL<br/>Prisma)]
    M -->|transcript → quiz| L[LiteLLM proxy<br/>Groq / OpenAI / self-host]
    M -->|checkout, webhook| S[Stripe]
    M -->|oEmbed, Data API| Y[YouTube]
    API -->|/support/chat proxy| A[ai-agent-sale-v2<br/>FastAPI · LangGraph · pgvector]
```

- **Modular monolith theo DDD**: mỗi module có `domain/` chứa policy thuần (không I/O) và được unit test riêng, ví dụ `AIGenerationPolicy`, `CreditLedger`, `AccessControlPolicy`, `ProgressPolicy`.
- **AI tạo quiz**: transcript video → LiteLLM (alias model, fallback) → quiz; hash "recipe" để không trả tiền hai lần cho cùng yêu cầu; hạn mức theo ngày (user + toàn hệ thống) và theo độ dài transcript; nội dung AI tạo riêng của chủ Space không đi theo bản sao.
- **Credit ledger + Stripe**: 3 gói cố định, webhook idempotent theo `metadata.packageId`, clawback khi refund/dispute, job đối soát credit đang treo.
- **Trợ lý CSKH**: widget gọi `POST /api/v1/support/chat` (rate-limit IP + người, cookie ẩn danh, key agent giữ ở server) → graph CSKH riêng trong [ai-agent-sale-v2](https://github.com/ThaiG2Pro/ai-agent-sale-v2) (`support_graph`: router 4 intent → RAG → confidence gating → groundedness check; eval gate 25 câu). Kho tri thức xuất từ chính `src/content/` của repo này qua `GET /api/v1/support/knowledge`, nên trang và bot không bao giờ lệch.
- **An toàn**: một điểm xác thực JWT, rate limit cho mọi endpoint tốn tài nguyên, chống SSRF khi fetch URL ngoài, giới hạn kích thước upload, OAuth state ký.

Chi tiết hơn: [`docs/ARCHITECTURE_NOTES.md`](docs/ARCHITECTURE_NOTES.md), [`docs/adr/`](docs/adr/), [`docs/README.md`](docs/README.md).

## Stack

Next.js 14 (App Router, TypeScript strict) · Tailwind + design system "ink" riêng · Prisma + PostgreSQL · LiteLLM · Stripe · Vitest (387 test) · Docker Compose, Caddy, Fly.io · GitHub Actions (typecheck, lint, audit, test, build).

## Giới hạn hiện tại

- Chỉ nhận link YouTube, mỗi lần một video (nguồn web/blog tạm ẩn).
- Rate limiter in-memory: đủ cho 1 instance, đổi sang Redis khi scale ngang.
- Chưa deploy public; checklist ở [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md).
