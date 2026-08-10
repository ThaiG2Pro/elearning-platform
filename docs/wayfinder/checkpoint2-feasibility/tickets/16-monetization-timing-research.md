---
id: checkpoint2-feasibility/16
title: How do zero-revenue indie tools realistically cover a small infra floor — donations, early paid tiers, or founder-funded?
label: wayfinder:research
status: closed
assignee: claude
blocked_by: []
---

## Question

[Ticket 05](05-zero-cost-premise-decision.md) established an unavoidable
~$5–12/mo infra floor from the moment Checkpoint 1 opens to outside
users. [Ticket 09](09-monetization-trigger-timing.md) must decide whether
`VISION.md` §7's monetization trigger sequencing (donate/paid-tier gated
on Checkpoint 3–4) should move earlier. Research the empirical base:

1. **Donation reality for small/indie dev-tool and learning projects in
   2024–2026** — actual conversion rates and monthly totals from GitHub
   Sponsors / Ko-fi / Buy Me a Coffee / Open Collective for projects with
   tens-to-hundreds of active users. Does a donate button at <1000 users
   realistically cover $5–12/mo, or is it noise?
2. **Timing effects** — is there evidence that adding a donate button
   "too early" harms trust/adoption for a free tool, or is that a myth?
   Conversely, does introducing payment options only after habits form
   convert better?
3. **Early paid-tier signal** — for freemium learning/productivity tools,
   what usage threshold (users, retention, or feature-pull like BYOK
   quota exhaustion) do indie founders typically use as the trigger to
   enable a paid tier, and what happens when it's enabled at very low
   user counts?
4. **The null option** — how common/sustainable is "founder eats
   $5–12/mo indefinitely as a CV project" (the founder has stated the
   project's proof-value matters more than revenue), and at what cost
   level do indie founders report that stops being tolerable?

Deliver findings specific enough that ticket 09 can pick a concrete
trigger sequencing (what goes live at Checkpoint 1/2 vs. stays gated on
Checkpoint 3–4).

## Resolution

Full findings with sources:
[research/monetization-timing.md](../research/monetization-timing.md).

1. **Donations at <1000 users are noise.** Only ~15% of GitHub Sponsors
   participants receive any sponsorship at all (arXiv 2604.03846);
   Ko-fi's average earning creator takes ~$270/yr and most take $0;
   representative small-project anecdote: 10k downloads over 4 years →
   $45 total. Expected value at Checkpoint 1–2 scale is $0–5/mo — it
   does not cover the $5–12/mo floor and must not be planned as if it
   could.
2. **Early donate button harming adoption is a myth for passive
   buttons** — donationware research finds harm only from "help us
   survive" framing, which signals the project may die. A quiet
   support link from day one is costless; copy matters, timing doesn't.
3. **Paid-tier trigger = feature-pull, not user count.** Indie practice
   converges on "users hit a real limit or ask to pay"; at 2–5%
   self-serve freemium conversion, a paid tier below a few hundred
   *retained* users yields tens of dollars/mo (Plausible: $64 MRR month
   one, 324 days to $400 MRR) while costing subscription/support
   overhead. Enabling early validates but doesn't fund.
4. **Founder-funded $5–12/mo is common and indefinitely sustainable**
   for a stated CV project; reported pain starts when usage-scaling
   costs (non-BYOK AI spend) push past ~$50/mo — which BYOK-default
   (ticket 06) prevents — or when maintenance load, not money, bites.

**Recommended sequencing for ticket 09**: keep VISION §7 as-is.
Checkpoint 1–2: founder absorbs the floor; passive donate link
(Ko-fi/GitHub Sponsors, 0% fee) live, "support" framing, no
subscription code. Checkpoint 3–4: paid tier stays gated on §7's
signals, concretely shared-AI-quota exhaustion or explicit
willingness-to-pay from retained users. Ticket 05's cost floor does
NOT justify pulling paid-tier readiness earlier.
