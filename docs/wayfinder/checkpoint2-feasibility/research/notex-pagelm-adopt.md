# Notex / PageLM — Build vs. Adopt Research

> Resolves ticket 12
> (`docs/wayfinder/checkpoint2-feasibility/tickets/12-notex-pagelm-build-vs-adopt-research.md`).
> Compares against the from-scratch plan in `docs/design/ai-integration-plan.md`
> and the cost-routing model in `docs/design/ai-personalization-economics.md`.
> Researched 2026-08-10.

## Findings

### Notex — `smallnest/notex`

- **Repo**: https://github.com/smallnest/notex — verified this is the correct
  project (tagline "A privacy-first, open-source alternative to NotebookLM"),
  not to be confused with any similarly-named note apps.
- **License**: Apache 2.0 — permissive, commercial use and forking allowed.
- **Maturity**: very young and small. `created_at` 2026-01-02, last push
  2026-03-23 (~4.5 months stale as of 2026-08-10). 230 GitHub stars, only
  **2 contributors**, 9 open issues. Effectively a single-maintainer side
  project, not an actively-maintained OSS ecosystem.
- **Architecture/stack**: Go 1.23+ single binary (~25MB), local SQLite
  storage, server runs via `go run . -server` / compiled binary on port 8080.
  Optional external tools invoked as subprocesses: `yt-dlp` for YouTube/
  Bilibili subtitle extraction, `markitdown` for richer document conversion,
  `vosk-transcriber` for audio transcription. Frontend is server-rendered Go
  templates (not React/Next.js).
- **LLM support**: OpenAI-compatible API (incl. Azure OpenAI, DeepSeek via
  base-URL override) or local Ollama; optional Google Gemini key used only
  for infographic image generation ("Nano Banana"), not for text
  summarization/quiz. This is multi-provider/BYOK-*capable* in spirit (env
  var swap) but implemented as a single hardcoded provider selection per
  deployment, not a runtime per-user key abstraction.
- **Features confirmed**: file upload (PDF/TXT/MD/DOCX/HTML/audio), URL
  ingestion including YouTube/Bilibili (via `yt-dlp` subtitle extraction,
  added recently per commit `#18 support youtube/bilibili videos`,
  2026-03-06), AI chat over sources, and "transformations": summary, FAQ,
  study guide, outline, timeline, glossary, **quiz**, mindmap, infographic,
  podcast script.
- **No caching/multi-tenant concept**: it is a single-user local tool. There
  is no per-Source dedup, no shared-cache-by-recipe-hash notion, no concept
  of routing cost between "the platform's key" and "a user's own key" for
  many *different* users sharing one deployment — every install is assumed
  to be one person's own API key.
- Sources: https://github.com/smallnest/notex, README fetched via
  raw.githubusercontent.com/smallnest/notex/master/README.md, GitHub REST API
  (`api.github.com/repos/smallnest/notex`, `.../commits`).

### PageLM — `CaviraOSS/PageLM`

- **Repo**: https://github.com/CaviraOSS/PageLM — verified as the correct
  project ("PageLM is a community driven version of NotebookLM & a education
  platform").
- **License**: **not open-source in the OSI sense** — a bespoke "PageLM
  Community License" (GitHub reports it as `license: other / NOASSERTION`,
  meaning it does not match any standard OSI license and GitHub does not
  treat it as such). Full text confirms:
  - Grants use **only for "personal, educational, or non-commercial research
    purposes."**
  - **"Commercial Use" is explicitly defined to include SaaS offerings and
    any revenue model** (subscriptions, ads, etc.) and is prohibited without
    separate permission from the copyright holders.
  - **"Redistribution of the Software, in whole or in part, in source or
    binary form, is strictly prohibited"** without written permission —
    this bars public forking/republishing, not just commercial resale.
  - This is a **hard blocker** for this project: the elearning platform's
    own Vision doc plans a `PAID_TIER` monetization path
    (`ai-personalization-economics.md` §7), and even before that, self-
    hosting a SaaS product built on GPL/AGPL-adjacent-but-actually-stricter
    terms like this is legally risky. Forking or vendoring PageLM code would
    require the CaviraOSS maintainers' explicit written permission first.
- **Maturity**: more active than Notex — created 2025-08-31, last push
  2026-06-11 (~2 months stale as of 2026-08-10), 1,698 stars, **10
  contributors**, PR-driven workflow (recent merges from multiple external
  contributors), 3 open issues. Meaningfully more community activity than
  Notex, but still a young project (~1 year old) with a small core team.
- **Architecture/stack**: Node.js + TypeScript backend, LangChain/LangGraph
  for orchestration, Vite + React + TypeScript + TailwindCSS frontend,
  **JSON-file storage by default** (optional vector DB for embeddings/RAG),
  WebSocket-based real-time streaming for chat/generation. This is at least
  same-language (TS/Node) as this Next.js project, unlike Notex's Go stack —
  but it is a separate standalone full-stack app (its own Express-style/
  Node server + its own React SPA + its own storage layer), not a library or
  set of composable modules; there is no Prisma/Postgres integration, it
  uses flat JSON files as its "database" by default.
- **Features confirmed**: contextual chat over uploaded docs (PDF/DOCX/MD/
  TXT), Cornell-style "SmartNotes" summaries, flashcards, quizzes with hints/
  explanations, AI podcast generation, voice/lecture transcription, homework
  planning, exam simulation ("ExamLab"). **No YouTube transcript ingestion
  found** in the README/feature list — it's document/audio-upload-centric,
  not video-URL-centric like Notex or like this project's actual use case.
  Multi-provider LLM support is real and broad: Gemini, OpenAI, Claude, Grok,
  MiniMax, Ollama, OpenRouter, plus multiple embedding providers.
- **No cost-routing/caching model**: like Notex, it's architected as a
  single-tenant personal tool (one deployment, one set of provider keys in
  env vars) — no per-Source shared-cache, no BYOK-vs-shared-budget routing
  by user, no recipe/parameter-hash dedup concept.
- Sources: https://github.com/CaviraOSS/PageLM,
  https://api.github.com/repos/CaviraOSS/PageLM,
  https://api.github.com/repos/CaviraOSS/PageLM/license (LICENSE full text),
  https://api.github.com/repos/CaviraOSS/PageLM/commits.

## Verdict

**Neither Notex nor PageLM should be adopted or forked. The from-scratch plan
in `ai-integration-plan.md` remains the right call — and by a wide margin,
not a close one.**

1. **PageLM is disqualified on licensing alone.** Its Community License
   explicitly forbids commercial/SaaS use and forbids redistribution without
   the maintainers' written permission. This project's Vision already plans
   a `PAID_TIER` monetization path, so building on PageLM (even just vendoring
   a "transcript extraction" or "prompt recipe" snippet from it into a
   redistributed codebase) is a real legal exposure, not a theoretical one.
   This alone ends the "adopt/fork PageLM" branch of the question regardless
   of technical fit.

2. **Notex is technically incompatible at the stack level.** It's a Go
   binary with server-rendered templates and local SQLite, shelling out to
   `yt-dlp`/`vosk-transcriber` as external processes. There is nothing to
   "mount" into a Next.js/Prisma/Postgres `src/modules/` codebase — adopting
   it would mean running a second, foreign service (a Go process) alongside
   the Next.js app, which is a heavier and stranger deployment than the
   single new `src/modules/ai-generation/` folder the from-scratch plan
   calls for. Docker self-hosting doesn't rescue this: it just means two
   containers with two languages, two config systems, and two failure modes
   instead of one.

3. **Both tools are architected for the wrong problem: single-tenant, not
   multi-tenant-with-shared-cost-routing.** The entire point of
   `ai-personalization-economics.md` — `recipeHash`, `isDefaultRecipe`,
   `keySource: SHARED_FREE | BYOK | PAID_TIER`, the free-rider fix in §5, the
   per-Source unique-cache constraint — is a *multi-user cost-sharing* model.
   Neither Notex nor PageLM has any concept of "many users, one deployment,
   route cost by who owns the key and dedupe by content." Both assume one
   person's own API keys in `.env` for their own personal notebook. Adopting
   either would mean bolting this project's entire cost-routing design on
   top as new code anyway — none of that logic is reusable from either repo.
   The only thing genuinely reusable in principle is small, generic snippets
   (e.g. "how do you call `yt-dlp` to pull YouTube captions," a prompt
   template for a quiz) — not anything resembling "adopt the project."

4. **Effort comparison confirms it's not close.** The from-scratch minimal
   slice in `ai-integration-plan.md`'s "Tóm tắt việc làm trước" is already
   scoped small: one `Source`/`AIGeneration` Prisma model (additive), one
   `TranscriptProvider` impl (`youtube-transcript-plus`), one `LLMProvider`
   impl (`GeminiProvider` via `@google/genai`), one enqueue route, one
   rate-limit check. Integrating Notex would mean: stand up a second runtime,
   design an API/webhook bridge between the Go process and Next.js, still
   write the entire `AIGenerationPolicy`/cost-routing/`recipeHash` layer from
   scratch on this side (Notex has none of it), and still need a
   `TranscriptProvider`-equivalent adapter to pull results back out of Notex's
   SQLite into this app's Postgres. That is strictly *more* code and *more*
   moving parts than the from-scratch plan, not less — the "adopt" path is
   the harder path here, not a shortcut.

5. **What's worth reusing, narrowly**: Notex's README/commit history is a
   useful pointer that `yt-dlp`-based subtitle extraction is a viable
   fallback path if `youtube-transcript-plus`/`youtubei.js` break (both
   already flagged as unofficial/breakage-prone in `ai-integration-plan.md`
   §1) — but that's a note for future risk mitigation, not a reason to adopt
   the project. Nothing from PageLM is safely reusable given its license.

**Recommendation for WP2.1–2.4: no change to the technical plan.** Proceed
exactly with the from-scratch design in `ai-integration-plan.md` —
`Source`/`AIGeneration` models, `TranscriptProvider` (youtube-transcript-plus
first, `yt-dlp` subprocess as a documented fallback option if the library
breaks), `LLMProvider`/`GeminiProvider`, the enqueue route, and the
rate-limit check — inside `src/modules/ai-generation/` following the existing
`src/modules/course-management/` pattern.
