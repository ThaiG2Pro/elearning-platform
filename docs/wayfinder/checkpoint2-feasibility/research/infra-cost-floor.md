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

## Addendum — AWS/Azure/GCP/other comparison (follow-up)

The original research picked Oracle Cloud Always Free without directly
weighing it against AWS/Azure/GCP's own free tiers or other free-forever
hosts. This addendum closes that gap with 2026-current research
(WebSearch/WebFetch, not training data — these terms moved materially in
2025–2026).

### 1. AWS Free Tier (2026)

AWS restructured its free tier on **July 15, 2025**. There are now two
account generations with different rules:

- **Legacy accounts (created before 2025-07-15):** the classic 12-month free
  tier — 750 hrs/month of `t2.micro`/`t3.micro` EC2 (enough compute for this
  app), 750 hrs/month of `db.t2.micro`/`db.t3.micro`/`db.t4g.micro` RDS
  Postgres with 20GB storage — but **only for 12 months from account
  creation**, then it silently converts to standard pay-as-you-go pricing
  with **no automatic notification** (confirmed across multiple 2026 sources).
- **New accounts (created on/after 2025-07-15):** no time-based free tier at
  all. Instead a **$200 credit pool** (an automatic $100 + up to $100 more
  from 5 onboarding tasks) that both EC2 and RDS usage draw down against,
  expiring after **6 months or when the credits run out**, whichever is
  first.
- **Always Free (perpetual, not time-limited) services exist** but are
  narrow and don't cover this workload: Lambda, DynamoDB, SNS-class services.
  There is **no perpetually-free EC2 or RDS tier** on either account
  generation.
- New: **Aurora PostgreSQL Serverless** was added to the free tier in March
  2026 (up to 4 ACUs, 1GB storage) — but it draws from the same time-limited
  credit/12-month pool, not a new Always-Free bucket.
- Account creation requires a valid credit card plus phone verification;
  post-trial/post-credit billing starts automatically with no spend cap by
  default.

**Verdict: not viable as a $0-indefinitely option.** AWS is free for 6–12
months (depending on account vintage) and then bills automatically and
silently. It's a trial, not an always-free tier, for both EC2 and RDS.

### 2. Azure (2026)

- **Free VM compute is 12-months only:** 750 hrs/month of `B1S` burstable
  Linux/Windows VMs (enough to run two simultaneously), expiring one year
  after signup, then converting to paid with no default alert.
- **Azure Database for PostgreSQL (Flexible Server) has no free tier at
  all**, always-free or trial — it's pay-as-you-go from the start (Burstable
  tier is the cheapest SKU, not a free one). This is a materially worse
  starting position than AWS's RDS-for-12-months.
- **Always Free (perpetual) services** exist but again don't cover this
  workload: Azure Functions (1M executions/month), App Service F1 tier (which
  is a real container-adjacent option but shared/limited and not commonly
  used for a persistent Postgres-backed Next.js app), Cosmos DB free tier.
- New accounts get an additional **$200 credit for 30 days** on top of the
  12-month allowances. Azure has **no automatic spend cap** — overage bills
  immediately once free/credit limits are exceeded.

**Verdict: not viable.** Worse than AWS for this specific stack because there
is no free Postgres option at all, perpetual or trial — only free-for-12-months
compute.

### 3. Google Cloud Platform (2026, revisited)

- **Compute Engine Always Free (genuinely perpetual, not a trial):** one
  `e2-micro` VM instance (0.25 vCPU baseline / burst, 1GB RAM), restricted to
  three US regions (`us-west1`, `us-central1`, `us-east1`), plus 30GB-months
  of standard persistent disk and 1GB/month egress to most destinations. This
  is real and permanent — but 1GB RAM is tight for running both a Next.js
  container and a Postgres container on the same box; it's meaningfully
  smaller than Oracle's 12GB Always Free Ampere allocation. Workable only
  with a very lean setup (e.g. swap, or offloading the DB elsewhere) and 1GB
  egress/month is easy to blow through with real traffic.
- **Cloud SQL (managed Postgres): confirmed no Always Free tier**, consistent
  with the original research — it's billed pay-as-you-go from the start
  (starts around $7+/month for the smallest instance), with only a 30-day
  trial credit as any kind of "free" window.
- **Cloud Run Always Free (revisited):** 2M requests/month, 360,000 GB-seconds
  memory and 180,000 vCPU-seconds compute per month, scales to zero when idle
  — this remains genuinely perpetual and is a strong fit for the Next.js
  container specifically (not the DB). Because Cloud Run is stateless/serverless,
  it cannot also host a persistent Postgres container on the same
  free allocation — Postgres still has to live elsewhere (Neon/Supabase free
  tier, or a separate Always Free e2-micro VM).

**Verdict: GCP has two genuinely perpetual free options (e2-micro VM, Cloud
Run), but neither one is a complete $0 Docker Next.js+Postgres self-host by
itself** the way Oracle's single VM is — e2-micro is real but memory-starved
for both containers together, and Cloud Run can't hold the DB. GCP's best
role is as a *component* (free Next.js compute via Cloud Run, paired with
Neon free Postgres) rather than a single-box replacement for Oracle.

### 4. Other free-forever (not free-trial) providers for Docker+Postgres

- **Koyeb:** no longer has a free *compute* tier as of 2026 (Pro plan
  $29/mo required for web services); its free Postgres tier still exists but
  is dev-only (0.25 vCPU/1GB RAM, 1GB storage, 5 compute-hours/month) — not
  enough to pair with anything for a live app. Not viable.
- **Cloudflare Workers/Pages + D1:** genuinely perpetual free tier (100K
  requests/day, D1 at 5GB storage/5M row-reads-per-day) — but D1 is SQLite,
  not Postgres, and Workers isn't a Docker container runtime; this is a
  different architecture, not a drop-in for this app's confirmed
  Docker/Postgres self-host target. Not applicable without a rewrite.
  Cloudflare has since added Containers/Postgres-compatible Hyperdrive
  offerings but these are paid, not free-forever.
- **Deno Deploy:** edge JS/TS runtime, not a Docker host, and no bundled
  Postgres; doesn't fit this app's deploy target.
- **Fly.io, Railway, Render:** already covered above — no viable free-forever
  tier in 2026 for any of them.
- **DigitalOcean, Linode/Akamai, Vultr, Hetzner:** none offer an
  always-free compute tier comparable to Oracle/GCP's — only signup credits
  that expire (typically $100–200 over 30–60 days), after which billing is
  immediate. Not free-forever options.

**Verdict: no other provider in this survey offers a free-forever
Docker+Postgres-capable combination that beats or matches Oracle's single-VM
answer.** Cloudflare's D1 is the only other genuinely perpetual "free
database," but it's the wrong database engine for this app.

### 5. Comparison table

| Provider | Compute for this app | Perpetual, trial, or not viable | Managed Postgres free option | Perpetual, trial, or not viable | Catches |
|---|---|---|---|---|---|
| **Oracle Cloud** | Always Free Ampere A1: 2 OCPU/12GB RAM/200GB disk (self-host both containers on one VM) | **(a) Perpetual** | N/A — self-hosted in Docker on the same VM | N/A | Tier already shrunk once (unannounced, mid-2026); instances can be terminated if temporarily over new limits; "out of host capacity" errors common; no credit-card-free signup |
| **AWS** | 750 hrs/mo t2/t3.micro EC2 | **(b) Trial only** — 12mo (legacy accts) or 6mo/$200-credit (new accts, post-2025-07-15) | 750 hrs/mo db.t2/t3/t4g.micro RDS Postgres, 20GB | **(b) Trial only** — same 12mo/6mo window | Credit card + phone verification required; auto-converts to paid with **no default alert**; new-account model is credits-draw-down, not a parallel free allowance |
| **Azure** | 750 hrs/mo B1S VM | **(b) Trial only** — 12 months | None | **(c) Not viable** — no free tier at all for Azure DB for PostgreSQL, ever | No spend cap by default; free VM is fine for 1yr then bills automatically |
| **GCP** | e2-micro Always Free VM (1 vCPU-burst/1GB RAM, 3 US regions) *or* Cloud Run Always Free (2M req/mo, scales to zero) | **(a) Perpetual** (both options) | None (Cloud SQL has only a 30-day trial) | **(c) Not viable for managed Postgres** | e2-micro's 1GB RAM is too tight to comfortably run both containers together; Cloud Run can't host a stateful DB at all; 1GB/month egress on the VM tier is easy to exceed |
| **Neon** (paired with any free compute) | N/A (DB only) | — | 0.5GB storage, 100 CU-hrs/mo, forced scale-to-zero | **(a) Perpetual** | 5-min mandatory idle-to-zero cold start; hard 0.5GB storage ceiling |
| **Supabase** (paired with any free compute) | N/A (DB only) | — | 500MB storage, 60 direct conns | **(a) Perpetual** | Auto-pauses after 7 days idle; low connection cap |
| **Koyeb** | Pro plan required ($29/mo) for compute | **(c) Not viable** | 0.25vCPU/1GB/1GB, 5 compute-hrs/mo | **(c) Not viable for a live app** | Free DB tier is dev-only, too little compute-time to matter |
| **Cloudflare Workers/D1** | Workers (100K req/day) | **(a) Perpetual, but wrong runtime** (not Docker) | D1 (5GB, SQLite) | **(a) Perpetual, but wrong DB engine** (not Postgres) | Requires rewriting off Docker/Postgres — architecture mismatch, not a drop-in |
| **Deno Deploy** | Edge JS runtime | **(c) Not viable** for this stack | None bundled | **(c) Not viable** | Not a Docker host |
| **Fly.io / Railway / Render** | — | **(b)/(c)** — trial-only or unusable free (Render DB expires at 30 days) | — | **(b)/(c)** | Covered in main findings above; none is free-forever in 2026 |
| **DigitalOcean / Linode / Vultr / Hetzner** | — | **(b) Trial only** ($100–200 signup credit, 30–60 days) | — | **(c) Not viable** | Immediate billing once credit exhausted; no always-free compute tier |

### 6. Verdict: does this change the Oracle conclusion?

**No — it reinforces it, with one clarification worth adding to the record.**
Of every provider surveyed, **Oracle Cloud is the only one offering a
perpetual, non-time-limited free tier generous enough (12GB RAM, 200GB disk)
to self-host *both* the Next.js and Postgres Docker containers on a single
box.** AWS, Azure, and their RDS/VM free tiers are **trials, not
always-free** — 6–12 months, then automatic paid conversion, often without a
default warning. Azure is strictly worse than AWS here: it has no free
Postgres option at all, ever, not even a trial. GCP is the only other
genuinely perpetual free compute (e2-micro VM, Cloud Run), and Cloudflare
the only other genuinely perpetual free database (D1) — but neither pairs
into a complete $0 Docker Next.js+Postgres self-host the way Oracle's single
VM does: e2-micro's 1GB RAM can't comfortably hold both containers, Cloud Run
can't hold a stateful DB at all, and D1 is the wrong database engine
entirely. The honest caveat is that **GCP (Cloud Run + Neon free Postgres)**
is a legitimate, fully-perpetual alternative *combination* if Oracle's
platform risk (unannounced tier cuts, instance termination, capacity
shortages) becomes unacceptable — it was already named as the "next-best $0
combination" in the original research, and this follow-up confirms it's the
right second choice, not a second-best guess. But as a single-host, no
external-dependency answer, Oracle remains the best $0 option surveyed for
this specific Docker Next.js+Postgres workload.
