---
id: checkpoint2-feasibility/03
title: ToS/legal exposure of unofficial YouTube transcript extraction + blog scraping at planned scale
label: wayfinder:research
status: closed
assignee: null
blocked_by: []
---

## Question

`docs/design/ai-integration-plan.md` commits to unofficial libraries
(`youtube-transcript-plus`/`youtubei.js`) for transcripts and
`@mozilla/readability` for blog scraping. What is the real ToS/legal
exposure of relying on these at Checkpoint 2–3 scale (a community of
dozens-hundreds of users, not just the founder)? Is there historical
precedent of Google blocking/cracking down on unofficial transcript
libraries? What's the robots.txt/ToS risk profile for scraping arbitrary
blog URLs on a user's behalf? Does this materially threaten the plan, or is
it an acceptable/typical risk for a product at this scale?

## Resolution

No lawsuit, cease-and-desist, or DMCA action has ever targeted a YouTube
transcript-extraction library or app for reading captions; the only relevant
precedent (`youtube-dl`, 2020) was a different legal theory (DMCA §1201 DRM
circumvention on downloads) that doesn't apply to caption text. YouTube's real
enforcement against unofficial scraping is technical (IP rate-limiting/blocks
on high-volume/datacenter traffic), not legal, and doesn't target low-volume
per-user fetches. `hiQ v. LinkedIn` confirms scraping public pages isn't
criminal (CFAA) but can be a civil ToS/contract claim pursued against
commercial-scale competitors — not personal-use tools at dozens-hundreds-of-users
scale; blog scraping via `@mozilla/readability` for transient per-user
summarization carries similarly low copyright exposure since content isn't
stored/redistributed. Verdict: this is an accepted, typical risk shared by
the entire class of comparable transcript-summarizer/read-it-later tools, not
a material threat at Checkpoint 2-3 scale — the plan's existing
`TranscriptProvider` interface isolation (for breakage, not legal, resilience)
is sufficient; no additional legal mitigation needed now. Full findings:
[research/scraping-legal-risk.md](../research/scraping-legal-risk.md).
