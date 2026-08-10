---
id: checkpoint2-feasibility/01
title: Free/near-zero-cost hosting + DB floor for a Docker self-host Next.js+Postgres app
label: wayfinder:research
status: closed
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

## Resolution

A genuine $0 floor is achievable at Checkpoint 1–2 scale, but only through
Oracle Cloud "Always Free" compute (2 OCPU/12GB RAM/200GB disk as of a June
2026 undocumented cut from 4/24) self-hosting both the Next.js and Postgres
Docker containers on one VM — sidestepping every third-party managed-DB
free-tier limit (pause, expiry, connection cap) entirely. The trade-off is
platform risk, not usage cost: Oracle has already silently shrunk this tier
once in 2026 and can terminate over-limit instances without warning. Fly.io
and Railway no longer offer real free tiers in 2026 (both floor around
$5–12/month); Render's free Postgres auto-deletes after 30 days regardless of
usage, making it unviable for a live deployment. If Oracle's platform risk is
unacceptable, Neon's free Postgres (0.5GB storage, 100 CU-hours/month, mandatory
5-min scale-to-zero) paired with any $0 compute (Oracle VM or Google Cloud
Run's real Always Free quota) is the next-best $0 combination. Once either
ceiling is exceeded, the realistic non-zero floor is ~$5–12/month
(compute + DB together), not a gradual scale-up from $0. Full findings and
sources: [`research/infra-cost-floor.md`](../research/infra-cost-floor.md).

## Addendum

A follow-up pass explicitly checked Oracle against AWS, Azure, GCP, and other
free-forever hosts and confirms the "use Oracle" conclusion rather than
overturning it. AWS and Azure's free compute/DB tiers are time-limited trials
(6–12 months, then silent auto-billing), not perpetual — Azure has no free
Postgres option at all, ever. GCP has two genuinely perpetual free pieces
(Cloud Run, e2-micro VM) but neither alone can self-host both the Next.js and
Postgres containers the way Oracle's single 12GB-RAM VM can; GCP's Cloud
Run + Neon free Postgres remains the legitimate fallback combo if Oracle's
platform risk becomes unacceptable. See
[`research/infra-cost-floor.md` § Addendum](../research/infra-cost-floor.md#addendum--awsazuregcpother-comparison-follow-up)
for the full comparison table and sources.
