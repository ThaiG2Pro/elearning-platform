# Local-Markdown Issue Tracker — Conventions

No external issue tracker (GitHub/Redmine/etc.) was configured for this repo, so
wayfinder defaults to a flat markdown tracker living under `docs/wayfinder/`.
This file is the "tracker doc" wayfinder sessions consult for how maps,
tickets, blocking, and frontier queries are expressed here.

## Layout

```
docs/wayfinder/
  TRACKER.md                          — this file
  <map-slug>/
    map.md                            — the map (frontmatter: label: wayfinder:map)
    tickets/
      <NN>-<slug>.md                  — child tickets
    research/
      <slug>.md                       — findings from research tickets (optional;
                                         a ticket may instead point at a
                                         research/<name> git branch)
```

## Ticket frontmatter

```yaml
---
id: <map-slug>/<NN>
title: <ticket title>
label: wayfinder:<research|prototype|grilling|task>
status: open | closed
assignee: null | "<name>"
blocked_by: [<map-slug>/<NN>, ...]   # ids of other tickets in this map
---
## Question
<the decision or investigation>

## Resolution        <!-- appended only once closed -->
<the answer, or a pointer to where it lives (branch, doc, asset)>
```

## Wayfinding operations

- **Claim**: set `assignee` in the ticket's frontmatter (commit the change) —
  before any work on it.
- **Frontier query**: open tickets where `assignee: null` and every id listed
  in `blocked_by` belongs to a ticket with `status: closed`. Run by scanning
  `tickets/*.md` frontmatter (grep/read — no query language, it's just files).
- **Resolve**: append a `## Resolution` section, flip `status: closed`.
- **Record on the map**: append one line to the map's `## Decisions so far`,
  linking the closed ticket's relative file path, with a one-line gist.
- **Blocking**: convention-based via the `blocked_by` frontmatter list —
  this tracker has no native dependency graph, so blocking is *not* visible
  in any UI; a session must read `blocked_by` to know the frontier.
- **Research findings**: a research ticket may capture its findings either
  inline in `research/<slug>.md` (simplest, same working tree) or on a
  throwaway `research/<slug>` git branch, per the wayfinder skill's default —
  either way the ticket's `## Resolution` must point at wherever the findings
  actually live.
