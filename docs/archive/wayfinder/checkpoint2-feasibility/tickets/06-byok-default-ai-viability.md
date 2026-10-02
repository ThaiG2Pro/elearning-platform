---
id: checkpoint2-feasibility/06
title: Is BYOK-only default AI viable, or does SHARED_FREE need to become primary?
label: wayfinder:grilling
status: closed
assignee: claude
blocked_by: [checkpoint2-feasibility/02]
---

## Question

Given real Gemini free-tier quota findings
([ticket 02](02-llm-byok-quota-research.md)), does the current design —
BYOK first, `SHARED_FREE` cache for the one default recipe, else
block-and-ask (`docs/design/ai-personalization-economics.md` §0/§4) — hold
up, or does the `SHARED_FREE` tier (funded by the founder/platform, not the
user) need to become the primary default instead of BYOK, changing the
cost-routing priority order? Decide the resulting priority order and any
changes needed to WP2.1–2.4 in `ROADMAP.md`.

## Resolution

**The cost-routing priority order stays as designed** — BYOK first (if the
user has a key), `SHARED_FREE` cache for the default recipe (no key
required), else paid/block. No architecture change needed there.

Two real gaps surfaced, both closed by decision (not by redesign):

1. **Doc-sync gap, not a design gap.** `VISION.md` §6 describes BYOK as the
   "mặc định" (default), but `ai-personalization-economics.md` §4 already
   built something more generous: a user with no key gets the default
   recipe free via `SHARED_FREE`, no key required — BYOK is only forced for
   *customized* recipes. `VISION.md`'s wording is stale relative to the
   actual design; fold the correction into `VISION.md` §6 at synthesis time
   (ticket 10).
2. **Missing UX branch for shared-quota exhaustion.** Ticket 02's finding
   that Gemini's free tier is ~250 requests/day is a **platform-wide**
   budget (one key, funded by the founder) — not per-user. A wedge
   community pasting distinct videos can exhaust it mid-day, and the
   current design (`ai-personalization-economics.md` §4) has no defined
   behavior for that case. Decided: when the platform-wide `SHARED_FREE`
   daily quota is exhausted, show the user an explicit message — *"today's
   free pool is used up — add your own free API key to continue now, or
   try again tomorrow"* — never a silent 429, never silent queueing.

**Changes needed to `ROADMAP.md`, folded at synthesis time (ticket 10):**
- **WP2.3** (UI for AI on course-items) needs this 5th UX branch added
  explicitly.
- **WP2.4** (AI cost alerting, already flagged mandatory before expanding
  community) must track **`SHARED_FREE` request-count against the daily
  quota**, not just $ cost — since the platform hits the request-count wall
  long before any dollar cost accrues on a free tier. This is the first
  metric that actually gates community growth, and it directly reinforces
  why `VISION.md` §4's narrow-wedge-first rollout matters: ~250 req/day is
  genuinely tight capacity, not a formality.
