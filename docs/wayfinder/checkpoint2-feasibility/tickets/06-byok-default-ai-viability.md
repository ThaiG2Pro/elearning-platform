---
id: checkpoint2-feasibility/06
title: Is BYOK-only default AI viable, or does SHARED_FREE need to become primary?
label: wayfinder:grilling
status: open
assignee: null
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
