---
id: checkpoint2-feasibility/05
title: Is the "zero-cost launch" premise (VISION.md §5.1/§7) actually achievable end-to-end?
label: wayfinder:grilling
status: closed
assignee: claude
blocked_by: [checkpoint2-feasibility/01, checkpoint2-feasibility/02]
---

## Question

Given the findings on hosting/DB cost floor
([ticket 01](01-infra-cost-floor-research.md)) and BYOK LLM quota reality
([ticket 02](02-llm-byok-quota-research.md)), decide: does `VISION.md`'s
"zero-cost to launch, free core forever" premise hold as stated, or does it
need revision — e.g. an acknowledged small unavoidable cost floor the
founder personally absorbs at small scale, a different hosting choice, or a
change to what "free" covers? If revision is needed, state the new premise
precisely enough to update `VISION.md` §5.1 and §7.

## Resolution

Confirmed with the founder: "zero-cost" was a design constraint to avoid
needing revenue before there's a usage signal, not a permanent hard
requirement — a small ~$5–12/mo floor is fine *once real users exist*, since
even unpaid users are worth more (validation, portfolio/CV proof) than the
cost, and losing that proof to an unannounced Oracle Free Tier shutdown
(ticket 01's platform-risk finding) would be worse than the money. Decision,
tied to the checkpoints already in `ROADMAP.md` (not a new gate):

- **Checkpoint 0 (founder-only)**: stay on Oracle Cloud Always Free — zero
  stakes if it breaks, only the founder is affected.
- **Checkpoint 1 onward (first external user)**: migrate off Oracle's
  free-but-fragile tier onto a stable ~$5–12/mo host (cheap VPS, or a paid
  Fly.io/Railway tier) **before** opening access, not after and not gated on
  a retention signal. The trigger is "a real external user is about to
  exist," not "retention is proven" — the whole point of that first user is
  proof that shouldn't be put at risk to save $10.

`VISION.md` §5.1 ("core free forever") is unaffected — that's a promise to
*users*, not a claim about the founder's own hosting spend, and nothing here
changes it. This does add one clarifying line worth folding into `VISION.md`
§7 at synthesis time (ticket 10): the "when to start charging *users*"
triggers in §7 are separate from, and shouldn't be confused with, this
"when the founder starts paying for infra" decision. Also worth folding into
`ROADMAP.md` as an explicit WP at synthesis time: "migrate hosting off Oracle
Free Tier onto the ~$5–12/mo floor before Checkpoint 1 opens to outside
users" — this is a task, not a further decision, so it doesn't get its own
wayfinder ticket.
