---
id: checkpoint2-feasibility/09
title: If the zero-cost premise breaks, does monetization trigger sequencing need to move earlier?
label: wayfinder:grilling
status: closed
assignee: claude
blocked_by: [checkpoint2-feasibility/05, checkpoint2-feasibility/16]
---

## Question

Given [ticket 05](05-zero-cost-premise-decision.md)'s verdict on the
zero-cost premise, does `VISION.md` §7's monetization trigger list still
make sense as the gate for `ROADMAP.md` Checkpoint 3–4, or does an
unavoidable cost floor mean donate/paid-tier readiness needs to be pulled
earlier (e.g. donate button live at Checkpoint 1–2 instead of Checkpoint 3,
or a lower threshold for enabling `PAID_TIER`)? Decide the revised
sequencing, if any.

## Resolution

**Decided (founder-confirmed): keep `VISION.md` §7's trigger sequencing
as-is, with one addition — a passive donate link goes live from day one.**
[Ticket 16](16-monetization-timing-research.md)'s research showed the
$5–12/mo floor from ticket 05 does NOT justify pulling monetization
earlier: donations at Checkpoint 1–2 scale are noise ($0–5/mo expected),
and a paid tier below a few hundred retained users yields tens of
dollars/mo while adding subscription/support overhead.

Concretely:

- **Checkpoint 1–2**: the founder absorbs the ~$5–12/mo infra floor
  (sustainable indefinitely per research; pain threshold is ~$50/mo,
  which the BYOK-default design from ticket 06 prevents). A quiet
  Ko-fi/GitHub Sponsors link (0% platform fee) is present with neutral
  "support" framing — never "help us survive" — with no subscription
  code built.
- **Checkpoint 3–4**: `PAID_TIER` stays gated on §7's signals, made
  concrete as feature-pull: shared-AI-quota exhaustion or retained users
  explicitly asking to pay — not a user-count threshold.

For the synthesis ticket (10): `VISION.md` §7 needs only the two small
amendments above (donate link timing made explicit as day-one; paid-tier
trigger reworded from signal list to feature-pull), no structural change.
