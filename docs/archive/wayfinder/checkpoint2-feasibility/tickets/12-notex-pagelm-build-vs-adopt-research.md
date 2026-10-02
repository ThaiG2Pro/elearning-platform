---
id: checkpoint2-feasibility/12
title: Are Notex/PageLM viable to adopt/fork instead of building the bespoke Checkpoint 2 AI pipeline?
label: wayfinder:research
status: closed
assignee: null
blocked_by: []
---

## Question

`docs/design/ai-integration-plan.md` designs a from-scratch AI pipeline
(`TranscriptProvider`, `LLMProvider`/`GeminiProvider`,
`AIGenerationService`, etc.) for Checkpoint 2. The founder found two
open-source NotebookLM alternatives — **Notex** and **PageLM** — while
researching this space. For each: what is its actual license, maturity,
architecture, and feature set (transcript ingestion, summary/quiz
generation, BYOK support)? Could either be adopted wholesale, forked, or
mined for components (e.g. its transcript-extraction or prompt-recipe
code) to accelerate WP2.1–2.4, instead of building the pipeline described
in `ai-integration-plan.md` from scratch? What's the real integration cost
of bolting either onto this codebase (`src/modules/` pattern, Next.js,
Prisma/Postgres) vs. the cost already estimated for the from-scratch build?
Conclusion: does adopting/forking one of these change the technical plan
for Checkpoint 2, or does the from-scratch design remain the right call
(e.g. because of licensing, architecture mismatch, or the from-scratch
build being smaller than it looks)?

## Resolution

Neither is viable to adopt/fork. **PageLM** (`CaviraOSS/PageLM`, 1.7k stars,
10 contributors, Node/TS/React/LangChain stack, no YouTube ingestion) ships
under a bespoke "Community License" that explicitly bans commercial/SaaS use
and bans redistribution without the maintainers' written permission —
disqualifying given this project's planned `PAID_TIER` monetization. **Notex**
(`smallnest/notex`, Apache-2.0, but only 230 stars/2 contributors/~4.5mo
stale) is Apache-licensed but a Go single-binary local tool with server-
rendered templates, SQLite, and `yt-dlp` subprocess calls for YouTube —
architecturally foreign to this Next.js/Prisma/Postgres codebase, and it has
zero concept of the multi-tenant cost-routing model (`recipeHash`,
`keySource: SHARED_FREE|BYOK|PAID_TIER`) that
`ai-personalization-economics.md` requires; that logic would need to be
built from scratch regardless. Integrating either would mean running a
second foreign service/stack plus still writing all the cost-routing code —
strictly more work than the already-small from-scratch slice in
`ai-integration-plan.md`. Full findings and sources:
`docs/wayfinder/checkpoint2-feasibility/research/notex-pagelm-adopt.md`.
Recommendation: no change to the WP2.1–2.4 plan — proceed from scratch as
designed, optionally noting `yt-dlp` subprocess extraction as a fallback if
`youtube-transcript-plus` breaks.
