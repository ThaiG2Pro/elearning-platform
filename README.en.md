# Spacely

*[Tiếng Việt](README.md)*

**Paste a YouTube link and get a place to actually learn it.**
Timestamped notes, self-check quizzes (AI-generated from the video itself), progress that saves itself, and Spaces you can share or copy from other learners.

[![CI](https://github.com/ThaiG2Pro/elearning-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ThaiG2Pro/elearning-platform/actions/workflows/ci.yml)
![Next.js 14](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748) ![tests](https://img.shields.io/badge/tests-387%20passing-brightgreen)

<p align="center">
  <img src="docs/screenshots/home.png" alt="Home: paste a YouTube link, 58 curated Spaces" width="820">
</p>
<p align="center">
  <img src="docs/screenshots/learn.png" alt="Learning screen: video, lesson list, notes, progress" width="400">
  <img src="docs/screenshots/support-chat.png" alt="Support widget: AI answers with sources, always a path to a human" width="400">
</p>

> Why this exists: free knowledge on YouTube is not the bottleneck; a place to learn it without autoplay, recommendations and ads pulling you away is. I built it for my own studying first and still use it daily. Details (Vietnamese): [`docs/VISION.md`](docs/VISION.md).

## What a user can do

| | |
|---|---|
| **Create a Space from one link** | Paste a YouTube link on the home page → a Space with title and cover; organise it into chapters / lessons. |
| **Focused learning** | Focus mode hides everything but the current lesson; playback position is saved automatically; notes are pinned to the exact second and seek on click. |
| **Quizzes** | Author your own (file upload) or let **AI generate a quiz from the video transcript**; graded on submit, drafts kept locally if the connection drops. |
| **Progress** | *Continue learning* on the home page, a *My learning* page with real completion %, filters for not started / in progress / done. |
| **Share & copy** | Share links work without an account; *Copy to learn* gives you your own editable copy; everyone who copied the same Space sees each other's progress (*Learning together*). |
| **Discover** | 58 curated playlists ranked by YouTube view count (`/spaces/tuyen-chon`); the home page recommends from real activity. |
| **Credits & payments** | Standard-configuration AI is free with a daily quota; customised generation uses your own API key or credits bought via Stripe. |
| **Support assistant** | Chat widget: static FAQ menu plus free-text → a real AI agent (RAG over FAQ/guide/about, confidence gating, always an exit to a human). |
| **Your data is yours** | Export your whole profile / Spaces / progress / notes as JSON; deleting the account really deletes; no ads. |

## Run it in 5 minutes

Requires Node LTS (`mise install`), pnpm (`corepack enable pnpm`) and Docker.

```bash
pnpm install
cp .env.example .env
# edit two lines in .env to point at the docker-compose Postgres:
#   DATABASE_URL="postgresql://elearning_user:elearning_pass@localhost:15432/elearning"
#   JWT_SECRET=<any random string>
docker compose up -d db         # Postgres on :15432
pnpm prisma migrate deploy
pnpm seed:showcase              # 5 sample Spaces, no keys required
pnpm dev                        # http://localhost:3000
```

For the full 58 curated playlists shown in the screenshots, put a free `YOUTUBE_API_KEY` (Google Cloud) in `.env` and run `pnpm seed:launch` (idempotent: showcase + 58 playlists + social proof). No AI keys are needed to run it: AI features and the widget switch themselves off when their environment variables are missing. To enable AI quiz generation: `docker compose up -d litellm` + `GROQ_API_KEY` (see `.env.example`). Commands, seeds and conventions: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md). The README screenshots are produced by `scripts/screenshots.mjs`.

## Architecture

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

- **Modular monolith, DDD-style**: every module has a `domain/` of pure policies (no I/O) with their own unit tests, e.g. `AIGenerationPolicy`, `CreditLedger`, `AccessControlPolicy`, `ProgressPolicy`.
- **AI quiz generation**: video transcript → LiteLLM (model aliases, fallback) → quiz; a "recipe" hash prevents paying twice for the same request; daily quotas (per user and system-wide) plus a transcript-length cap; AI content a Space owner paid for does not travel with copies.
- **Credit ledger + Stripe**: three fixed packages, webhook idempotent on `metadata.packageId`, clawback on refund/dispute, a reconciliation job for in-flight credits.
- **Support assistant**: the widget calls `POST /api/v1/support/chat` (per-IP and per-user rate limits, anonymous cookie identity, agent key kept server-side) → a dedicated support graph in [ai-agent-sale-v2](https://github.com/ThaiG2Pro/ai-agent-sale-v2) (`support_graph`: 4-intent router → RAG → confidence gating → groundedness check; 25-case eval gate). The knowledge base is exported from this repo's own `src/content/` via `GET /api/v1/support/knowledge`, so the pages and the bot never drift apart.
- **Safety**: a single JWT verification point, rate limits on every expensive endpoint, SSRF guard on outbound fetches, upload size limits, signed OAuth state.

More: [`docs/ARCHITECTURE_NOTES.md`](docs/ARCHITECTURE_NOTES.md), [`docs/adr/`](docs/adr/), [`docs/README.md`](docs/README.md) (Vietnamese).

## Stack

Next.js 14 (App Router, strict TypeScript) · Tailwind + an in-house "ink" design system · Prisma + PostgreSQL · LiteLLM · Stripe · Vitest (387 tests) · Docker Compose, Caddy, Fly.io · GitHub Actions (typecheck, lint, audit, test, build).

## Current limitations

- YouTube links only, one video at a time (web/blog sources are temporarily hidden).
- In-memory rate limiter: fine for one instance, swap for Redis when scaling horizontally.
- Not deployed publicly yet; checklist in [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md).
