---
id: checkpoint2-feasibility/12
title: Are Notex/PageLM viable to adopt/fork instead of building the bespoke Checkpoint 2 AI pipeline?
label: wayfinder:research
status: open
assignee: null
blocked_by: []
---

## Question

`docs/design/ai-integration-plan.md` designs a from-scratch AI pipeline
(`TranscriptProvider`, `LLMProvider`/`GeminiProvider`,
`AIGenerationService`, etc.) for Checkpoint 2. The founder found two
open-source NotebookLM alternatives — **Notex** and **PageLM** — while
researching this space. For each: what is its actual license, maturity,
architecture, and feature set (transcript ingestion, summary/quiz
generation, BYOK support)? Could either be adopted wholesale, forked, or
mined for components (e.g. its transcript-extraction or prompt-recipe
code) to accelerate WP2.1–2.4, instead of building the pipeline described
in `ai-integration-plan.md` from scratch? What's the real integration cost
of bolting either onto this codebase (`src/modules/` pattern, Next.js,
Prisma/Postgres) vs. the cost already estimated for the from-scratch build?
Conclusion: does adopting/forking one of these change the technical plan
for Checkpoint 2, or does the from-scratch design remain the right call
(e.g. because of licensing, architecture mismatch, or the from-scratch
build being smaller than it looks)?
