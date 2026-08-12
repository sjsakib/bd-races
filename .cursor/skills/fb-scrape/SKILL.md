---
name: fb-scrape
description: >-
  Semi-automated Facebook event discovery workflow for BD Races. Runs Playwright
  to collect links from all configured pages, scrape new events plus up to 10
  refreshes for events more than 3 weeks away, then agent extracts into
  events.json. Use when the user invokes /fb-scrape or asks to sync, scrape,
  or import Facebook running events.
disable-model-invocation: true
---

# Facebook Event Scrape Workflow

## Automated mode (default)

One command collects from all auto pages, diffs, and scrapes. Manual-only pages are handled by the user at the end.

### First-time setup

```bash
pnpm fb:login
```

Log in to Facebook in the opened browser, then press Enter in the terminal. Session is saved to `.playwright-fb-profile/`.

### Each run

```bash
pnpm fb:run
```

This will:
1. Open all `scrapeMode: "auto"` pages from `facebook-pages.json` in parallel tabs
2. Scroll and collect event links (same logic as `fb-script.js`)
3. Select: all new links + up to 10 known links more than 3 weeks away
4. Scrape selected events into `raw_events/<id>.txt`

Then the agent:
1. Extracts new events (`needsExtraction`) and updates refreshed ones (`needsUpdate`) in `page/events.json` per `prompt.txt`
2. Runs `node scripts/sync-fb-script.mjs`
3. Runs `pnpm check && pnpm build`
4. Summarizes results

### When `/fb-scrape` is invoked

Run `pnpm fb:run` (or `--collect-only` if user only wants link discovery). Parse the JSON output and proceed with extraction.

Then prompt the user to run `fb-script.js` manually for any `manualPages` returned by the command output (for now, `BD Runners`), and paste those links so they can be merged into the same scrape cycle.

If login fails, tell user to run `pnpm fb:login` first.

## Manual fallback

If Playwright collection fails (Facebook blocks, layout change):

1. User runs `fb-script.js` manually on each page
2. User pastes links
3. Agent runs `node scripts/diff-event-links.mjs --file links.txt`
4. Agent runs `node scripts/scrape-events.mjs --profile <ids...>`

## Selection rules

- **All new links** → scrape + extract
- **Up to 10 known links** more than **3 weeks away** → re-scrape + update
- **Known links within 3 weeks** → skip (registration likely closed)

## Key files

| File | Purpose |
|------|---------|
| `facebook-pages.json` | Scrape sources with `scrapeMode` (auto/manual) |
| `scripts/fb-scrape-run.mjs` | Full automated pipeline |
| `scripts/fb-collect.mjs` | Link collection from listing pages |
| `scripts/fb-scrape-page.mjs` | Single event page scraper |
| `scripts/fb-browser.mjs` | Persistent Facebook login profile |
| `scripts/diff-event-links.mjs` | Select new + refresh targets |
| `fb-script.js` | Manual browser fallback |
| `page/events.json` | Curated event data |
| `prompt.txt` | Extraction schema |

## Rules

- Never commit unless the user asks
- If scrape fails (login wall, timeout), tell the user and skip that ID
- If `pnpm check` fails, fix missing entries before building
