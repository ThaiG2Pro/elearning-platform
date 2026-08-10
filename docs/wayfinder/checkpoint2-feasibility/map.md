---
label: wayfinder:map
title: Checkpoint 2+ Feasibility Map
status: open
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

_(none yet)_

## Not yet specified

- Exact shape of a revised AI/monetization design, if the zero-cost premise
  or the BYOK-only default breaks — depends on [Is the "zero-cost launch" premise actually achievable end-to-end?](tickets/05-zero-cost-premise-decision.md)
  and [Is BYOK-only default AI viable?](tickets/06-byok-default-ai-viability.md)
  landing first.
- Whether additional differentiators (social/community features,
  gamification) are needed beyond "distraction-free" — depends on
  [Does the value proposition need sharpening?](tickets/07-value-prop-differentiation.md)'s
  outcome.

## Out of scope

- WP0 (auth/data-model pivot), WP1/WP1.5 (core product), WP1.6 (legacy
  enrollment cleanup) — already decided/shipped; kept as-is by founder
  directive. No ticket to close — they were never part of this map.
