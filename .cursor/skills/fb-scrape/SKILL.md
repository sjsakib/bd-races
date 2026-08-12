---
name: fb-scrape
description: >-
  Semi-automated Facebook event discovery for BD Races. Runs Playwright collect+scrape,
  then MUST extract into events.json without stopping. Use for /fb-scrape or sync/scrape/
  import of Facebook running events.
disable-model-invocation: true
---

# Facebook Event Scrape Workflow

Do not stop after scrape. Extraction → sync → check → build are mandatory in the same turn.
BD Runners is fully manual and out of scope for this command — never ask the user about it here.

## Run

```bash
pnpm fb:run     # or --collect-only for discovery only
```

Collects all `scrapeMode: "auto"` pages in `facebook-pages.json`, diffs, scrapes new + up to 10 refresh (>3 weeks away) into `raw_events/<id>.txt`, prints JSON with `needsExtraction` / `needsUpdate`.

## Agent checklist (same turn, in order)

1. Parse `pnpm fb:run` JSON.
2. **Extract immediately**:
   - `needsExtraction` → append new entries to `page/events.json`
   - `needsUpdate` → re-read raw files and update matching entries
3. `node scripts/sync-fb-script.mjs`
4. `pnpm check && pnpm build`
5. Summarize: new / updated / failed IDs.

If a single event scrape fails: skip that ID, continue the rest. Do not prompt for login or manual pages.

## Extraction rules (inline — do not skip)

Read each `raw_events/<eventId>.txt` yourself (no extraction scripts). Fields:

| Field | Rule |
|-------|------|
| name | Base title; **must end with ` | {distance}k`** when distance known |
| date | Event date |
| distance | km number only: `21.1`, `10`, `5` |
| location | Comma-separated; omit "Bangladesh" |
| fee / earlyBirdFee | Per-distance when listed separately |
| website | Registration/info URL |
| tags | Comma-separated (e.g. AIMS); else null |
| responseCount | Going/interested count |
| fbLink | Canonical `https://www.facebook.com/events/<id>` |

Missing → `null`.

**Multi-distance:** one JSON object per distance. Suffix is mandatory so rows are not duplicates:

```
Turkish Airlines ActivePulse International Half Marathon 2026 | 21.1k
Turkish Airlines ActivePulse International Half Marathon 2026 | 14.6k
Turkish Airlines ActivePulse International Half Marathon 2026 | 7.3k
```

Wrong: same name, no `| Xk`. If title already has `| …`, append distance last: `Dhaka 25k 2027 | 4th Edition | 25k`.

Update `page/events.json` after each file. Skip IDs already present unless in `needsUpdate`.

Canonical copy also lives in `prompt.txt` (manual edits). Prefer these inline rules during `/fb-scrape`.

## Selection

| Links | Action |
|-------|--------|
| New | Scrape + extract |
| Known, >3 weeks away | Refresh up to 10 + update |
| Known, ≤3 weeks | Skip |

## Manual fallback (auto pages only)

If Playwright collect fails: user runs `fb-script.js` on auto pages, pastes links → `node scripts/diff-event-links.mjs --file links.txt` → `node scripts/scrape-events.mjs --profile <ids...>` → same extraction checklist.

## Notes

- Never commit unless asked.
- The Athlete X auto URL is `theathletexbd/events` (not `thexvr`).
- Key files: `facebook-pages.json`, `scripts/fb-scrape-run.mjs`, `page/events.json`, `raw_events/`.
