#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pages = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'facebook-pages.json'), 'utf8'),
);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const results = [];

for (const p of pages) {
  try {
    const resp = await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const finalUrl = page.url();
    const title = await page.title();
    const body = await page.innerText('body').catch(() => '');
    const hasLoginPrompt = /log in to facebook|email or phone|create new account|forgotten password/i.test(body)
      || finalUrl.includes('/login');
    const eventLinkCount = await page.locator('a[href*="/events/"]').count();
    const hasEventsText = /people responded|public|invite|details/i.test(body);

    let access = 'unknown';
    if (hasLoginPrompt && eventLinkCount === 0) access = 'login_required';
    else if (eventLinkCount > 0) access = 'public_or_partial';
    else if (/content isn't available|page isn't available|you must log in/i.test(body)) access = 'blocked';
    else access = 'login_required';

    results.push({
      name: p.name,
      url: p.url,
      finalUrl,
      httpStatus: resp?.status() ?? null,
      title,
      access,
      eventLinkCount,
      hasEventsText,
      bodySample: body.slice(0, 300).replace(/\s+/g, ' '),
    });
  } catch (err) {
    results.push({ name: p.name, url: p.url, access: 'error', error: err.message });
  }
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
