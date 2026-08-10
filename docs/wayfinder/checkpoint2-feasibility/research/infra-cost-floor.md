---
id: checkpoint2-feasibility/research/infra-cost-floor
title: Free / near-zero-cost hosting + Postgres floor for a Docker self-host Next.js app (2026)
related_ticket: checkpoint2-feasibility/01
researched: 2026-08-10
---

# Infra cost floor research

Context: confirmed deploy target is Docker/self-host (Next.js `output: standalone`
+ Postgres), not Vercel serverless (`docs/design/ai-integration-plan.md`). This
surveys real free/near-zero hosting + DB options as they stand **today (Aug 2026)**,
for Checkpoint 1–2 scale (dozens to low hundreds of users).

## Findings

### Compute / app hosting

**Fly.io — no more free tier.**
Fly.io removed its permanent free allowance in 2024. New accounts get a
time/usage-limited trial (~2 VM-hours or 7 days, ~$5 trial credit), then it's
pure usage billing. A minimal always-on `shared-cpu-1x` / 256MB machine runs
~$1.94–$2.02/month; anything realistic (1GB RAM machine) is ~$5.70/month, plus
storage/bandwidth on top. Not a $0 option anymore.
Sources: https://fly.io/docs/about/pricing/ , https://www.saaspricepulse.com/blog/flyio-free-tier-2026 , https://expresstech.io/7-fly-io-alternatives-in-2026-real-pricing-after-the-free-tier-died/

**Oracle Cloud "Always Free"— genuinely free compute, but shrinking and unannounced.**
As of a June 15, 2026 undocumented change, Always Free Ampere A1 (Arm) compute
was cut from 4 OCPU/24GB RAM to **2 OCPU / 12 GB RAM** total (still enough to
self-host Next.js + Postgres in Docker on one VM). Existing over-limit instances
were slated for termination from Aug 18, 2026 if not resized down — i.e. this
happened mid-flight with no announcement, only a docs update and a warning
email. Also included: up to 2 AMD "Micro" VMs (1/8 OCPU, 1GB RAM, 50Mbps) as a
fallback shape, 200GB block storage, 20GB object storage, 10TB/month egress —
all Always Free (not a trial), but restricted to your account's home region,
and capacity for new A1 instances is frequently unavailable ("out of host
capacity" errors are common and well-documented as a long-running complaint).
Grandfathering risk: if an over-limit instance is ever terminated (maintenance,
outage, mistake), it cannot be recreated above the new lower limit.
Sources: https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/ , https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm , https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm

**Render — free web service exists but is not viable for a live product.**
Free web service: 750 instance-hours/month, spins down after **15 minutes**
of no inbound traffic, cold start (spin-up) takes roughly 30–60 seconds
(Render's own docs say "about one minute") on the next request. That
cold-start hit lands on whichever user happens to load the app first after
idle — unacceptable UX for even a small live cohort, though fine for a
scratch/demo deploy. Free Postgres: 1GB storage cap, and — critically — the
whole free Postgres instance **expires and is deleted 30 days after creation**
(not just idles: it's gone, no auto-renew), so it cannot be a persistent DB
for a real deployment without manual recreation/migration every month.
Sources: https://render.com/docs/free , https://render.com/pricing , https://medium.com/@prajju.18gryphon/keep-your-render-free-apps-alive-24-7-41aa85d71256

**Railway — no real free tier since 2023; Hobby floor is $5/month.**
Railway's "free" plan is a one-time $5/30-day trial credit, after which
accounts move to a Free plan capped at 1 vCPU/0.5GB RAM/0.5GB storage and only
**$1/month** of credit — effectively unusable for an always-on app + DB. The
practical floor is the **Hobby plan at $5/month flat** (includes $5 usage
credit; a Next.js app + Postgres together typically consumes $6–12/month in
practice, so realistically $6–12/mo not $5).
Sources: https://railway.com/pricing , https://kuberns.com/blogs/railway-free-tier/ , https://www.buildmvpfast.com/tools/api-pricing-estimator/railway

**Google Cloud Run — real Always Free quota exists, but Cloud SQL doesn't have one.**
Cloud Run Always Free: 2M requests/month, 360k GB-seconds memory + 180k
vCPU-seconds compute — genuinely enough for dozens-to-low-hundreds of users
hitting a Next.js app intermittently, and Cloud Run scales to zero (so no cost
when idle) with sub-second-to-few-second cold starts (faster than Render).
However there is **no Always Free tier for Cloud SQL** (managed Postgres) —
only a 30-day trial of an 8vCPU/64GB instance, which is not a durable free DB.
Cloud Run compute + an external free Postgres (Neon/Supabase) is the workable
combination, not Cloud Run + Cloud SQL.
Sources: https://cloud.google.com/free , https://cloudchipr.com/blog/cloud-run-pricing

### Postgres hosting (separate from compute — the "BYO DB to any host" pattern)

**Neon — most generous durable-storage free tier, but scale-to-zero has cold starts and is mandatory.**
0.5GB storage/project, 100 CU-hours/month compute (≈400 hours at 0.25 CU),
autoscale up to 2 CU/8GB, **scale-to-zero after 5 minutes idle is forced and
cannot be disabled on Free** — so the DB itself has a cold-start penalty
(typically ~500ms–a few seconds to resume) on the first query after idle,
stacking with any app-side cold start if compute is also scaled down.
Direct Postgres connections: ~104 max (97 usable after reserving 7 for the
Neon superuser) on a 0.25 CU instance; the built-in PgBouncer pooler accepts
up to 10,000 client connections multiplexed down, which comfortably covers
low-hundreds of concurrent users if the app uses the pooled connection string
(`-pooler` host) rather than direct. 5GB egress/month included, 10 branches,
100 projects, 1-day monitoring retention, 1 manual snapshot.
Sources: https://neon.com/docs/introduction/plans , https://neon.com/docs/connect/connection-pooling , https://neon.com/faqs/managed-postgres-databases-free-tier

**Supabase — free Postgres + auth/storage bundle, but weekly auto-pause and low direct connection cap.**
500MB database storage, 1GB file storage, 5GB egress + 5GB cached egress,
50,000 MAU (irrelevant at this scale), capped at **2 active projects** per
account. Free projects **auto-pause after 7 days of inactivity** (not 5
minutes like Neon — friendlier for a low-traffic app, but pause means the next
request needs a manual/API resume, not an instant serverless wake, so an idle
week fully takes the app down until someone resumes it). Direct connections
capped at 60 (unusable without pooling past ~60 concurrent users); Supavisor
pooler adds ~200 more via session/transaction mode, each mode capped near 30
concurrent — workable for dozens-to-~100 users if pooled, tight at the top end
of "low hundreds."
Sources: https://supabase.com/pricing , https://www.itpathsolutions.com/supabase-free-tier-limits , https://github.com/orgs/supabase/discussions/22305

### Where each option stops being free (rough thresholds at this app's scale)

- **Oracle Always Free**: stops being free only if compute/storage needs exceed
  2 OCPU/12GB RAM/200GB disk — Checkpoint 1–2 scale (dozens–low hundreds of
  users, one Next.js container + Postgres container) fits comfortably inside
  that on a single VM. The real risk isn't usage-based cost, it's Oracle
  unilaterally cutting the tier further or an instance being terminated and
  unable to be recreated at the old size.
- **Neon free**: stops being free around ~400 always-warm compute-hours/month
  (100 CU-hours at 0.25 CU) — for an app with real traffic across a whole
  month without much idle-to-zero time, or once storage exceeds 0.5GB (a small
  Postgres DB for hundreds of users' link-organizer data plausibly stays under
  this for a while, but any user-uploaded content or heavy indexing pushes past
  it quickly).
- **Supabase free**: stops being free at 500MB DB storage or >60 concurrent
  unpooled connections; MAU/egress ceilings (50k MAU, 5GB) are far beyond this
  app's scale and not the binding constraint.
- **Render free**: effectively never "stays free" for a live product — the DB
  auto-deletes at 30 days regardless of usage, forcing either a paid DB
  ($7+/month Starter Postgres) or a monthly manual migration ritual.
- **Railway/Fly.io**: already cost money below Checkpoint 1 scale; not $0
  options at all in 2026.

## Verdict

A genuinely **$0** hosting+DB floor is achievable at Checkpoint 1–2 scale, but
only via a specific, somewhat fragile combination: **Oracle Cloud Always Free
compute (self-hosting the Docker Next.js container directly, bypassing the
"needs a managed Postgres" problem by running Postgres in a second container
on the same free VM) — no external DB service needed at all**, since the VM
itself has 12GB RAM and 200GB disk, comfortably enough for both containers at
this scale. This avoids every third-party free-tier connection cap, pause, and
expiry problem simultaneously, because there's no separate DB vendor.

If a managed/separate Postgres is preferred instead (e.g. to decouple DB
lifecycle from the compute host), **Neon free tier** paired with **any $0
compute** (Oracle Always Free VM, or Google Cloud Run's real Always Free
quota) is the next-best $0 combination, at the cost of accepting Neon's
mandatory 5-minute scale-to-zero cold start and a hard 0.5GB storage ceiling.

The unavoidable non-zero cost only appears when avoiding Oracle's platform
risk (silent Always-Free downgrades/instance-termination risk, documented as
already happening in 2026) or Neon's storage/compute ceiling: at that point
the realistic floor is Railway Hobby or a comparable low-end box at
**~$5–12/month all-in** (compute + DB together), not the $0–ish "toy" tiers of
Render (unusable for production due to 30-day DB expiry) or Fly.io/Railway
free trials (both already gone/converted to paid-by-default in 2026). So:
$0 is achievable and is the recommended starting point (Oracle Always Free,
single VM, both containers), but it carries platform/availability risk rather
than usage-based cost risk; the fallback once that risk is unacceptable is a
firm ~$5–12/month floor, not a gradual scale-up from $0.
