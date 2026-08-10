---
id: checkpoint2-feasibility/07
title: Does the core value proposition need sharpening beyond "distraction-free wrapper"?
label: wayfinder:grilling
status: closed
assignee: claude
blocked_by: [checkpoint2-feasibility/04]
---

## Question

Given [ticket 04](04-comparable-products-research.md)'s findings on
comparable products' adoption/retention, is "a serious-learning shell
around free content" (`VISION.md` §2) a strong enough standalone value
proposition, or does Checkpoint 2+ need an additional differentiator (e.g.
social/accountability features, AI depth, structured curricula/roadmaps) to
actually win against the real competitor (Notion + Sheets + willpower, per
`VISION.md` §3)? If a differentiator is needed, name it precisely enough to
scope into a checkpoint.

## Resolution

**Decided: add a light social/accountability primitive to Checkpoint 1,
rather than shipping the plain wrapper and waiting for a weak retention
signal to prove the gap exists.** Rationale: ticket 04 found the products
that stuck (Class Central, roadmap.sh) had some reinforcement loop, and the
ones that plateaued (plain playlist-wrappers) didn't; the current plan's
only social mechanic — WP1.4's share link — is one-way (someone clones your
course for themselves) with zero mutual visibility. Notion+Sheets+willpower
already loses on structure; it doesn't lose on "alone" — this product
currently doesn't beat it on that axis either.

**Named precisely enough to scope**: a "cùng học" (learning together) view
on any course reached via a share lineage — for a course with a
`shareToken`, show who else is learning the *same* source course (the
original owner + everyone who cloned it) and their progress %, read-only,
visible only within that lineage (not a public leaderboard). This reuses
data that's **already in the data model** —
`Course.forkedFromCourseId` (`ai-personalization-economics.md` §3) already
tracks share-clone lineage for AI-generation-sharing purposes; this just
adds a second read path over the same join (courses where
`forkedFromCourseId = X OR id = X`, joined with each owner's progress).
Default to visible (not opt-in) — Checkpoint 1's audience is a real-life
friend group, low privacy stakes, and visibility is the entire point.

**Deviation flagged for founder sign-off**: this proposes a **new WP1.7**
("Shared-course companions view") — the founder's instruction was to keep
WP0/1/1.5/1.6 as-is, so this addition needs explicit confirmation rather
than being folded in silently. Raise it plainly at synthesis time
(ticket 10) rather than assuming it's approved.

**Not decided here, left to ticket 09/10**: whether this is enough on its
own, or whether Checkpoint 2's AI layer is still additionally needed for
retention — ticket 04's finding was "the wrapper alone is likely
insufficient," not "a social loop alone is sufficient." Treat Checkpoint
1→2's retention signal as the real test of whether AI-depth is still needed
on top of this, not a redundant hedge to cut.
