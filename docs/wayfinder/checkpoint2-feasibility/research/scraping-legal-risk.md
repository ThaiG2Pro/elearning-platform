---
ticket: checkpoint2-feasibility/03
title: ToS/legal exposure of unofficial YouTube transcript extraction + blog scraping at planned scale
status: closed
---

# Research: transcript/blog scraping legal exposure

## Findings

### 1. Historical precedent — has Google/YouTube gone after transcript libraries specifically?

- No lawsuit, cease-and-desist, or DMCA takedown was found targeting a
  transcript-extraction library specifically (`youtube-transcript-api`,
  `youtube-transcript-plus`, `youtubei.js`, or similar). These remain
  live, maintained GitHub repos with no legal-action history.
- The one prominent GitHub/Google-adjacent takedown precedent is
  **`youtube-dl`** (Oct 2020): GitHub disabled the repo after a **RIAA**
  DMCA notice (not Google/YouTube) alleging the *download* functionality
  circumvented technical protection measures under DMCA §1201 — i.e. it
  was about ripping video/audio files, not reading caption text. GitHub
  reinstated the repo three weeks later after EFF pushback, calling the
  takedown overreach, and rewrote its §1201 review process. This is not
  a good analogy for transcript reading: captions are not
  access-controlled/DRM'd content, so the §1201 theory that hit
  `youtube-dl` doesn't map onto a transcript library.
  Sources: https://www.eff.org/deeplinks/2020/11/github-reinstates-youtube-dl-after-riaas-abuse-dmca ,
  https://github.blog/news-insights/policy-news-and-insights/standing-up-for-developers-youtube-dl-is-back/
- The actual enforcement mechanism YouTube uses against unofficial
  transcript/scraping libraries is **technical, not legal**: aggressive
  IP-based rate limiting and blocking, especially of known cloud/VPS/
  datacenter IP ranges (AWS, GCP, Azure), HTTP 429s, and occasional
  CAPTCHA challenges — not cease-and-desist letters against individual
  developers or small apps. Multiple maintainers/users report this as
  the practical failure mode (breakage on IP block, not legal threat).
  Sources: https://discuss.huggingface.co/t/how-to-avoid-ip-bans-when-using-youtube-transcript-api-to-fetch-youtube-video-transcripts/165346 ,
  general library-guide summaries e.g. https://skipthewatch.com/blog/youtube-transcript-api-guide

### 2. What YouTube's ToS actually say

- YouTube's Terms of Service prohibit accessing the Service "using any
  automated means (such as robots, botnets, or scrapers)" except (a)
  public search engines per YouTube's `robots.txt`, or (b) with
  YouTube's prior written permission.
- Separately, the **YouTube API Services Terms of Service** (governing
  the official Data API) bar use of *undocumented* API surfaces and
  require accessing YouTube API data "only according to the means
  stipulated in the authorized documentation." The unofficial libraries
  in question don't use the official Data API at all — they scrape the
  same internal/timedtext endpoints the YouTube web player calls
  client-side, which are technically unauthenticated/public but
  undocumented for third-party use.
  Source: https://developers.google.com/youtube/terms/api-services-terms-of-service
- Net effect: this is squarely a **ToS/contract-breach gray zone**, not
  a "the content is access-controlled" situation. Violating YouTube's
  ToS is a contract matter between the end user (or app) and Google —
  enforceable in principle, but YouTube's own conduct (not suing
  individual small-scale scrapers, only rate-limiting) shows they treat
  it as a low-priority nuisance, not something worth active legal
  pursuit against low-volume, non-commercial-feeling use.

### 3. General web-scraping legal landscape (for the blog/`@mozilla/readability` piece)

- **hiQ Labs v. LinkedIn** (9th Cir., final resolution Dec 2022): The
  2019/2022 Ninth Circuit rulings held scraping *publicly accessible*
  data does not violate the CFAA (the federal anti-hacking statute) —
  confirmed unaffected by the Supreme Court's *Van Buren* (2021)
  decision, which independently held that violating a website's ToS
  after being granted access is not "unauthorized access" under CFAA.
  However, hiQ ultimately **lost on breach-of-contract grounds**: in
  Nov 2022 the district court ruled hiQ breached LinkedIn's User
  Agreement by scraping profile data, and the parties settled in Dec
  2022 with hiQ paying LinkedIn $500k and agreeing to a permanent
  injunction + deletion of all scraped data/derived code.
  Sources: https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn ,
  https://www.morganlewis.com/blogs/sourcingatmorganlewis/2022/12/linkedin-v-hiq-landmark-data-scraping-suit-provides-guidance-to-data-scrapers-and-web-operators ,
  https://www.eff.org/deeplinks/2022/04/scraping-public-websites-still-isnt-crime-court-appeals-declares
- **Takeaway from case law**: scraping public pages is not a *criminal*
  act (CFAA doesn't reach it post-*Van Buren*), but it can still be a
  **civil contract claim** (ToS breach) if the target site has an
  enforceable ToS and actually chooses to sue — which large platforms
  with resources (LinkedIn) do against commercial-scale competitors,
  not against individual users fetching a page they're already reading
  in their own browser.
- **robots.txt** has no independent legal force — it's a voluntary
  crawler-courtesy convention, not "access control" in a legal sense
  (courts have described it as more like a "keep off the grass" sign
  than a lock). Ignoring it is evidence of bad faith in a dispute, not
  a standalone violation.
  Source: https://tagteam.harvard.edu/hub_feeds/3626/feed_items/17129936/content
- **Copyright** is the more relevant risk vector for
  `@mozilla/readability`-style scraping than CFAA/ToS: extracting and
  *storing/redistributing* a blog's full article text (not just
  reading it transiently to summarize) risks copyright claims if done
  at scale or republished; using it transiently as input to a
  summarizer for the same user who supplied the URL is much closer to
  personal/fair use than a scraping business that republishes content.
  General guides converge on: factual data = lower risk, creative
  prose = higher risk, verbatim bulk republishing = highest risk.
  Source: https://www.scrapingbee.com/blog/is-web-scraping-legal/ (representative of the consensus across the surveyed guides)

### 4. Does this materially threaten a dozens-hundreds-of-users, non-commercial-feeling product?

- **Volume**: the described usage pattern (each user fetches a
  transcript/blog page *they themselves* navigated to, once, for their
  own learning) is orders of magnitude below the volume that triggers
  IP-based YouTube rate-limiting in practice (reports cite issues
  emerging around 100-500+ requests/hour from a single IP/host) and far
  below what has drawn a lawsuit against any platform to date — hiQ's
  suit was about a commercial competitor systematically re-scraping
  LinkedIn's entire user base for a paid product built for HR
  customers.
- **Nature of use**: no known case or ToS enforcement action targets an
  individual/small tool that fetches a transcript once per user
  request for personal summarization — this pattern (browser
  extensions, note-taking tools, personal AI assistants) is extremely
  common and widely tolerated in practice; it is explicitly what the
  design doc's `TranscriptProvider` isolation-behind-an-interface
  choice is defending against (breakage risk), not what it's exposed
  to legally.
- This is best characterized as an **accepted, typical risk that a
  large ecosystem of similar tools already takes on** (transcript
  summarizer extensions/apps, read-it-later tools with content
  extraction, etc. — none of which have been shut down by YouTube legal
  action at this scale), not a novel or heightened exposure specific to
  this project.

## Verdict

The plan's reliance on unofficial YouTube transcript libraries and
`@mozilla/readability` blog scraping carries a real but low, well-precedented
risk profile at Checkpoint 2-3 scale (dozens-hundreds of users, each fetching
content they navigated to themselves, no republishing/redistribution). No
lawsuit or DMCA action has ever targeted a transcript-extraction library or
app for reading captions; the only precedent in this space (`youtube-dl`,
2020) concerned a different legal theory (DMCA §1201 circumvention of DRM'd
downloads) that does not apply to caption text. YouTube's actual enforcement
mechanism against unofficial scraping is technical (IP rate-limiting/blocking)
rather than legal, and it targets high-volume/datacenter traffic, not
low-volume per-user fetches. `hiQ v. LinkedIn` confirms scraping public pages
isn't criminal (CFAA) but can be a civil ToS/contract claim — a risk platforms
pursue against commercial-scale competitors, not personal-use tools at this
scale; `@mozilla/readability`'s copyright exposure is likewise low because
content is used transiently for the requesting user's own summary, not
stored/republished. **Conclusion: this does not materially threaten the
product at the planned scale — it is the same accepted risk every comparable
transcript-summarizer/read-it-later tool already runs on, and the design
doc's existing mitigation (isolate behind a `TranscriptProvider` interface for
breakage resilience) is the right and sufficient response; no additional
legal mitigation is warranted before Checkpoint 2-3.** If usage ever grows
into bulk/redistributive territory (e.g. reselling a transcript database, or
serving thousands of requests/day from shared infra IPs), this verdict should
be revisited.
