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

1. Scrape/raw text lives in `raw_events/`
2. Append structured entries to `page/events.json` using the schema in `prompt.txt`
3. Run `pnpm build` and commit both the JSON and resulting workflow inputs

## Architecture

- `web/src/` — date parsing, normalization, binary codec, filters, URL state, UI
- `scripts/build-site.mjs` — production builder
- `test/` — codec/date/filter unit tests
- `e2e/` — Playwright discovery checks
