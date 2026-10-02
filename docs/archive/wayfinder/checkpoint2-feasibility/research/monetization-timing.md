---
ticket: checkpoint2-feasibility/16
title: Indie-project monetization timing & donation-reality research
---

# Indie-project monetization timing & donation reality (2024–2026)

Research for [ticket 16](../tickets/16-monetization-timing-research.md),
feeding the [ticket 09](../tickets/09-monetization-trigger-timing.md)
sequencing decision. Context: [ticket 05](../tickets/05-zero-cost-premise-decision.md)
established an unavoidable ~$5–12/mo infra floor from Checkpoint 1 onward,
and `VISION.md` §7 currently gates paid tiers on retention/quota/demand
signals while allowing a donate button "from day one."

Method note: hard platform-level statistics for *small* projects are
scarce — platforms publish aggregate totals, not per-project medians — so
each section below separates **broad data** from **named anecdotes** and
says which is which.

---

## 1. Donation reality at tens-to-hundreds of users

### Broad data

- **GitHub Sponsors aggregate**: >$100M paid out cumulatively since 2019
  across >70,000 sponsored maintainers/organisations
  ([GitHub blog, 2025](https://github.blog/open-source/maintainers/100-million-for-open-source-a-milestone-built-by-the-community/),
  [itbrief coverage](https://itbrief.co.uk/story/github-sponsors-tops-usd-100-million-for-open-source)).
  Naive division gives ~$1,400/maintainer *cumulative over six years* —
  and the distribution is extremely top-heavy (top-sponsored projects
  pull $20k–50k+/mo per [Skillademia's GitHub stats roundup](https://www.skillademia.com/statistics/github-statistics/)),
  so the median small project is far below even that. Average individual
  sponsorship is ~$8/mo; organisational ~$200/mo (same source).
- **A 2026 longitudinal study of GitHub Sponsors**
  ([arXiv 2604.03846](https://arxiv.org/html/2604.03846)) found that of
  49,148 users in the Sponsors ecosystem, only **15% receive any
  sponsorship at all**; 83% are sponsors only. Money concentrates on a
  small set of already-visible maintainers.
- **Tidelift maintainer surveys** (via
  [The Register, 2024](https://www.theregister.com/2024/09/18/open_source_maintainers_underpaid/)
  and [Tidelift/dev.to](https://dev.to/tidelift/despite-increasing-demands-most-maintainers-still-dont-get-paid-for-their-work-5ckn)):
  ~60% of maintainers are unpaid hobbyists; only 13% earn most of their
  income from maintenance.
- **Linux Foundation 2024 Open Source Software Funding Report**
  ([report site](https://opensourcefundingsurvey2024.com/),
  [LF summary](https://www.linuxfoundation.org/blog/understanding-the-state-of-open-source-funding-in-2024)):
  of organisational OSS investment, 86% is employee time; of the ~$162M
  direct financial flow surveyed, only **4% goes to individual
  maintainers**. Corporate money does not find small projects.
- **Ko-fi**: ~168k creators earned money in a year on a platform of 1M+
  creators, average *payment* ~$19.50
  ([productmint business-model analysis](https://productmint.com/how-does-ko-fi-make-money/)).
  Average annual take among those who earned anything ≈ $270; most
  registered creators earn $0.
- **Open Collective small-project example**: ClassicPress (a fork of
  WordPress with a real community) ran on ~$212/mo from 38 contributors
  ([viktornagornyy funding guide](https://viktornagornyy.com/funding-open-source-projects/))
  — and that is a *success* case with far more than "hundreds" of users.

### Named anecdotes (small-project scale)

- Gourav Goyal's browser extension: **10k+ downloads over 4 years →
  first donation $5, cumulative $45**
  ([gourav.io](https://gourav.io/blog/first-donation-on-open-source-side-project);
  the [HN thread on it](https://news.ycombinator.com/item?id=25744661)
  is full of similar "years, thousands of users, single-digit dollars"
  stories).
- azu (textlint/Secretlint — popular, long-established JS tooling with a
  large Japanese dev following): ~$1,200–1,300/mo in 2023
  ([dev.to](https://dev.to/azu/my-github-sponsors-revenue-2023-1m3d)) —
  illustrating the scale needed before Sponsors income is real money:
  years of visibility and a dependency footprint, not hundreds of users.
- Connor Tumbleson (Apktool, 800M+ downloads across his deps' ecosystem)
  documents sponsoring 119 of his own 193 dependencies and observes most
  receive trivial amounts ($2–3/mo range per sponsor)
  ([connortumbleson.com](https://connortumbleson.com/2025/05/05/github-sponsor-funding/)).

### Verdict for sub-question 1

At <1000 users a donate button produces **noise**: realistically $0–5/mo
with occasional one-off spikes. Expected value over a year is likely
under one month of the $5–12 infra floor. It cannot be treated as a
funding mechanism at Checkpoint 1–2 scale. What it *does* provide,
per multiple maintainer accounts, is a morale/validation signal and a
zero-cost option for the rare enthusiastic user.

---

## 2. Does an early donate button harm adoption?

- **No credible evidence of harm from a passive button.** Research and
  practitioner writing on donationware
  ([DonationCoder's donationware experiments](https://www.donationcoder.com/archives/articles/article-whendousers),
  [Donationware overview](https://en.wikipedia.org/wiki/Donationware))
  distinguishes two things: a quiet "support this project" link (no
  measured adoption cost) vs. a *desperate plea* ("we need donations to
  survive"), which does measurably scare users — people avoid adopting
  software that looks like it may disappear.
- The same donationware literature notes adoption of free tools is a
  utilitarian snap decision; an optional-donation prompt simply isn't
  part of that decision, which is *why* it converts so poorly — and also
  why it doesn't deter.
- On the "wait until habits form" side: DonationCoder's data and the
  reciprocity framing (value delivered first → voluntary contribution
  later) support that donations, when they happen at all, come from
  established users, not new ones — the Gourav case (donation arrived
  4 years in, only after a link existed) is consistent. There is no
  evidence that *delaying* the button increases lifetime donations; the
  button just has to exist when the grateful user shows up.
- Directional norm check: donate/sponsor links are now default-visible
  across OSS (GitHub's FUNDING.yml button, Ko-fi links in READMEs), and
  none of the adoption-focused literature flags them as friction
  ([lemonade-stand guide](https://github.com/nayafia/lemonade-stand)).

### Verdict for sub-question 2

"Too early hurts trust" is a **myth for passive buttons** but true for
needy framing. A low-key "Support / Ủng hộ" link from day one is
costless; copy matters more than timing. Never frame it as "help us
survive."

---

## 3. Early paid-tier signal and outcomes at low user counts

- **No magic user number exists.** Indie Hackers threads converge on
  engagement/feature-pull triggers, not counts — though "after ~10–20
  engaged beta users / ~100 free users" recurs as a rule of thumb
  ([when to charge](https://www.indiehackers.com/post/when-should-we-charge-for-our-product-5447716ede),
  [free vs paid features](https://www.indiehackers.com/post/free-vs-paid-features-finding-that-sweet-spot-9b37751217),
  [getting free users to pay](https://www.indiehackers.com/post/getting-free-users-to-pay-up-02393c488f)).
  The commonly cited triggers match VISION §7's list almost exactly:
  visible retention, users hitting limits, users *asking* to pay.
- **Freemium conversion benchmarks 2024–2026**: 2–5% free→paid is
  "good" for self-serve; a quarter of products convert <2.5%
  ([Userpilot](https://userpilot.com/blog/freemium-to-premium/),
  [ChartMogul SaaS Conversion Report](https://chartmogul.com/reports/saas-conversion-report/),
  [Lenny Rachitsky](https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion),
  [Artisan benchmarks](https://www.artisangrowthstrategies.com/blog/freemium-conversion-rate-benchmarks)).
  Arithmetic consequence: at 200 active users × 3% × ~$5/mo ≈ **$30/mo**
  — enabling a paid tier at Checkpoint-2 scale covers the floor only in
  the best case, and only if the audience will pay at all (students, the
  likely audience here, are notoriously below benchmark).
- **Case study — charging at tiny scale works but yields tiny money**:
  Plausible Analytics charged nearly from day one; first month ended at
  **$64 MRR**, and it took **324 days to reach $400 MRR** despite strong
  content marketing ([plausible.io](https://plausible.io/blog/open-source-saas),
  [Failory interview](https://www.failory.com/interview/plausible)).
  Notably, charging early did *not* harm growth — it filtered for real
  demand.
- **Case study — beta-to-paid flip**: a founder pair ran 10 free beta
  users for 6 months, then emailed "pay or stop"; first conversion in
  50 minutes ([Indie Hackers](https://www.indiehackers.com/post/indie-hackers-share-how-they-got-their-first-10-100-and-1-000-customers-620ce768ba)).
  Small-N but representative of the pattern: paid tiers at low counts
  validate, they don't fund.
- The operational cost of a paid tier (Stripe/tax/subscription logic,
  support expectations) is the real argument against enabling it early —
  echoed in VISION §7 trigger #4 ("đủ quy mô để đáng công sức vận hành").

### Verdict for sub-question 3

Typical indie trigger = **feature-pull, not user count**: users hitting
a real limit (here: shared-key AI quota exhaustion per ticket 02/06) or
explicitly asking to pay. Enabling a paid tier at <1000 users is neither
harmful nor lucrative — expect tens of dollars/mo at best. It only makes
sense once there's a scarce resource to sell (shared AI quota) and
enough retained users that 2–5% of them is more than a handful of
people.

---

## 4. The null option: founder eats $5–12/mo indefinitely

- **This is the modal outcome and it is sustainable at this level.**
  Indie Hackers cost threads show hobby projects routinely run at
  $5–20/mo indefinitely
  ([how much does it cost to run your side project](https://www.indiehackers.com/post/how-much-does-it-cost-to-run-your-side-project-6811b201e5));
  one documented target regime is "<$20/mo total incl. CI" with $5.50/mo
  achieved hosting ([dev.to build log](https://dev.to/allscreenshots/day-5-choosing-our-hosting-how-well-run-this-for-under-20month-2c00)).
  Fediverse/hobby-server admins in the Cohost shutdown thread describe
  $20/mo VPSes at "cents per user"
  ([HN](https://news.ycombinator.com/item?id=41492807)).
- **Where it breaks**: pain thresholds reported by indie devs cluster
  where costs scale with usage — AI API bills ($150+/mo), managed-DB
  tier jumps, egress — e.g. a project whose "total costs add up to
  almost $400/mo" driven by AI APIs
  ([Engin Arslan](https://www.enginarslan.com/posts/cost-of-building-a-profitable-side-project)).
  $25/mo is described as "annoying but tolerable"; the common quit/panic
  zone in these accounts is roughly **$50–100+/mo**, i.e. when spend
  stops being "a subscription" and becomes "a bill." The BYOK-default
  decision (ticket 06) is exactly the mechanism that keeps this project
  out of that zone.
- The other failure mode is time, not money: maintenance burden is the
  most-cited reason for shutting down even *profitable* side projects
  ([Indie Hackers](https://www.indiehackers.com/post/shutting-down-profitable-side-projects-07fd1bac92)).
  A $5–12 floor doesn't kill CV projects; support load does.
- For a stated CV/proof-value project, $5–12/mo ≈ one streaming
  subscription; ticket 05 already recorded the founder's explicit
  acceptance of this framing. Nothing found in 2024–2026 sources
  contradicts its sustainability at that level.

### Verdict for sub-question 4

Founder-funded at $5–12/mo is common, low-risk, and indefinitely
tolerable; the documented danger threshold is usage-scaling costs
(chiefly non-BYOK AI spend) pushing past ~$50/mo, plus maintenance
fatigue — neither of which the donate/paid-tier levers fix anyway.

---

## Recommended trigger sequencing (input to ticket 09)

| Checkpoint | Monetization posture |
|---|---|
| **1 (first external users)** | Founder absorbs $5–12/mo (ticket 05 decision stands). Passive donate link (Ko-fi/GitHub Sponsors — both 0% platform fee) live from day one, framed as "support," never "survival." Expect ~$0; it's a morale channel and option value. |
| **2 (usable core, small real usage)** | Same. Do NOT build subscription logic. Track two §7 signals only: retention and any user hitting a shared-AI-quota limit or asking to pay. |
| **3–4 (retention proven / quota pressure real)** | Enable paid tier only on **feature-pull** (shared-key AI quota exhaustion or explicit willingness-to-pay), sized against the 2–5% self-serve conversion benchmark, i.e. don't bother before a few hundred *retained* users. |

Net: ticket 05's cost floor does **not** justify moving paid-tier
readiness earlier — donations can't cover it and paid tiers at that
scale yield tens of dollars for real operational cost. VISION §7's
signal-based gating (Checkpoint 3–4) survives contact with the data; the
only "earlier" item is the donate link, which §7 already permits.
