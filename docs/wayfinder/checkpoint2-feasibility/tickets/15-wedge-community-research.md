---
id: checkpoint2-feasibility/15
title: Where do self-taught YouTube learners actually congregate, and how have comparable tools successfully recruited them?
label: wayfinder:research
status: closed
assignee: null
blocked_by: []
---

## Question

`VISION.md` §4 tentatively names "người tự học lập trình qua YouTube free"
(self-taught devs learning via free YouTube) as the Stage 2 wedge
community, but [ticket 08](08-wedge-community-validation.md) needs data
before that can be confirmed or replaced. Research:

1. **Where this audience actually congregates in 2026** — specific
   subreddits (r/learnprogramming, r/csMajors, …), Discords, forums
   (dev.to, freeCodeCamp forum), Vietnamese-language communities (the
   founder is Vietnamese; is a VN-first wedge sharper than a global one?),
   with rough size/activity signals for each.
2. **How comparable free learning tools actually got their first 100–1000
   users** — concrete launch case studies (roadmap.sh, Knowt, Class
   Central, any "study-with-me"/accountability tools): which channel
   (Reddit post, HN Show, Product Hunt, TikTok/YouTube creator
   partnership, SEO) actually produced the initial cohort, and what
   failed.
3. **Alternative wedges** — is there evidence a narrower slice (e.g. one
   specific exam/cert cohort, one language community, students of a
   handful of big YouTube instructors) outperforms the broad
   "self-taught devs" label for a first community?
4. **Community-seeding rules of the road** — what gets tools banned vs.
   welcomed when seeding in these communities (self-promo rules on the
   major subreddits/Discords).

Deliver findings specific enough that ticket 08 can name actual
communities and an actual first-outreach sequence, not a demographic
label.

## Resolution

Full findings: [research/wedge-community.md](../research/wedge-community.md)
(2026-08, all claims sourced).

**Summary.** (1) The broad "self-taught devs" label has no home community;
what exists are curriculum/instructor cohorts (CS50 Discord ~220k, Odin
~91k, 100Devs ~73k), a behavior community (Study Together Discord ~1.06M —
live co-studying + progress tracking, the product's exact loop), and huge
but promo-hostile subreddits (r/learnprogramming ~4.3M). Vietnamese energy
lives in Facebook groups (J2TEAM ~630k; "Tự học lập trình miễn phí" ~45k —
literally the wedge's name), the F8/fullstack.edu.vn ecosystem (which
already validated "structure + progress on top of free YouTube" for VN,
but only for its own catalog), Viblo, and VOZ (~1.16M). (2) Every studied
tool's first cohort came from a congregation the founder belonged to or
built around a specific curriculum — roadmap.sh (GitHub artifact, 10k
stars/week), Class Central (built inside the Stanford AI-course cohort),
Knowt (TikTok student-native), 100Devs (one instructor's free cohort) —
never from broadcasting to a demographic. Show HN ≈ 25–600 signups/launch;
Product Hunt is a poor fit. (3) Narrower wedges demonstrably out-organize
the broad label (r/developersIndia ~1M+ proves geo wedges scale). (4) ~61%
of founder-relevant subreddits ban self-promo; sanctioned slots only
(Saturday threads, Showoff Saturday, "I Built This", Show HN) and the 9:1
participation rule.

**Recommendation:** adopt a **VN-first wedge — "người Việt tự học lập
trình qua YouTube"** — replacing the broad global label. First communities,
in sequence: (1) FB group "Tự học lập trình miễn phí" + (2) J2TEAM
Community, with a seed artifact of 3–5 pre-built public courses from
popular free YouTube curricula (post the artifact + story, per group
rules); then (3) a Viblo write-up / low-key VOZ thread for long-tail reach.
Go global (Show HN + r/learnprogramming Saturday thread) only after VN
retention signal.
