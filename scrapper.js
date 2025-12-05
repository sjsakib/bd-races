const { chromium } = require("playwright");
const fs = require("fs");

const eventLinks = [
  "https://www.facebook.com/events/4327873190767523/",
  "https://www.facebook.com/events/813797948216188/",
  "https://www.facebook.com/events/4270751369837883/",
  "https://www.facebook.com/events/1466087721119205/",
  "https://www.facebook.com/events/843141418464127/",
  "https://www.facebook.com/events/2662673687426287/",
  "https://www.facebook.com/events/1415830253475028/",
  "https://www.facebook.com/events/874429415247810/",
  "https://www.facebook.com/events/4201789890037762/"

];

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const results = [];

  for (const link of eventLinks) {
    try {
      await page.goto(link, { waitUntil: "domcontentloaded" });

      // Wait for main content to load
      await page.waitForTimeout(3000);

      const closeIcon = page.locator('div[aria-label="Close"]');
      if (await closeIcon.isVisible({ timeout: 5000 })) {
        await closeIcon.click().catch(() => {});
        await page.waitForTimeout(1000);
      }

      const seeMoreButtons = page
        .locator('div[role="button"]')
        .filter({ hasText: "See more" });
      const seeMoreCount = await seeMoreButtons.count();
      for (let i = 0; i < seeMoreCount; i++) {
        await seeMoreButtons
          .nth(i)
          .click()
          .catch(() => {});
        await page.waitForTimeout(500);
      }

      // grab innter text of body
      let pageText = await page.innerText("body");

      // remove everyting after "Suggested Events"
      pageText = pageText.split("Suggested events")[0];

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
  fs.writeFileSync(
    "./raw_events/facebook_events.json",
    JSON.stringify(results, null, 2),
  );

  console.log("Done! Results saved to facebook_events.csv");
})();
