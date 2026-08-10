---
id: checkpoint2-feasibility/13
title: Does niche AI-tool competition require revising ticket 07's differentiation decision?
label: wayfinder:grilling
status: closed
assignee: claude
blocked_by: [checkpoint2-feasibility/11]
---

## Question

Given [ticket 11](11-niche-ai-tool-competition-research.md)'s findings on
Quizlet/Knowt/Wisdolia, Napkin.ai/GitMind/Whimsical AI, and
Monica.im/SciSpace, does [ticket 07](07-value-prop-differentiation.md)'s
decision (WP1.7 social primitive + Checkpoint 2 AI layer as the
differentiation strategy) still hold, or does it need revision — e.g.
scoping Checkpoint 2's AI features narrower/differently to avoid
duplicating what a self-learner can already get from a dedicated
free/cheap niche tool? Decide, and if ticket 07's resolution needs
amending, amend it directly rather than leaving two contradictory
decisions on the map.

## Resolution

**Decided (founder-confirmed): ticket 07's strategy holds but its emphasis
shifts — narrow Checkpoint 2's AI ambition to "integration-only" and lean
harder on WP1.7 as the primary differentiator.** Ticket 11 showed the raw
AI capabilities (quiz-from-YouTube, summaries, flashcards) are a free
commodity — Quizlet/Knowt/Wisdolia already do them at scale — so the
platform cannot win on AI feature depth or quality, and should not try.

Concretely, this means for Checkpoint 2:

- **AI scope stays at the two default recipes** (summary + quiz) already in
  `ai-integration-plan.md` — no expansion into mind-maps, flashcards,
  chat-with-source, podcast-style audio, or other NotebookLM-adjacent
  features. Those are explicitly out of scope for WP2.x; a self-learner who
  wants them can use the dedicated niche tools.
- **The differentiation claim is the bundling, not the AI**: generations
  live inside the course/progress/notes shell (no tab-switching, results
  attached to the lesson they came from, shareable along `forkedFromCourseId`
  lineage per `ai-personalization-economics.md`). That is the only AI-related
  advantage worth stating in `VISION.md`.
- **WP1.7 ("cùng học" companions view, ticket 07) is promoted from
  "additional hedge" to the primary retention/differentiation bet** — it's
  the one mechanic none of the niche AI tools or wrapper products offer.

Ticket 07's resolution has been amended in place (see its "Amended by
ticket 13" section) so the map carries one consistent decision. The
synthesis ticket (10) should reflect this in `VISION.md` §6/§7 (AI framed
as integrated convenience, not capability moat) and keep `ROADMAP.md`
WP2.x scoped to the minimal slice.
