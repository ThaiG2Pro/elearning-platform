---
label: wayfinder:map
title: Checkpoint 2+ Feasibility Map
status: closed
---

# Checkpoint 2+ Feasibility Map

## Destination

A feasibility verdict — with `VISION.md` §5.1/§6/§7/§9 and `ROADMAP.md`
Checkpoint 2–4 revised where warranted — on whether the zero-cost-launch
premise (BYOK-only AI, no self-produced/hosted content, free/self-host
deploy + free DB tier, no ads) is technically and economically sustainable,
and whether the resulting product's value proposition is strong enough to
earn real community adoption. **WP0, WP1, WP1.5, and WP1.6 (the core
product: auth, profiles, learning spaces, course management) are locked —
out of scope, not to be relitigated.**

## Notes

- **Domain**: SaaS infra economics (free-tier hosting/DB), LLM API economics
  (BYOK feasibility), community/market validation for niche self-learning
  tools.
- **Skills**: `/research` subagent isn't installed in this environment —
  research tickets use a general-purpose agent with WebSearch/WebFetch
  instead. `/grilling` and `/domain-modeling` aren't installed either —
  HITL tickets are a direct live conversation in their spirit (breadth
  first, then depth, name the decision precisely).
- **Standing preference — don't edit `VISION.md`/`ROADMAP.md` per ticket.**
  Land every decision on its own ticket first; one synthesis ticket at the
  end folds confirmed/changed conclusions back into the docs in one pass, so
  they don't thrash mid-map.
- **Already-answered "how", don't re-derive**: `docs/design/ai-personalization-economics.md`
  (AI cost-routing priority + data model) and `docs/design/ai-integration-plan.md`
  (AI technical integration; confirms deploy target is Docker/self-host, not
  Vercel serverless). This map is about whether the premises under those
  designs hold, not about re-deriving the designs themselves.

## Decisions so far

- [Free/near-zero-cost hosting + DB floor for a Docker self-host Next.js+Postgres app](tickets/01-infra-cost-floor-research.md) — a genuine $0 floor exists (Oracle Cloud Always Free, self-hosting app+DB on one VM) but carries platform risk (Oracle already shrank it once in 2026); the realistic non-zero floor once exceeded is ~$5–12/mo, not a gradual ramp.
- [Real-world BYOK LLM free-tier quotas (Gemini + alternatives)](tickets/02-llm-byok-quota-research.md) — Gemini's free tier is the best-fit BYOK option (only one with enough context+TPM for long transcripts) but not "always on"; visible rate-limit UX must be a required feature, not an edge case.
- [ToS/legal exposure of unofficial YouTube transcript extraction + blog scraping at planned scale](tickets/03-transcript-scraping-legal-research.md) — no legal action has ever targeted a transcript/scraping tool at this pattern of use; accepted, typical risk at Checkpoint 2–3 scale, no added mitigation needed now.
- [Comparable "structure wrapper around free content" products — real adoption/retention signal](tickets/04-comparable-products-research.md) — Class Central/roadmap.sh succeeded via their own content + SEO, not pure wrapping; plain "paste-a-playlist" wrapper tools plateau at hundreds of users with no breakout. The wrapper alone is likely necessary but not sufficient — Phase 1's small aligned group and the Phase 2 AI layer are probably load-bearing for retention, not optional polish.
- [Is the "zero-cost launch" premise actually achievable end-to-end?](tickets/05-zero-cost-premise-decision.md) — confirmed: $0 only through Checkpoint 0 (Oracle Always Free, founder-only); migrate to a stable ~$5–12/mo host the moment Checkpoint 1 opens to outside users, not gated on retention — `VISION.md` §5.1's free-to-users promise is unaffected, this is purely who funds infra and when.
- [Is BYOK-only default AI viable, or does SHARED_FREE need to become primary?](tickets/06-byok-default-ai-viability.md) — routing priority (BYOK → SHARED_FREE → paid → block) stays as designed; added a missing UX branch for when the platform-wide ~250 req/day SHARED_FREE quota runs dry ("add your own key or wait"), and flagged `VISION.md` §6's "BYOK is the default" wording as already stale vs. the real design.
- [Does the core value proposition need sharpening beyond "distraction-free wrapper"?](tickets/07-value-prop-differentiation.md) — decided: add a light "cùng học" (learning-together) visibility view to Checkpoint 1, reusing the already-modeled `forkedFromCourseId` lineage — proposed as a new WP1.7, flagged for explicit founder sign-off at synthesis since it's an addition to the locked WP1 set.
- [Do niche AI-feature tools undercut the Checkpoint 2 differentiation decided in ticket 07?](tickets/11-niche-ai-tool-competition-research.md) — Quizlet/Knowt/Wisdolia already generate quizzes from YouTube content at scale, free; the raw AI capability is a commodity, not novel. Bundling it inside the course/progress shell (no tab-switching) is a real but narrower differentiator. Weakens (doesn't invalidate) ticket 07's bet — formal amendment deferred to ticket 13.
- [Are Notex/PageLM viable to adopt/fork instead of building the bespoke Checkpoint 2 AI pipeline?](tickets/12-notex-pagelm-build-vs-adopt-research.md) — neither is viable: PageLM's license bans commercial/SaaS use outright; Notex is architecturally foreign (Go/SQLite/yt-dlp) with zero cost-routing concept, so adopting it would mean running a second stack *and* still building all the routing logic from scratch. No change to WP2.1–2.4 — proceed from-scratch as designed.
- [Does niche AI-tool competition require revising ticket 07's differentiation decision?](tickets/13-niche-competition-differentiation-revisit.md) — confirmed: narrow Checkpoint 2's AI to integration-only (the two default recipes bundled in the course shell, no feature-depth race vs. Quizlet/Knowt/Wisdolia) and promote WP1.7's "cùng học" view to the primary differentiation bet; ticket 07's resolution amended in place.
- [Should Checkpoint 2 adopt/fork Notex or PageLM instead of building the bespoke AI pipeline?](tickets/14-notex-pagelm-adopt-decision.md) — confirmed: proceed from-scratch per `ai-integration-plan.md`, but use both as reference implementations to cut trial-and-error — Notex (Apache-2.0) may be read and mined for code (yt-dlp fallback, prompts, transcript chunking); PageLM (restrictive license) is ideas-only, never copied. Adds one read-only prep sub-step to WP2.1.
- [Where do self-taught YouTube learners actually congregate, and how have comparable tools recruited them?](tickets/15-wedge-community-research.md) — the broad "self-taught devs" label has no home community; every comparable tool's first cohort came from a congregation the founder belonged to or a specific curriculum cohort. Research recommends a **VN-first wedge** ("người Việt tự học lập trình qua YouTube"): FB group "Tự học lập trình miễn phí" (~45k) + J2TEAM (~630k) first, seeded with 3–5 pre-built public courses from popular free YouTube curricula; go global (Show HN, r/learnprogramming Saturday thread) only after VN retention signal. Final wedge decision is ticket 08's.
- [How do zero-revenue indie tools realistically cover a small infra floor?](tickets/16-monetization-timing-research.md) — donations at <1000 users are noise ($0–5/mo expected; ~15% of GitHub Sponsors participants receive anything); a *passive* donate link from day one is costless (harm only comes from "help us survive" framing); paid-tier triggers converge on feature-pull (quota exhaustion, users asking to pay), not user counts; founder-funded $5–12/mo is common and sustainable for a CV project (pain starts ~$50/mo, which BYOK-default prevents). Research recommends keeping VISION §7 sequencing as-is. Final sequencing decision is ticket 09's.
- [Does monetization trigger sequencing need to move earlier?](tickets/09-monetization-trigger-timing.md) — confirmed: keep §7's sequencing; founder absorbs the ~$5–12/mo floor at Checkpoint 1–2 with a passive Ko-fi/GitHub Sponsors link live from day one ("support" framing, no subscription code); `PAID_TIER` stays gated on Checkpoint 3–4, triggered by feature-pull (quota exhaustion / users asking to pay), not user counts.
- [Is "self-taught devs via YouTube" the right wedge, and what's the reach-out plan?](tickets/08-wedge-community-validation.md) — confirmed: **VN-first wedge** ("người Việt tự học lập trình qua YouTube") replaces the broad label; seed FB "Tự học lập trình miễn phí" → J2TEAM → Viblo/VOZ, with 3–5 pre-built public courses as a **Checkpoint 1 deliverable** (not a GTM detail), and a **named VN retention number** in Checkpoint 2's success criteria gating any global outreach.
- [Fold confirmed/changed conclusions back into VISION.md and ROADMAP.md](tickets/10-revise-docs-synthesis.md) — done and founder-approved (WP1.7 signed off; global gate confirmed at ≥30% outside-user return in weeks 2–4, n≥30); merged via `wayfinder/checkpoint2-synthesis`. **Destination reached — map closed.**

## Not yet specified

- (none — all fog resolved into tickets; map closed 2026-08-10)

## Out of scope

- WP0 (auth/data-model pivot), WP1/WP1.5 (core product), WP1.6 (legacy
  enrollment cleanup) — already decided/shipped; kept as-is by founder
  directive. No ticket to close — they were never part of this map.

## Implementation status (post-close addendum, 2026-08-17)

This map's job was to de-risk Checkpoint 2 *before* writing code — it does
not itself contain code tasks, and stays closed. Recording here, for
traceability, that its conclusions have since been consumed: WP2.1–WP2.4
(data model, generation pipeline, learn-page UI panel, usage-alert script)
are implemented per `docs/ROADMAP.md`, following exactly the decisions
above (BYOK→SHARED_FREE→paid routing from ticket 06, from-scratch build
per ticket 14, integration-only AI scope per ticket 13, request-count
alerting per ticket 16/06). No new fog surfaced during implementation that
would warrant reopening a ticket here. Checkpoint 2 itself remains
un-opened to real users — that gate (ticket 08's named retention number)
is unrelated to this map's now-fully-spent feasibility work.
