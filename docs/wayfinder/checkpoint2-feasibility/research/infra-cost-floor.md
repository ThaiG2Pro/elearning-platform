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

## Addendum 2 — Additional providers (Supabase, CockroachDB, Vercel, PaaS options, etc.)

The founder asked for a wider sweep beyond AWS/Azure/GCP/Oracle/Fly.io/
Railway/Render/Neon/Koyeb/Cloudflare D1/Deno Deploy/DigitalOcean-Linode-Vultr-
Hetzner (all covered above). This section adds Supabase (detail beyond the
one paragraph already in the main Findings), CockroachDB Serverless, MongoDB
Atlas M0, Vercel Hobby, several newer PaaS options, and two hyperscaler
"Lite"/trial tiers — researched live (WebSearch, Aug 2026 terms), not from
training data.

### 1. Supabase — revisited in more depth

Confirms and extends the detail already in the main Findings section: **500MB
database storage**, 1GB file storage, 5GB egress, 50,000 MAU, capped at 2
active projects per account. **Free projects auto-pause after 7 days of
inactivity** — not a hard expiry, data is retained and the project can be
manually/API-resumed, but it goes fully offline until someone does so (no
instant serverless wake like Neon's scale-to-zero). No credit card is required
to sign up for the Free plan. This is **genuinely perpetual**, not a trial —
the catch is the pause-on-idle behavior and the 500MB/60-direct-connection
ceilings, not a time limit.
Classification: **(a) perpetual**, with catches (7-day pause-on-idle, 500MB
storage cap, 60 direct connections, 2-project cap).
Sources: https://www.itpathsolutions.com/supabase-free-tier-limits , https://supabase.com/pricing

### 2. CockroachDB Serverless (now "CockroachDB Basic") — Postgres-wire-compatible substitute

CockroachDB rebranded its Serverless tier to **"Basic"** in 2026 but the free
model is unchanged in substance: every CockroachDB Cloud organization gets
**$15/month of free resource consumption** (≈50 million Request Units + 10
GiB storage) on the Basic/Standard tiers, **recurring monthly, not a one-time
trial** — plus a separate **$400 one-time trial credit** for new orgs on top.
**No credit card required** to use the free allowance. If the RU quota is
exceeded mid-month, the cluster is throttled/disabled until the next billing
cycle or a limit increase; if storage exceeds 10GiB, writes fail until data is
deleted or the limit raised. CockroachDB is **Postgres-wire-compatible**
(speaks the `postgres://` protocol, works with standard Postgres drivers/ORMs
like Prisma with caveats around some Postgres-specific SQL features), so it
could genuinely substitute for Neon/Supabase as the managed-Postgres half of
the stack. 10GiB free storage is **20x** Neon's 0.5GB and Supabase's 500MB —
the most generous free managed-Postgres-compatible storage found in this
entire survey (original + both addenda).
Classification: **(a) perpetual free allowance** (not a trial — the $15/mo
credit renews every billing cycle indefinitely), with catches (RU-based
throttling rather than a hard connection cap, some Postgres SQL dialect gaps
as a CockroachDB-not-actually-Postgres engine, "distributed SQL" operational
quirks unfamiliar if the team has only run vanilla Postgres).
Sources: https://www.cockroachlabs.com/pricing/ , https://www.cockroachlabs.com/blog/serverless-free/ , https://www.cockroachlabs.com/docs/cockroachcloud/plan-your-cluster-basic

### 3. MongoDB Atlas free tier (M0) — out of scope, noted only for completeness

M0 is **512MB storage, shared RAM/vCPU, up to 500 connections, one cluster per
project, genuinely perpetual/free-forever** with no time limit. However this
app is Postgres-based (per the confirmed deploy target), and MongoDB is a
document store, not a relational/SQL engine — adopting it would mean
rewriting the data layer and ORM (e.g. dropping Prisma/Postgres for a Mongo
driver or Mongoose), not a drop-in substitution the way CockroachDB is. **Not
relevant as an alternative DB strategy for this research question** — flagged
only so the sweep is documented as complete, not because it competes with
Neon/Supabase/CockroachDB for this app.
Classification: **(c) not viable for this workload** (wrong database model,
not a free-tier limitation).
Sources: https://costbench.com/software/database-as-service/mongodb-atlas/free-plan/ , https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/

### 4. Vercel Hobby — excluded by design, noted for the record

Vercel Hobby (2026): 100GB Fast Data Transfer, 1M edge requests, 1M function
invocations, 4 CPU-hours, 360 GB-hours provisioned memory, 10-second max
function duration, 1 concurrent build — genuinely free/perpetual for
**personal, non-commercial use only** (explicit restriction in Vercel's
terms). This is **excluded from the provider comparison by design**, not
because it's a bad free tier: the project's confirmed deploy target is
Docker/self-host (`docs/design/ai-integration-plan.md`), and Vercel Hobby is
serverless-only — there is no way to run the app's own Docker container on
it, so it doesn't answer this research question regardless of price.
Vercel also **deprecated its own managed Postgres/KV in December 2024**;
existing databases were migrated to Neon (Postgres) and Upstash (Redis), and
today "Vercel Postgres" is just a thin integration layer in front of Neon's
own free tier (already covered in the main Findings — same 0.5GB/100 CU-hour
limits, no separate allowance). So even if Vercel Hobby were in scope, its
"Postgres" option doesn't add anything beyond Neon free that isn't already
counted.
Classification: **(c) not viable for this workload** (architecture mismatch —
no Docker/self-host path — not a free-tier generosity problem).
Sources: https://www.promptstoproduct.com/vercel-free-tier-limits , https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing

### 5. Newer container PaaS: Northflank, Zeabur, Sevalla, Qoddi

- **Northflank** — Sandbox (free) tier: **2 services, 1 database, 2 cron
  jobs, no credit card required, and no forced sleep/pause** on what is
  deployed (unlike Render/Zeabur). Northflank supports arbitrary Docker
  images (BYO container), which fits this app's deploy shape. However
  the free Sandbox tier's per-service compute allocation is small and not
  documented with precise vCPU/RAM numbers in available sources (the paid
  tier bills per-vCPU-hour/GB-hour on a Kubernetes requests/limits model);
  everything found suggests it's sized for a lightweight demo, not
  necessarily for a Next.js+Postgres pair sustaining "dozens to low hundreds
  of users" concurrently, but no source confirms it *can't* — this is a
  documentation gap, not a disqualifier. Its one included free database
  (unspecified engine/size in Sandbox tier docs found) could plausibly run
  Postgres.
  Classification: **(a) perpetual** (genuinely no time limit, no card), but
  with an unresourced/thin allocation that would need direct hands-on
  verification before relying on it — flagged as promising but unverified at
  the resource-sizing level.
  Sources: https://lowendtalk.com/discussion/181321/another-free-tier-northflank-small-containers , https://northflank.com/blog/best-cloud-hosting-platforms

- **Zeabur** — Free plan: **no credit card required, genuinely perpetual**,
  up to 1 vCPU/2GB memory per service, but **services auto-sleep after a
  period of inactivity** (wakes on next request, few-seconds cold start) —
  same shape as Render's problem, just a different vendor. No automated DB
  backups on free tier. Workable for a demo/low-traffic deploy, but the
  sleep-on-idle behavior reproduces the exact UX problem (cold start hits
  whichever user requests first) that disqualified Render above for a live
  product.
  Classification: **(a) perpetual but (c)-adjacent for "live product" use** —
  free-forever in principle, undermined by the same idle-sleep catch as
  Render.
  Sources: https://zeabur.com/docs/en-US/pricing/free-plan

- **Sevalla** — **No permanent free tier.** New accounts get $20–50 in
  one-time credit (sources disagree on exact amount, consistently describe
  it as valid ~2 months), then usage-based billing with no ongoing free
  allowance — structurally identical to Railway's now-dead "free tier"
  (i.e., a trial, not free-forever).
  Classification: **(b) trial only.**
  Sources: https://sevalla.com/pricing/ , https://sevalla.com/signup/

- **Qoddi** — Free tier is explicitly scoped to **"Dev Apps" for static
  sites/staging only** (3 free Dev Apps) plus unlimited "Essential apps"
  (database admin tools etc., not general-purpose app hosting). Despite
  supporting Docker/Postgres on paid tiers, the free tier as documented is
  not positioned for hosting a live containerized Next.js+Postgres app —
  it's a staging/testing allowance, closer to a demo sandbox than a
  production-capable free host.
  Classification: **(c) not viable for this workload** (free scope too
  narrow — static/staging only, not general container hosting).
  Sources: https://devcenter.qoddi.com/how-the-free-tier-is-calculated-on-qoddi/

### 6. IBM Cloud Lite and Alibaba Cloud free trial

- **IBM Cloud Lite** — genuinely **perpetual**: 40+ "Lite" plan products
  that never expire and can never be billed, renewing monthly on a
  usage-quota basis (separate from a one-time $200/30-day promotional
  credit for new signups). However, none of the Lite-plan products found in
  research are a general-purpose container/VM host or a managed Postgres
  service comparable to Oracle's Always Free compute or Neon/Supabase's free
  Postgres — IBM's perpetual free tier is oriented at specific managed
  services (Watson APIs, Cloudant, small object storage), not "run any
  Docker container" or "get a free Postgres instance."
  Classification: **(a) perpetual in principle, (c) not viable for this
  workload** — the always-free products don't include Docker compute or
  Postgres at a scope useful here.
  Sources: https://resourify.com/resources/ibm-cloud-free-tier

- **Alibaba Cloud** — free offerings are structured as **trials, not
  perpetual**: a 12-month free ECS (ranging 1-core/1GB to 2-core/2GB
  depending on tier) plus 80+ other trial-scoped services, alongside some
  narrow always-free quotas on unrelated services (not compute/Postgres).
  This is the same shape as AWS's legacy 12-month EC2/RDS tier — free for a
  year, then billing starts. No Alibaba-specific perpetual Postgres or
  general Docker-hosting free tier was found.
  Classification: **(b) trial only** (12 months, then billed).
  Sources: https://gofreetrial.co/service/alibaba-cloud , https://www.alibabacloud.com/blog/alibaba-cloud-free-trial-how-to-sign-up-and-get-started_598181

### 7. Comparison table — Addendum 2 providers

| Provider | What's free | Perpetual / trial / not viable | Catches |
|---|---|---|---|
| **Supabase** | 500MB Postgres, 1GB file storage, 2 projects | **(a) Perpetual** | Auto-pauses after 7 days idle; 60 direct connections |
| **CockroachDB Basic** (Postgres-wire-compatible) | $15/mo recurring free allowance ≈ 10GiB storage + 50M RU | **(a) Perpetual** | Distributed-SQL dialect gaps vs. real Postgres; RU throttling on overage |
| **MongoDB Atlas M0** | 512MB, free forever | **(a) Perpetual, but (c) not applicable** | Wrong DB model for a Postgres-based app — not a substitution candidate |
| **Vercel Hobby** | Generous serverless compute quota | **(c) Not viable** | Personal/non-commercial only; no Docker self-host path; "Vercel Postgres" = Neon free under the hood, adds nothing new |
| **Northflank** | 2 services, 1 DB, no forced sleep, no card | **(a) Perpetual** (unresourced) | Free-tier per-service compute size not documented; needs hands-on verification |
| **Zeabur** | 1 vCPU/2GB per service, no card | **(a) Perpetual, undermined by sleep** | Auto-sleeps after inactivity — same cold-start problem as Render |
| **Sevalla** | $20–50 one-time credit | **(b) Trial only** | No ongoing free allowance once credit exhausted (~2 months) |
| **Qoddi** | 3 static/staging Dev Apps | **(c) Not viable** | Free scope is static/staging only, not general container hosting |
| **IBM Cloud Lite** | 40+ always-free products | **(a) Perpetual, (c) not viable here** | No Docker compute or Postgres among the always-free products |
| **Alibaba Cloud** | 12-month free ECS + 80 trial services | **(b) Trial only** | Same shape as AWS legacy tier — 12 months then billed |

### 8. Verdict — does anything here beat or match Oracle Always Free?

**No single provider in this addendum beats or matches Oracle's Always Free
compute (2 OCPU/12GB RAM/200GB disk, one VM self-hosting both containers) as
a complete $0 hosting answer.** Nothing here offers free perpetual general
Docker container compute at anywhere near that scale — Northflank comes
closest in principle (no card, no forced sleep, genuinely perpetual) but its
free-tier compute sizing is thin and undocumented; Zeabur and Qoddi reproduce
the idle-sleep or scope-limited problems that already disqualified Render;
Sevalla, IBM Cloud Lite (for this purpose), and Alibaba Cloud are trials or
scoped away from this workload.

On the **database side**, however, this addendum does add one genuinely
new, competitive option: **CockroachDB Basic's recurring $15/month free
allowance (≈10GiB storage, 50M RU) is the single most generous free
managed-Postgres-compatible database found across the entire research
effort** — 20x Neon's storage ceiling and no forced scale-to-zero cold start
(RU-based throttling instead), while remaining genuinely perpetual and
requiring no credit card. It is Postgres-wire-compatible enough to be a real
substitute for Neon/Supabase as the managed-DB half of a "free compute +
free managed DB" combination, and arguably a better one than either given
the storage headroom — worth naming explicitly alongside Neon/Supabase as a
third fallback option if Oracle's single-VM approach is abandoned.

**This reinforces rather than overturns the standing conclusion:** Oracle
Cloud Always Free (single VM, both containers self-hosted) remains the best
$0 floor for this specific Docker Next.js+Postgres workload. If a managed,
decoupled Postgres is preferred, the ranked fallback list is now **Neon
(most battle-tested, tightest storage) → CockroachDB Basic (most storage
headroom, distributed-SQL quirks) → Supabase (friendliest pause window,
lowest connection cap)** — paired with Oracle's VM or GCP Cloud Run as the
free compute half. No provider surveyed in either addendum offers a
single-box, no-external-dependency free tier that rivals Oracle's.
