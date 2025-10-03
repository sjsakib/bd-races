const { chromium } = require("playwright");
const fs = require("fs");

const eventLinks = [
  "https://www.facebook.com/events/3969084926735782/",
  "https://www.facebook.com/events/1586485422746451/",
  "https://www.facebook.com/events/1688631351829487/",
  "https://www.facebook.com/events/1200537458509104/",
  "https://www.facebook.com/events/990306433290594/",
  "https://www.facebook.com/events/578069121638871/",
  "https://www.facebook.com/events/2618506141831658/",
  "https://www.facebook.com/events/627843053219631/",
  "https://www.facebook.com/events/490327947462459/",
  "https://www.facebook.com/events/616863397424645/",
  "https://www.facebook.com/events/969843514710713/",
  "https://www.facebook.com/events/2272538536472882/",
  "https://www.facebook.com/events/1386860609002490/",
  "https://www.facebook.com/events/1075528950815369/",
  "https://www.facebook.com/events/1079052274408765/",
  "https://www.facebook.com/events/922324983164455/",
  "https://www.facebook.com/events/1112768410830667/",
  "https://www.facebook.com/events/1325024898637276/",
  "https://www.facebook.com/events/1118960576659043/",
  "https://www.facebook.com/events/1467028837838378/",
  "https://www.facebook.com/events/555332594315963/",
  "https://www.facebook.com/events/1167593055015434/",
  "https://www.facebook.com/events/788897559329643/",
  "https://www.facebook.com/events/312098505035861/",
  "https://www.facebook.com/events/1275849290988196/",
  "https://www.facebook.com/events/1280320550366447/",
  "https://www.facebook.com/events/575514851888090/",
  "https://www.facebook.com/events/1124892606242993/",
  "https://www.facebook.com/events/1508440780167582/",
  "https://www.facebook.com/events/1594926954814145/",
  "https://www.facebook.com/events/718415788025173/",
  "https://www.facebook.com/events/1327272625627369/",
  "https://www.facebook.com/events/696249480066810/",
  "https://www.facebook.com/events/1310925940683664/",
  "https://www.facebook.com/events/1086855456646781/",
  "https://www.facebook.com/events/1050822980598826/",
  "https://www.facebook.com/events/1202979818322561/",
  "https://www.facebook.com/events/1282929109365681/",
  "https://www.facebook.com/events/2193032994458000/",
  "https://www.facebook.com/events/919710343656806/",
  "https://www.facebook.com/events/2006972836779088/",
  "https://www.facebook.com/events/1070178581747490/",
  "https://www.facebook.com/events/754073907683174/",
  "https://www.facebook.com/events/719691141122381/",
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
      const pageText = await page.innerText("body");

      // Extract event title

      const title = await page.title();

      results.push({ link, pageText });
      console.log(`Fetched: ${title}`);

      // save current page text to events/{id}.txt
      const idMatch = link.match(/events\/(\d+)/);
      if (idMatch) {
        const id = idMatch[1];
        fs.writeFileSync(`events/${id}.txt`, pageText);
      }
    } catch (err) {
      console.error(`Failed to fetch ${link}:`, err);
    }
  }

  await browser.close();

  // Save results to JSON
  fs.writeFileSync("facebook_events.json", JSON.stringify(results, null, 2));

  console.log("Done! Results saved to facebook_events.csv");
})();
