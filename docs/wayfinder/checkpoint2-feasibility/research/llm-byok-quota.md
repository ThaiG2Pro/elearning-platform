---
ticket: checkpoint2-feasibility/02
date: 2026-08-10
---

# LLM BYOK free-tier quota research (2026)

Research date: 2026-08-10. Free-tier quotas for hosted LLM APIs change
frequently (Google cut Gemini free-tier quotas significantly in December
2025) and providers increasingly avoid publishing exact numbers, directing
users to a live dashboard instead. Treat every number below as a snapshot,
not a contract — the architecture must read actual 429 responses/headers at
runtime rather than hard-coding these figures (this matches what
`docs/design/ai-integration-plan.md` already recommends).

## Findings

### Gemini API (Google AI Studio free tier) — the planned default

Official docs (`ai.google.dev/gemini-api/docs/rate-limits`) confirm rate
limits are applied **per project, not per API key**, and state the
authoritative numbers are only visible live at
https://aistudio.google.com/rate-limit — the docs page itself no longer
lists free-tier numbers directly. Third-party trackers that scrape/mirror
the live numbers (cross-checked across four independent sources, sampled
2026) converge on:

- `gemini-2.5-flash`: **10 RPM**, **250 requests/day**, ~**250,000 TPM**
- `gemini-2.5-flash-lite`: 15 RPM, 1,000 requests/day, ~250,000 TPM
- `gemini-2.5-pro`: 5 RPM, 100 requests/day, ~250,000 TPM
- `gemini-2.0-flash`: legacy model, not consistently listed in current
  trackers — appears to have been de-emphasized in favor of the 2.5 line on
  the free tier.
- Context window: 1M tokens (input) is available even on the free tier.
- **Free-tier prompts/outputs are used by Google to improve their products**
  (confirmed on `ai.google.dev/gemini-api/docs/pricing` — "Content used to
  improve our products: Yes" for free tier, "No" for paid). This is a
  privacy-relevant fact for a BYOK product surfacing a user's own
  video/course content.
- These are all a step down from pre-December-2025 limits; multiple sources
  explicitly flag the December 2025 quota cut as the reason older
  blog/Stack Overflow numbers people find while searching are now wrong.

Sources:
- https://ai.google.dev/gemini-api/docs/rate-limits (official — confirms per-project scoping, live-dashboard-only numbers)
- https://ai.google.dev/gemini-api/docs/pricing (official — free tier = "free of charge" for text/image/video, training-data-use flag)
- https://aistudio.google.com/rate-limit (official live dashboard, the actual source of truth per Google's own docs)
- https://www.aifreeapi.com/en/posts/gemini-api-free-tier-rate-limits (third-party tracker, cites Dec-2025 cut)
- https://tokenmix.ai/blog/gemini-api-free-tier-limits
- https://yingtu.ai/en/blog/gemini-api-free-tier

### Groq (Llama/GPT-OSS/Qwen models via LPU inference)

Official docs (`console.groq.com/docs/rate-limits`) list concrete per-model
free ("Developer" base) tier numbers:

- `llama-3.1-8b-instant`: 30 RPM, 14,400 RPD, 6,000 TPM, 500,000 TPD
- `llama-3.3-70b-versatile`: 30 RPM, 1,000 RPD, 12,000 TPM, 100,000 TPD
- `openai/gpt-oss-120b`: 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD
- `openai/gpt-oss-20b`: 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD
- Note the **6,000-12,000 TPM ceiling on the larger/better models** — a
  single ~50,000-token transcript input would immediately exceed TPM on
  every model except `llama-3.1-8b-instant`, and even that model's 6,000 TPM
  cannot fit a 50k-token prompt in one request at all (TPM is a per-minute
  cap, not a per-request cap, but most providers also reject a single
  request whose size alone exceeds the TPM window).
- No credit card required for the free tier; adding a card (still $0 spend)
  unlocks ~10x higher limits per Groq's own docs.

Sources:
- https://console.groq.com/docs/rate-limits (official)
- https://tokenmix.ai/blog/groq-free-tier-limits-2026
- https://www.grizzlypeaksoftware.com/articles/p/groq-api-free-tier-limits-in-2026-what-you-actually-get-uwysd6mb

### Mistral (La Plateforme, "Experiment" free tier)

Mistral has moved **away from publishing exact numbers** for its free
tier; official guidance is to check the Admin Console → Limits page for
live figures. Third-party estimates converge on roughly **1 billion
tokens/month** as an evaluation cap, explicitly framed as "for evaluation,
not production," with an unspecified but low RPM baseline (contrast: paid
pay-as-you-go tiers reportedly unlock ~300 RPM). No single authoritative
public number could be found for RPM/RPD on the free tier as of this
research date — this itself is a finding: **Mistral's free tier is less
BYOK-plannable than Groq's or OpenRouter's** because a developer cannot
know their ceiling without creating an account and checking the console.

Sources:
- https://docs.mistral.ai (official docs; account-specific limits page requires login, not publicly documented with fixed numbers)
- https://pricepertoken.com/endpoints/mistral/free
- https://www.grizzlypeaksoftware.com/articles/p/mistral-ai-pricing-in-2026-pro-costs-free-tier-limits-and-api-rates-lx4o2n2v
- https://costbench.com/software/llm-api-providers/mistral-ai/free-plan/

### OpenRouter (free model pool, e.g. `*:free` variants of Llama/Qwen/Gemini/etc.)

Official docs (`openrouter.ai/docs/api-reference/limits`) are explicit and
consistent across sources:

- **20 requests/minute**, always, regardless of account status.
- **50 requests/day** if the account has never purchased credits.
- **1,000 requests/day** if the account has purchased at least $10 in
  credits at any point (a one-time unlock, credits don't need to be spent
  on paid models to keep this benefit).
- Free models are pooled/shared infrastructure and subject to additional
  provider-side throttling at peak hours (noted by several trackers, not
  precisely quantified).
- This is meaningfully **easier to reason about than Gemini or Mistral**
  because the rule is simple and stated by the provider itself, but the
  **50/day unauthenticated-purchase tier is the tightest of all providers
  researched** — 50 requests/day covers roughly 25 videos/day at 2 requests
  (summary + quiz) per video, assuming no retries.

Sources:
- https://openrouter.ai/docs/api-reference/limits (official)
- https://www.teamday.ai/blog/best-free-ai-models-openrouter-2026
- https://klymentiev.com/blog/openrouter-free-tier

### Cerebras (free tier, `gpt-oss-120b` / `GLM-4.7` inference)

Official rate-limit docs (per third-party summaries citing the June 2026
docs) show the free tier restricted to **exactly two models**:

- 5 RPM, 30,000 TPM, 1,000,000 tokens/day
- **Free-tier context window capped at 8,192 tokens** — this is the most
  important single finding for this ticket: an 8,192-token cap means a
  transcript above roughly 6,000-7,000 tokens (leaving room for the
  prompt/output) **cannot be submitted at all** on Cerebras's free tier,
  regardless of daily/per-minute budget. Any video transcript in the
  higher half of the stated 5,000-50,000+ token range would simply fail.

Sources:
- https://tokenmix.ai/blog/cerebras-api-key-rate-limits-free-tier-2026
- https://www.getaiperks.com/en/ai/cerebras-free-tier-guide
- https://www.morphllm.com/cerebras-pricing

## Cross-provider comparison against the planned workload

Planned workload per video (per `docs/design/ai-integration-plan.md`): 1
summary generation + 1 quiz generation (10 questions) = **at least 2 LLM
requests per video**, each carrying the **full transcript** (5,000-50,000+
tokens) as input context.

| Provider | Best free model for this job | RPM | RPD | TPM ceiling | Context cap | Long-transcript viable? |
|---|---|---|---|---|---|---|
| Gemini | gemini-2.5-flash | 10 | 250 | ~250,000 | 1M tokens | Yes for context; RPD allows ~125 videos/day; a burst of 5+ long-transcript requests in one minute can still exceed the 250k TPM bucket |
| Groq | llama-3.1-8b-instant | 30 | 14,400 | 6,000 | model max (~128k) | No — 6,000 TPM cannot carry a 50k-token transcript in any single request |
| Mistral | (unpublished free model) | unknown | unknown | ~1B tokens/month implied | model max | Unknown — can't plan around it without an account |
| OpenRouter | any `:free` model | 20 | 50 (or 1,000 after $10 spend) | model-dependent | model-dependent | RPD is the binding constraint: 50/day ≈ 25 videos/day before any $ spend |
| Cerebras | gpt-oss-120b (free tier) | 5 | — (1M tok/day) | 30,000 | **8,192 tokens** | No — hard context cap rules out most "long video" transcripts outright |

**Gemini is, perversely, the strongest fit among the free tiers researched**
for this specific workload precisely because it is the only one with both a
large enough context window (1M) and a TPM budget (250k) that can actually
swallow a 50k-token transcript in a single call. Groq and Cerebras — often
recommended as "generous free tier" alternatives for raw throughput — turn
out to be the *worst* fit for this specific long-context summarization/quiz
use case because their free-tier TPM/context caps are tuned for many short
chat turns, not occasional long documents.

## Verdict

**BYOK is workable, but not "reliable" in the way the target user (a
non-technical self-learner) needs, for two separate reasons that compound:**

1. **Quota is thin enough to be felt, not just theoretical.** On Gemini's
   free tier (the planned default), 250 requests/day sounds like a lot in
   isolation, but the actual workload is 2 requests per video, so a user
   who adds ~10-15 videos in one active session (binge-watching a course, a
   very plausible self-learner behavior) consumes 20-30 requests — fine on
   its own, but the **10 RPM cap combined with 250k TPM means bursts of
   several long-transcript videos processed back-to-back can trip a 429
   well before the daily request count is exhausted**. This is exactly the
   failure mode `docs/design/ai-integration-plan.md` already anticipates
   ("đọc lỗi 429/response header thực tế lúc runtime") — the design is
   correct to treat the numeric quota as unknowable in advance, but that
   also means the product **cannot promise the user a working AI feature on
   a given day**; it can only degrade gracefully when 429 happens.
2. **Key setup and quota-awareness are real UX friction for the stated
   target user.** Getting a free Gemini API key requires a Google
   account, navigating to Google AI Studio, creating a project, generating
   a key, and pasting it into the app — a multi-step technical flow with no
   built-in explanation of what "requests per minute" means when it fails.
   None of the researched alternatives remove this friction; several
   (Mistral, Cerebras) are *harder* to reason about because they don't even
   publish their own free-tier numbers, so the app can't set an informed
   internal safety margin the way the integration plan wants — it can only
   discover the ceiling by hitting it.

**Alternatives don't rescue the plan; they mostly trade one weakness for
another.** OpenRouter is the simplest to explain (single stated rule) but
its pre-purchase 50 req/day cap is tighter than Gemini's for this workload.
Groq and Cerebras have generous request/day counts but their free-tier
TPM/context caps actively **reject** the long-transcript case the product
needs, independent of how often the user calls them. Mistral's free tier is
unquantifiable in advance from public docs, which is worse for a product
that wants to set a safety margin, not better.

**Conclusion for the roadmap decision:** BYOK with Gemini as the shared
free default is the *best available* choice among free options for this
specific "long transcript, low daily volume, occasional use" workload — it
is not a strategy failure — but it should be presented to the user as
**"AI features work, with occasional temporary limits"** rather than as a
reliably-always-on feature. The mitigations already specified in
`docs/design/ai-integration-plan.md` (enqueue + PENDING status, no silent
fallback across keySource, internal quota below Google's published number)
are necessary, not optional, given these findings — and the product should
budget for **visible, well-worded error states when 429 happens** (e.g. "AI
limit reached for today, try again after midnight Pacific") rather than
treating rate-limiting as an edge case. The key-setup friction is a separate,
unsolved UX problem that this research does not resolve: a non-technical
self-learner will need a guided, screenshot-level walkthrough (or a
"paste your key" wizard with live validation) to get a Gemini key at all,
and that onboarding cost should be counted as part of the AI feature's real
cost, not treated as a one-time footnote.
