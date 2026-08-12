import { extractIds } from './fb-utils.mjs';

const SCROLL_INTERVAL_MS = 5000;
const STOP_AFTER_IDLE = 2;

async function clickSeeMore(page) {
  while (true) {
    const seeMore = page.locator('div[role="button"]').filter({ hasText: /see more/i });
    const count = await seeMore.count();
    if (count < 2) break;
    await seeMore.first().click().catch(() => {});
    await page.waitForTimeout(2000);
  }
}

async function collectLinksFromPage(page) {
  const links = new Set();
  let idle = 0;

  while (idle < STOP_AFTER_IDLE) {
    const before = links.size;
    const hrefs = await page.$$eval('a[href*="/events/"]', (anchors) =>
      anchors.map((a) => {
        const url = a.href;
        return url.includes('?') ? url.substring(0, url.indexOf('?')) : url;
      }),
    );
    for (const href of hrefs) links.add(href);

    if (links.size === before) idle += 1;
    else idle = 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(SCROLL_INTERVAL_MS);
  }

  return links;
}

/** Collect event links from a Facebook events listing page. */
export async function collectFromPage(page, { name, url }) {
  console.error(`Collecting: ${name}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await clickSeeMore(page);
  const links = await collectLinksFromPage(page);
  console.error(`  → ${links.size} links from ${name}`);
  return { name, url, links: [...links] };
}

/** Collect from all pages in parallel (one tab each). */
export async function collectAllPages(context, pages) {
  const tabs = await Promise.all(pages.map(() => context.newPage()));
  try {
    const results = await Promise.all(
      tabs.map((tab, i) => collectFromPage(tab, pages[i])),
    );
    const allLinks = new Set();
    for (const r of results) {
      for (const link of r.links) allLinks.add(link);
    }
    return {
      byPage: results,
      allLinks: [...allLinks],
      allIds: [...extractIds([...allLinks].join('\n'))],
    };
  } finally {
    for (const tab of tabs) await tab.close().catch(() => {});
  }
}
