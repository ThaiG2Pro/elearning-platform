---
id: checkpoint2-feasibility/01
title: Free/near-zero-cost hosting + DB floor for a Docker self-host Next.js+Postgres app
label: wayfinder:research
status: open
assignee: null
blocked_by: []
---

## Question

The app's confirmed deploy target is Docker/self-host (not Vercel
serverless — see `docs/design/ai-integration-plan.md`), with a Postgres DB.
What real free or near-zero-cost hosting + DB options exist today (e.g.
Fly.io, Oracle Cloud Free Tier, Railway, Render, Neon, Supabase) that could
run this app through Checkpoint 1–2 scale (dozens to low hundreds of
users)? What are their actual limits (compute, storage, egress,
sleep/cold-start behavior, connection caps) and at what user/usage scale
does each stop being free? Is a genuinely $0 floor achievable, or is there
an unavoidable minimum cost — and if so, roughly how much?
