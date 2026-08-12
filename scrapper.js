const { chromium } = require('playwright');
const fs = require('fs');

const eventLinks = [
  'https://www.facebook.com/events/862887989534030/',
  'https://www.facebook.com/events/874807811947144/',
  'https://www.facebook.com/events/937969906075046/',
  'https://www.facebook.com/events/965423769558900/',
  'https://www.facebook.com/events/993458890271153/',
  'https://www.facebook.com/events/1010845491945235/',
  'https://www.facebook.com/events/1013692704748585/',
  'https://www.facebook.com/events/1022900707025381/',
  'https://www.facebook.com/events/1074421331727471/',
  'https://www.facebook.com/events/1222659899452620/',
  'https://www.facebook.com/events/1318540743030706/',
  'https://www.facebook.com/events/1360788339140889/',
  'https://www.facebook.com/events/1440615114492109/',
  'https://www.facebook.com/events/1466554991895530/',
  'https://www.facebook.com/events/1473419094675745/',
  'https://www.facebook.com/events/1486789102706703/',
  'https://www.facebook.com/events/1533362938187355/',
  'https://www.facebook.com/events/1545442873675612/',
  'https://www.facebook.com/events/1564693321868615/',
  'https://www.facebook.com/events/1580292636443073/',
  'https://www.facebook.com/events/1581162030250996/',
  'https://www.facebook.com/events/1623485452255305/',
  'https://www.facebook.com/events/1726062901712767/',
  'https://www.facebook.com/events/2015042362759677/',
  'https://www.facebook.com/events/2074717453264612/',
  'https://www.facebook.com/events/2075246719758012/',
  'https://www.facebook.com/events/2557990514659333/',
  'https://www.facebook.com/events/2785523131781078/',
  'https://www.facebook.com/events/3032204710445002/',
  'https://www.facebook.com/events/3335761353244122/',
  'https://www.facebook.com/events/25923606837328023/',
];

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const results = [];

  for (const link of eventLinks) {
    try {
      await page.goto(link, { waitUntil: 'domcontentloaded' });

      // Wait for main content to load
      await page.waitForTimeout(3000);

      const closeIcon = page.locator('div[aria-label="Close"]');
      if (await closeIcon.isVisible({ timeout: 5000 })) {
        await closeIcon.click().catch(() => {});
        await page.waitForTimeout(1000);
      }

      const seeMoreButtons = page
        .locator('div[role="button"]')
        .filter({ hasText: 'See more' });
      const seeMoreCount = await seeMoreButtons.count();
      for (let i = 0; i < seeMoreCount; i++) {
        await seeMoreButtons
          .nth(i)
          .click()
          .catch(() => {});
        await page.waitForTimeout(500);
      }

      // grab innter text of body
      let pageText = await page.innerText('body');

      // remove everyting after "Suggested Events"
      pageText = pageText.split('Suggested events')[0];

      // Extract event title
      const title = await page.title();

      results.push({ link, pageText });
      console.log(`Fetched: ${title}`);

      // save current page text to events/{id}.txt
      const idMatch = link.match(/events\/(\d+)/);
      if (idMatch) {
        const id = idMatch[1];
        fs.writeFileSync(`raw_events/${id}.txt`, pageText);
      }
    } catch (err) {
      console.error(`Failed to fetch ${link}:`, err);
    }
  }

  await browser.close();

  // Save results to JSON
  fs.writeFileSync('./raw_events/facebook_events.json', JSON.stringify(results, null, 2));

  console.log('Done! Results saved to facebook_events.csv');
})();
