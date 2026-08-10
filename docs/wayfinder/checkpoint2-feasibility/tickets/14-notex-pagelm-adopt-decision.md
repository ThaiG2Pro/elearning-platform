---
id: checkpoint2-feasibility/14
title: Should Checkpoint 2 adopt/fork Notex or PageLM instead of building the bespoke AI pipeline?
label: wayfinder:grilling
status: closed
assignee: claude
blocked_by: [checkpoint2-feasibility/12]
---

## Question

Given [ticket 12](12-notex-pagelm-build-vs-adopt-research.md)'s findings,
decide: should WP2.1–2.4 adopt or fork Notex/PageLM (or mine specific
components from either), or does the from-scratch pipeline in
`docs/design/ai-integration-plan.md` remain the right call? If adopting
changes the plan, name precisely what changes in WP2.1–2.4 for the
synthesis ticket to fold in.

## Resolution

**Decided (founder-confirmed): proceed from-scratch per
`docs/design/ai-integration-plan.md` — do not adopt or fork Notex/PageLM —
but treat both as reference implementations to shorten the
code/debug/refactor cycle, not ignore them.** Ticket 12's disqualifiers
stand (PageLM's license bans commercial/SaaS use; Notex is an
architecturally foreign Go/SQLite stack with no cost-routing concept), and
the from-scratch slice is genuinely small: one additive Prisma migration
(`Source`/`AIGeneration`), one `TranscriptProvider` impl
(`youtube-transcript-plus`), one `LLMProvider`/`GeminiProvider` impl with
two fixed recipes, one enqueue route, one rate-limit check — a sixth
module in the same `domain/repositories/services/controllers` shape the
codebase already uses five times.

**How to use them as references (the founder's addition):**

- **Notex (Apache-2.0 — safe to read AND copy code from, with attribution):**
  mine its `yt-dlp`-based transcript extraction as the documented fallback
  for when `youtube-transcript-plus` breaks; crib its prompt wording for
  summary/quiz generation as a starting point for the two default recipes;
  study its chunking/segmenting of long transcripts before writing our own.
- **PageLM (Community License — ideas only, NEVER copy code):** its license
  bans commercial use and redistribution, so it may only be studied for
  design decisions — how it structures quiz-generation prompts and output
  schemas, its LangChain pipeline shapes — and any influence must be
  re-implemented independently, not ported.

**Change for the synthesis ticket (10) to fold in:** WP2.1–2.4 scope is
unchanged, but add one preparatory sub-step to WP2.1: "review Notex's
transcript-extraction + prompt code (Apache-2.0) and PageLM's prompt/output
design (read-only) before implementing `TranscriptProvider` and the default
recipes" — a bounded half-day of reading intended to skip a
trial-and-error cycle on prompts and transcript edge cases.
