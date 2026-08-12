import fs from 'fs';
import path from 'path';
import { ROOT } from './fb-browser.mjs';

const RAW_DIR = path.join(ROOT, 'raw_events');

export async function scrapeEventPage(page, link) {
  await page.goto(link, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const closeIcon = page.locator('div[aria-label="Close"]');
  if (await closeIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
    await closeIcon.click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  const seeMoreButtons = page
    .locator('div[role="button"]')
    .filter({ hasText: 'See more' });
  const seeMoreCount = await seeMoreButtons.count();
  for (let i = 0; i < seeMoreCount; i++) {
    await seeMoreButtons.nth(i).click().catch(() => {});
    await page.waitForTimeout(500);
  }

  let pageText = await page.innerText('body');
  pageText = pageText.split('Suggested events')[0];

  const idMatch = link.match(/events\/(\d+)/);
  if (idMatch) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
    fs.writeFileSync(path.join(RAW_DIR, `${idMatch[1]}.txt`), pageText);
  }

  return { link, title: await page.title(), id: idMatch?.[1] };
}

export async function scrapeOne(context, link) {
  const page = await context.newPage();
  try {
    const result = await scrapeEventPage(page, link);
    console.error(`Scraped: ${result.title}`);
    return { ...result, ok: true };
  } catch (err) {
    console.error(`Failed ${link}: ${err.message}`);
    return { link, ok: false, error: err.message };
  } finally {
    await page.close().catch(() => {});
  }
}

export async function scrapeBatch(context, links, concurrency = 4) {
  const results = [];
  for (let i = 0; i < links.length; i += concurrency) {
    const batch = links.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((link) => scrapeOne(context, link)),
    );
    results.push(...batchResults);
  }
  return results;
}
