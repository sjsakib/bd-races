#!/usr/bin/env node
/**
 * Full automated FB scrape pipeline:
 *   collect links from all pages → diff → scrape selected events
 *
 * First-time setup:
 *   node scripts/fb-scrape-run.mjs --login
 *
 * Regular run:
 *   node scripts/fb-scrape-run.mjs
 *   pnpm fb:run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT, launchFbContext, ensureLoggedIn, loginSetup } from './fb-browser.mjs';
import { collectAllPages } from './fb-collect.mjs';
import { scrapeBatch } from './fb-scrape-page.mjs';
import { extractIds, selectEventLinks } from './fb-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES_JSON = path.join(ROOT, 'facebook-pages.json');
const EVENTS_JSON = path.join(ROOT, 'page', 'events.json');
const DEFAULT_CONCURRENCY = 4;

function parseConcurrency() {
  const idx = process.argv.indexOf('--concurrency');
  if (idx === -1) return DEFAULT_CONCURRENCY;
  return Math.max(1, Number(process.argv[idx + 1]) || DEFAULT_CONCURRENCY);
}

async function main() {
  if (process.argv.includes('--login')) {
    await loginSetup();
    return;
  }

  const collectOnly = process.argv.includes('--collect-only');
  const includeManual = process.argv.includes('--include-manual');
  const concurrency = parseConcurrency();
  const allPages = JSON.parse(fs.readFileSync(PAGES_JSON, 'utf8'));
  const pages = allPages.filter((p) => includeManual || p.scrapeMode !== 'manual');
  const manualPages = allPages.filter((p) => p.scrapeMode === 'manual');
  const events = JSON.parse(fs.readFileSync(EVENTS_JSON, 'utf8'));

  console.error(`Starting automated scrape (${pages.length} pages)...`);
  if (manualPages.length > 0 && !includeManual) {
    console.error(`Manual pages (run last by you): ${manualPages.map((p) => p.name).join(', ')}`);
  }
  const context = await launchFbContext();

  try {
    const loggedIn = await ensureLoggedIn(context);
    if (!loggedIn) {
      console.error('\nContinuing without Facebook login.');
      console.error('Some pages/events may be limited. Manual pages should be done last.');
    }

    const collected = await collectAllPages(context, pages);
    const pastedIds = extractIds(collected.allLinks.join('\n'));
    const selection = selectEventLinks(pastedIds, events);

    console.error('\nSelection:');
    console.error(`  Collected: ${collected.allLinks.length} links`);
    console.error(`  New: ${selection.summary.newCount}`);
    console.error(`  Refresh: ${selection.summary.refreshCount}`);
    console.error(`  Skipped (<3 weeks): ${selection.summary.skippedWithinThreeWeeksCount}`);

    let scraped = [];
    if (!collectOnly && selection.needsScrape.length > 0) {
      console.error(`\nScraping ${selection.needsScrape.length} events (${concurrency} parallel)...`);
      scraped = await scrapeBatch(context, selection.links, concurrency);
    } else if (selection.needsScrape.length === 0) {
      console.error('\nNothing to scrape.');
    }

    const output = {
      collected,
      selection,
      scraped,
      manualPages,
    };
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
