---
id: checkpoint2-feasibility/02
title: Real-world BYOK LLM free-tier quotas (Gemini + alternatives)
label: wayfinder:research
status: closed
assignee: null
blocked_by: []
---

## Question

What are the actual current free-tier quotas (requests/day, tokens/day,
rate limits) for Gemini API keys a typical end user could self-provision
for free, and how do they compare to what's needed for the planned default
recipes (a 10-question quiz + a summary per video, per
`docs/design/ai-integration-plan.md`)? Are there realistic alternative free
LLM providers users could BYOK with instead if Gemini's free tier is too
thin? Does BYOK reliably deliver a usable AI experience for a non-technical
self-learner, or does the free tier make it fragile/frustrating in
practice?

## Resolution

Researched actual 2026 free-tier quotas for Gemini, Groq, Mistral,
OpenRouter, and Cerebras against the planned workload (2 requests/video —
summary + 10Q quiz — each carrying a 5k-50k+ token transcript). Gemini's
free tier (`gemini-2.5-flash`: ~10 RPM / 250 RPD / ~250k TPM, 1M-token
context) is thin but is counter-intuitively the *best* fit among free
options, because it's the only one with enough context window and TPM
headroom to swallow a long transcript in one call; Groq and Cerebras have
generous request counts but their free-tier TPM/context caps (as low as
6k TPM, or an 8,192-token context cap on Cerebras that outright rejects
long transcripts) undercut them, and Mistral no longer publishes fixed
free-tier numbers at all. Verdict: BYOK is workable but not reliably
"always on" — bursts of long-transcript videos can trip 429 well before
the daily request count is exhausted — so the product must treat visible
rate-limit UX as required (not an edge case), and separately account for
non-technical users' key-setup friction, which no alternative provider
removes. Full findings, per-provider quotas, and sources:
[research/llm-byok-quota.md](../research/llm-byok-quota.md).
