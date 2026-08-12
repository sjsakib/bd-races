# BD Races

Upcoming running, cycling, and triathlon events in Bangladesh.

## Site

The user-facing site is a zero-framework static page:

1. `page/events.json` is the curated source of truth
2. `pnpm build` keeps only today/future events (`Asia/Dhaka`), encodes them into a compact binary payload, and inlines the app + CSS into `dist/index.html`
3. GitHub Pages deploys `dist/`

No runtime `events.json` fetch. Opening the page does not request event data over the network.

## Commands

```bash
pnpm install
pnpm test          # unit tests
pnpm build         # write dist/
pnpm exec playwright test --project=chromium
```

Optional build pin:

```bash
pnpm build -- --as-of=2026-08-12
```

## Editing events

### Quick workflow (slash command)

Type `/fb-scrape` in Cursor, or run directly:

```bash
pnpm fb:login   # once — save Facebook session
pnpm fb:run     # collect auto pages first → scrape → agent extracts
```

`BD Runners` remains manual-last (login wall): run `fb-script.js` there and paste links after `pnpm fb:run`.

The agent handles extraction into `page/events.json`, validation, and rebuild.

Manual fallback: run `fb-script.js` in browser DevTools if Playwright collection fails.

### Manual workflow

1. Scrape/raw text lives in `raw_events/`
2. Append structured entries to `page/events.json` using the schema in `prompt.txt`
3. Run `pnpm build` and commit both the JSON and resulting workflow inputs

## Architecture

- `web/src/` — date parsing, normalization, binary codec, filters, URL state, UI
- `scripts/build-site.mjs` — production builder
- `test/` — codec/date/filter unit tests
- `e2e/` — Playwright discovery checks
