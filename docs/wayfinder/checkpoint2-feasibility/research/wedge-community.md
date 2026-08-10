---
ticket: checkpoint2-feasibility/15
title: Wedge community reach & recruitment research
---

# Wedge community reach & recruitment research

Research for [ticket 15](../tickets/15-wedge-community-research.md), feeding
[ticket 08 (wedge-community validation)](../tickets/08-wedge-community-validation.md).
Question: where do self-taught YouTube programming learners actually congregate in
2026, how did comparable free tools get their first 100–1000 users, is a narrower
wedge sharper than the broad "self-taught devs via YouTube" label, and what are the
self-promo rules of the road? Data gathered 2026-08 via live web search; all sizes
are approximate point-in-time signals.

---

## 1. Where the audience congregates (2026)

### 1.1 Global — Reddit

| Community | Size | Notes |
|---|---|---|
| r/learnprogramming | ~4.3M members | The canonical beginner community; syntax questions, study paths, resource requests. Self-promo restricted (see §4). ([daily.dev roundup](https://daily.dev/blog/best-programming-subreddits-follow/), [MediaFast ranking](https://www.mediafa.st/best-subreddits-for/programming)) |
| r/programming | ~2.9M | Working devs, link-sharing; not a beginner space |
| r/AskProgramming | ~2.3M | Q&A, more tolerant of discussion |
| r/webdev | ~2.6M | Strict promo rules; "Showoff Saturday" only ([launchwhere](https://launchwhere.com/listing/r-webdev)) |
| r/csMajors | ~455k | Students/career-track, heavy job anxiety content ([GummySearch](https://gummysearch.com/r/csMajors/)) |
| r/developersIndia | ~1M+ | Largest country-specific dev subreddit — proof that geo-wedge communities work at scale ([developersindia.in](https://developersindia.in/)) |

### 1.2 Global — Discord

| Server | Size | Notes |
|---|---|---|
| Study Together | ~1.06M members | #1 productivity/students Discord; live study-with-me via cam/screenshare, study-time tracking + leaderboard — closest existing analog to the product's "học tập trung, theo dõi tiến độ" loop ([Hive Index](https://thehiveindex.com/communities/study-together/), [discord.com/servers](https://discord.com/servers/study-together-595999872222756885)) |
| CS50 official | ~220k | Single-course cohort ([invite](https://discord.com/invite/cs50)) |
| The Odin Project official | ~91k | Free-curriculum cohort; peer-driven ([invite](https://discord.com/invite/fbFCkYabZB)) |
| 100Devs ("Learn w/ Leon & Friends") | ~73k | Built around ONE instructor's free live bootcamp ([invite](https://discord.com/invite/100devs), [100devs.org](https://100devs.org/about)) |
| freeCodeCamp official | ~42k | Official fCC community ([invite](https://discord.com/invite/freecodecamp-692816967895220344)) |

Key observation: the three biggest *learning* Discords (CS50, Odin, 100Devs) are all
**cohorts around a specific free curriculum/instructor**, not around the generic
identity "self-taught dev". The generic identity has no home server; the curriculum
cohorts do.

### 1.3 Forums / platforms

- **freeCodeCamp forum** (forum.freecodecamp.org) — active beginner Q&A + "I Built This" category for projects; promo outside that is against guidelines ([guidelines](https://forum.freecodecamp.org/guidelines)).
- **dev.to** — blog-first community; self-promo tolerated when packaged as a genuine write-up (the Wasp team grew an OSS repo to 6k stars largely via dev.to/Reddit content, [writeup](https://dev.to/wasp/how-i-promoted-my-open-source-repo-to-6k-stars-3li9)).
- **Hacker News** — one-shot launch channel, not a hangout (see §2).

### 1.4 Vietnam 🇻🇳

Vietnamese self-taught-programming energy is concentrated on **Facebook groups**,
**one dominant YouTube-native platform (F8)**, **Viblo**, and **VOZ** — not Reddit/Discord.

| Community | Size | Notes |
|---|---|---|
| J2TEAM Community (FB) | ~630k members | Largest VN tech/programming/security group; has formal written rules (rules.j2team.org); was twice taken down by Facebook (latest June 2025) — platform risk is real ([vn-z.vn](https://vn-z.vn/threads/j2team-community-chinh-thuc-khoi-phuc-admin-canh-bao-nhieu-nhom-fake-loi-dung-ban-hang-online.20390/), [junookyo.com](https://www.junookyo.com/2017/02/j2team-la-gi.html)) |
| Group Lập trình Python (FB) | ~265k | ([TopDev roundup](https://topdev.vn/blog/15-nguon-tuyen-dung-it-tren-facebook/)) |
| TopDev (FB) | ~176k | Recruitment-leaning |
| Lập Trình C/C++/C#/Java/Python… (FB) | ~159k | Multi-language beginner group |
| Anh lập trình viên (FB) | ~104k | Dev-culture/meme + advice |
| Tự học lập trình miễn phí (FB) | ~45k | Literally named after the wedge ("free self-taught programming") ([itviec roundup](https://itviec.com/blog/tech-group-developer/)) |
| **F8 / fullstack.edu.vn (Sơn Đặng)** | YouTube channel + free platform; the de-facto VN "learn to code free via YouTube" school | Free HTML/CSS/JS/Node courses on YouTube, with fullstack.edu.vn providing exercises + **progress tracking** on top of the videos — i.e. F8 already validated the exact product mechanic (structure + progress on top of free video) for the VN market ([F8 Official](https://www.youtube.com/@F8VNOfficial), [Facebook](https://www.facebook.com/f8vnofficial/), [viblo roundup](https://viblo.asia/p/top-kenh-youtube-viet-nam-ve-web-frontend-ma-cac-ban-khong-nen-bo-qua-WAyK8ANeZxX)) |
| Viblo.asia | Leading VN dev blogging community | Content-seeding channel analogous to dev.to ([viblo](https://viblo.asia/p/cong-dong-danh-cho-lap-trinh-vien-5-hoi-nhom-khong-the-bo-qua-GAWVpeyP405)) |
| VOZ forum, box Lập trình/CNTT | ~1.16M registered users site-wide | Oldest/largest VN tech forum; the programming box actively discusses free YouTube courses, LeetCode, AI. **Regulatory risk**: Decree 147 ID-verification forced a March 2025 access suspension for VN users ([Wikipedia](https://en.wikipedia.org/wiki/VOZ_(forum)), [VnExpress](https://vnexpress.net/dien-dan-cong-nghe-voz-thong-bao-ngung-hoat-dong-voi-nguoi-dung-viet-4866013.html), [voz.vn/f/lap-trinh-cntt](https://voz.vn/f/lap-trinh-cntt.91/)) |

VN-specific takeaways: (a) reach per unit of effort is higher — the founder is a
native speaker, competition for attention from Western tools is near zero in
Vietnamese-language groups, and there is a group *literally named after the wedge*;
(b) the F8 ecosystem proves demand for "structure + progress on top of free
YouTube" in VN — the open gap is that F8 only works for *F8's own* courses, while
this product works for *any* YouTube playlist; (c) platform risk (FB group
takedowns, Decree 147) argues for treating FB groups as acquisition channels, not
as the product's home.

---

## 2. How comparable free tools got their first 100–1000 users

| Tool | First-cohort channel | What actually happened | Source |
|---|---|---|---|
| **roadmap.sh** | GitHub (repo of static images) | Kamran Ahmed spent ~1 week making learning-path images in Balsamiq, posted the repo on GitHub in 2017 → ~10k stars in the first week; the website came 2 years later (2019). Now ~700k monthly visitors, 6th most-starred GitHub repo. Lesson: **the artifact itself (a free, immediately useful learning map) was the marketing** — no launch campaign. | [Starter Story](https://www.starterstory.com/roadmap-sh-breakdown), [dev.to interview](https://dev.to/craft-of-open-source/kamran-ahmed-founder-of-roadmapsh), [freeCodeCamp podcast](https://www.freecodecamp.org/news/roadmapsh-founder-kamran-ahmed-podcast-145/) |
| **Knowt** | TikTok (student-native short video) | Built by students; ground until a viral TikTok in Sept 2022 took them 18k → 100k users in one month; ~1.8M by mid-2024, 7M+ later. Lesson: for student audiences, **one native-format creator moment beat years of other channels**; the pre-viral 18k took far longer than the viral 82k. | [The Log (CCHS)](https://www.thelogcchs.com/post/knowt-the-new-quizlet), [Dealroom](https://app.dealroom.co/companies/knowt) |
| **Class Central** | Scratching own itch + organic/HN pickup | Dhawal Shah built a one-page list of free Stanford courses (late 2011) as one of 160k AI-course students — i.e., he **launched inside an existing cohort he belonged to**; 100M+ learners since. | [eLearningInside interview](https://news.elearninginside.com/moocs-learners-perspective-conversation-dhawal-shah-founder-class-central-com/), [About](https://www.classcentral.com/about) |
| **Boot.dev** | Paid + organic YouTube-creator partnership | Scaled via developer creators (ThePrimeagen as flagship teacher/partner; 324 sponsored channels, 1069+ videos by 2026). Lesson: **creator audiences are the channel for learn-to-code products**, but paid creator sponsorship is a scale-stage channel, not a first-100 channel. | [thoughtleaders.io case study](https://www.thoughtleaders.io/case-studies/boot-dev), [SponsorRadar](https://sponsorradar.com/brands/boot-dev), [boot.dev/teachers](https://www.boot.dev/teachers/the-primeagen) |
| **100Devs** | One instructor's free live cohort (Twitch + Discord) | Leon Noel's free 30-week live bootcamp created a 73k-member Discord from scratch — the community IS the instructor's classroom. | [100devs.org](https://100devs.org/about), [Discord](https://discord.com/invite/100devs) |
| **Study Together** | Discord-native niche ("study with me" on cam) | Grew to ~1.06M by owning one behavior (live co-studying + time tracking), not a demographic. | [Hive Index](https://thehiveindex.com/communities/study-together/) |

Channel-level expectations for a launch:

- **Show HN**: front page ≈ 5–30k uniques in 24h, 0.5–2% signup conversion → roughly 25–600 signups from one good launch; it is "a pulse, not a growth strategy", and the comment thread's long-tail SEO is much of the value ([markepear guide](https://www.markepear.dev/blog/dev-tool-hacker-news-launch), [daily.dev ads guide](https://business.daily.dev/resources/hacker-news-marketing-developer-tools-show-hn-launch-day-sustained-coverage/)).
- **Product Hunt**: a good launch = hundreds to ~1,000 signups in 24h (e.g. Twinr ~1,000 day-one), then decay; "a stress test, not proof of PMF" ([Founderpath](https://founderpath.com/blog/launch-on-product-hunt), [key-g checklist](https://key-g.com/blog/product-hunt-launch-checklist-47-steps-to-rank-no-1-in-2025/)). Weak fit for a Vietnamese-language student tool.
- **What failed / anti-patterns** across writeups: cold self-promo posts in strict subreddits (removed/banned — §4); paid channels before retention; launching to a demographic label instead of an existing congregation.

Composite lesson: **every first cohort above came from a pre-existing congregation
the founder either belonged to (Class Central, Knowt, roadmap.sh's GitHub audience)
or created around a specific curriculum (100Devs)** — none came from broadcasting
to "self-taught developers" in the abstract.

---

## 3. Broad label vs. narrower wedges

Evidence says narrower wins:

1. **Curriculum/instructor cohorts out-organize the generic identity.** "Self-taught devs" has no home server; CS50 (~220k), Odin (~91k), 100Devs (~73k) do. A wedge defined as "people currently following curriculum X on YouTube" gives you a findable, addressable population plus an obvious first artifact (that curriculum, pre-organized as a course in the product).
2. **Geo-specific beats global for a first community**: r/developersIndia (~1M+) shows a country-scoped dev community can outgrow most topic subreddits; the VN Facebook-group ecosystem (§1.4) is dense, under-served by tools, and native-language.
3. **Behavior-specific beats demographic**: Study Together (~1.06M) is organized around a behavior (co-studying with time tracking) that this product's core loop directly matches.
4. **The F8 gap is a ready-made narrow wedge**: F8 learners already accept "free YouTube video + platform that adds structure/progress"; the moment they move beyond F8's own catalog (English courses, other VN YouTubers, LeetCode prep playlists) they lose that structure — exactly what this product restores, for any playlist.

Candidate wedge formulations, sharpest first:

- **W1 (recommended): VN-first — "người Việt tự học lập trình qua YouTube"**, seeded with 3–5 pre-built courses from popular VN + English YouTube playlists (F8-adjacent frontend, Python cơ bản, LeetCode/DSA prep). Native-language founder advantage, dense FB-group reach, validated demand pattern, near-zero competitor presence in Vietnamese.
- **W2: single-curriculum cohort** (e.g. Odin/CS50/freeCodeCamp learners who supplement with YouTube) — addressable via their Discords but promo rules are tight and the founder has no standing there yet.
- **W3: broad "self-taught devs via YouTube" (status quo)** — weakest: no congregation, unmeasurable, and §2 shows nobody bootstrapped from a label.

---

## 4. Self-promo rules of the road

General Reddit reality: a 2026 survey of 49 founder-relevant subreddits found **61% ban self-promo outright** ([OneUp study](https://oneup.today/blogs/reddit-selfpromo-rules-study-2026)); the classic heuristic is the 9:1 ratio (≥90% of activity non-promotional) ([teract guide](https://www.teract.ai/resources/reddit-subreddit-marketing-2026)).

| Community | Rule | Consequence |
|---|---|---|
| r/learnprogramming | Self-promo only in the designated **Saturday thread**, or when genuinely answering someone's question | Standalone "I made a tool" posts removed ([redship guide](https://redship.io/blog/reddit-self-promotion-rules), [OneUp DB](https://oneup.today/tools/reddit-self-promotion-checker)) |
| r/webdev | Commercial promotion prohibited; non-commercial project posts only in **Showoff Saturday**, must focus on technical details | Removal; promo-heavy new accounts banned "with no second chances" ([redditgrowthdb](https://www.redditgrowthdb.com/database/subreddits/webdev)) |
| freeCodeCamp forum | Promotional content against guidelines; projects belong in "I Built This"; even on-topic self-links get moderator caution | ([guidelines](https://forum.freecodecamp.org/guidelines), [etiquette thread](https://forum.freecodecamp.org/t/etiquette-for-sharing-content/445103)) |
| Learning Discords (fCC, Odin, CS50, 100Devs) | Server rules generally ban unsolicited advertising/DM promo; acceptable path is becoming a known helpful member first, then asking mods | Kick/ban |
| Hacker News | Show HN is the sanctioned format — original work people can try, plain-words title | Blog-post-style promo flagged ([YC: Make things and show them](https://www.ycombinator.com/blog/make-things-and-show-them)) |
| J2TEAM Community (VN FB) | Formal written rules at [rules.j2team.org](https://rules.j2team.org/); sales/spam posts banned, fake spin-off groups are called out by admins | Post removal/ban ([vn-z.vn](https://vn-z.vn/threads/j2team-community-chinh-thuc-khoi-phuc-admin-canh-bao-nhieu-nhom-fake-loi-dung-ban-hang-online.20390/)) |
| VOZ | Community is hostile to obvious seeding; marketing agencies literally sell "VOZ seeding" services, and regulars detect it | Thread derision/mod action ([mktsoftware](https://mktsoftware.vn/forum-voz)) |

Welcomed pattern everywhere: share a **useful artifact + honest story** ("here's a
free organized course/roadmap I built from X's playlist, here's what I learned"),
in the sanctioned slot (Saturday threads, I Built This, Show HN), answering real
questions the rest of the week. Banned pattern: link-drop + leave, new account,
repeat posting across groups.

---

## 5. Recommended first-outreach sequence (input to ticket 08)

1. **Seed artifact first (weeks 0–2):** build 3–5 polished public courses inside the product from popular free YouTube curricula (≥1 VN e.g. F8-style frontend path; ≥1 English e.g. CS50/Odin-companion or DSA-prep playlist). The artifact is the marketing (roadmap.sh lesson).
2. **VN Facebook groups (weeks 2–4):** founder posts the *artifact + story* (not the product) in "Tự học lập trình miễn phí" (~45k, name-matched audience) and J2TEAM Community (~630k, after reading rules.j2team.org), engaging in comments. Target: first 100–300 users.
3. **Viblo/VOZ content (weeks 3–6):** one honest Vietnamese write-up ("mình xây tool biến playlist YouTube thành khóa học có tiến độ") on Viblo; a low-key thread in VOZ box Lập trình/CNTT. Long-tail VN SEO.
4. **Global one-shot (after retention signal, weeks 6+):** Show HN with the working product + a public example course (expect 25–600 signups); r/learnprogramming Saturday thread + r/webdev Showoff Saturday same week.
5. **Defer:** Product Hunt (weak audience fit), paid creator sponsorship (Boot.dev-style, scale-stage), and any Discord seeding until the founder has weeks of genuine participation there.

Measurement note: the VN-first wedge makes Stage-2 success measurable (retention of
a nameable cohort from 2–3 nameable groups) in a way the broad label cannot be.
