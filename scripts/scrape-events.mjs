#!/usr/bin/env node
/**
 * Scrape Facebook event pages into raw_events/<id>.txt (parallel batches).
 *
 * Usage:
 *   node scripts/scrape-events.mjs 123456789 987654321
 *   echo "https://facebook.com/events/123" | node scripts/scrape-events.mjs
 *   node scripts/scrape-events.mjs --file links.txt
 *   node scripts/scrape-events.mjs --concurrency 4 <ids...>
 *
 * Prefer `pnpm fb:run` for the full automated pipeline with saved login.
 */

import fs from 'fs';
import { chromium } from 'playwright';
import { ID_RE } from './fb-utils.mjs';
import { launchFbContext, ensureLoggedIn } from './fb-browser.mjs';
import { scrapeBatch } from './fb-scrape-page.mjs';

const DEFAULT_CONCURRENCY = 4;

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function toLinks(input) {
  const ids = new Set();
  for (const m of input.matchAll(new RegExp(ID_RE, 'gi'))) {
    ids.add(m[1]);
  }
  for (const token of input.split(/\s+/)) {
    if (/^\d+$/.test(token)) ids.add(token);
  }
  return [...ids].map((id) => `https://www.facebook.com/events/${id}/`);
}

function parseConcurrency() {
  const idx = process.argv.indexOf('--concurrency');
  if (idx === -1) return DEFAULT_CONCURRENCY;
  return Math.max(1, Number(process.argv[idx + 1]) || DEFAULT_CONCURRENCY);
}

async function main() {
  let input = '';
  const concurrency = parseConcurrency();
  const useProfile = process.argv.includes('--profile');

  const fileArg = process.argv.indexOf('--file');
  const args = process.argv.filter(
    (a, i) => !['--concurrency', '--profile'].includes(a)
      && a !== String(concurrency)
      && (fileArg === -1 || (i !== fileArg && i !== fileArg + 1)),
  );

  if (fileArg !== -1) {
    input = fs.readFileSync(process.argv[fileArg + 1], 'utf8');
  } else if (args.length > 2) {
    input = args.slice(2).join('\n');
  } else {
    input = await readStdin();
  }

  const links = toLinks(input);
  if (links.length === 0) {
    console.error('No event links or IDs provided.');
    process.exit(1);
  }

  console.error(`Scraping ${links.length} events (${concurrency} parallel)...`);

  let context;
  let browser;
  if (useProfile) {
    context = await launchFbContext();
    if (!(await ensureLoggedIn(context))) {
      console.error('Not logged in. Run: pnpm fb:login');
      process.exit(1);
    }
  } else {
    browser = await chromium.launch({ headless: false });
    context = browser;
  }

  const results = await scrapeBatch(context, links, concurrency);

  if (browser) await browser.close();
  else await context.close();

  console.log(JSON.stringify({ scraped: results }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
