---
id: checkpoint2-feasibility/10
title: Fold confirmed/changed conclusions back into VISION.md and ROADMAP.md
label: wayfinder:task
status: closed
assignee: claude
blocked_by: [checkpoint2-feasibility/05, checkpoint2-feasibility/06, checkpoint2-feasibility/07, checkpoint2-feasibility/08, checkpoint2-feasibility/09, checkpoint2-feasibility/13, checkpoint2-feasibility/14]
---

## Question

Once tickets 05–09 and 13–14 are resolved, update `VISION.md` §5.1/§6/§7/§9
and `ROADMAP.md` Checkpoint 2–4 to reflect what was confirmed as-is vs. what
changed. This is the map's synthesis step — WP0/1/1.5/1.6 stay untouched.
Produce the diff and get founder sign-off before merging.

## Resolution

Done and founder-approved. Merged branch `wayfinder/checkpoint2-synthesis`
into `main` after explicit sign-off on the two items that were additions
rather than confirmations: **WP1.7 approved** into Checkpoint 1 (companions
view — the one deviation from the locked WP1 set), and the **global-outreach
gate confirmed at ≥30% outside-user return in weeks 2–4, n≥30**.

What changed where:

- `VISION.md` §4: VN-first wedge named + rationale + go-global gate.
- `VISION.md` §6: AI narrowed to integration-only (2 default recipes);
  stale "BYOK is the default" replaced with the real
  BYOK → SHARED_FREE → PAID_TIER routing + quota-exhaustion UX; "cùng
  học" named as the retention layer.
- `VISION.md` §7: feature-pull triggers (user count explicitly not a
  trigger); founder absorbs the ~$5–12/mo floor; passive day-one donate
  link with neutral framing.
- `VISION.md` §9: "cùng học" as primary retention mechanic; VN retention
  number as the global gate.
- `ROADMAP.md` Checkpoint 1: new WP1.7 (companions view), WP1.8 (hosting
  migration + donate link), WP1.9 (3–5 seed courses as deliverable).
- `ROADMAP.md` Checkpoint 2: VN wedge + outreach sequence; WP2.1
  Notex/PageLM reference step (Apache-2.0 code-minable vs. ideas-only);
  WP2.3 quota-exhaustion branch; WP2.4 request-count alerting; the
  confirmed ≥30%/n≥30 gate.
- `ROADMAP.md` Checkpoint 3: WP3.4 (donate) struck — moved to WP1.8;
  summary table updated.

WP0/WP1.1–1.6 untouched throughout, per the founder's standing directive.
This closes the map — all 16 tickets resolved.
