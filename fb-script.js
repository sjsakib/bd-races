/**
 * Event Link Scraper
 *
 * This script automates the process of finding all unique links containing "/events/"
 * on the current web page. It continuously scrolls down to load new content,
 * collects the links, removes any URL query parameters (e.g., everything after '?'),
 * and stores only the unique, cleaned links.
 *
 * How it works:
 * 1. A `Set` is used to store links, which automatically ensures uniqueness.
 * 2. A `setInterval` function runs every 2 seconds to perform the main tasks.
 * 3. In each interval, it finds all `<a>` tags with `href` containing "/events/".
 * 4. It cleans each URL by removing the query string.
 * 5. It scrolls to the bottom of the page to trigger an infinite scroll and load more content.
 * 6. It keeps track of progress and will automatically stop if no new links are found
 * after 5 consecutive scrolls, assuming it has reached the end of the page.
 * 7. Finally, it prints instructions on how to view the complete list of collected links.
 */

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const existingLinks = [
  "https://www.facebook.com/events/1050822980598826/",
  "https://www.facebook.com/events/1070178581747490/",
  "https://www.facebook.com/events/1075528950815369/",
  "https://www.facebook.com/events/1079052274408765/",
  "https://www.facebook.com/events/1086855456646781/",
  "https://www.facebook.com/events/1112768410830667/",
  "https://www.facebook.com/events/1118960576659043/",
  "https://www.facebook.com/events/1124892606242993/",
  "https://www.facebook.com/events/1167593055015434/",
  "https://www.facebook.com/events/1200537458509104/",
  "https://www.facebook.com/events/1202979818322561/",
  "https://www.facebook.com/events/1275849290988196/",
  "https://www.facebook.com/events/1280320550366447/",
  "https://www.facebook.com/events/1282929109365681/",
  "https://www.facebook.com/events/1310925940683664/",
  "https://www.facebook.com/events/1325024898637276/",
  "https://www.facebook.com/events/1327272625627369/",
  "https://www.facebook.com/events/1386860609002490/",
  "https://www.facebook.com/events/1467028837838378/",
  "https://www.facebook.com/events/1508440780167582/",
  "https://www.facebook.com/events/1586485422746451/",
  "https://www.facebook.com/events/1594926954814145/",
  "https://www.facebook.com/events/1688631351829487/",
  "https://www.facebook.com/events/2006972836779088/",
  "https://www.facebook.com/events/2193032994458000/",
  "https://www.facebook.com/events/2272538536472882/",
  "https://www.facebook.com/events/2618506141831658/",
  "https://www.facebook.com/events/312098505035861/",
  "https://www.facebook.com/events/3969084926735782/",
  "https://www.facebook.com/events/490327947462459/",
  "https://www.facebook.com/events/555332594315963/",
  "https://www.facebook.com/events/575514851888090/",
  "https://www.facebook.com/events/578069121638871/",
  "https://www.facebook.com/events/616863397424645/",
  "https://www.facebook.com/events/627843053219631/",
  "https://www.facebook.com/events/696249480066810/",
  "https://www.facebook.com/events/718415788025173/",
  "https://www.facebook.com/events/719691141122381/",
  "https://www.facebook.com/events/754073907683174/",
  "https://www.facebook.com/events/788897559329643/",
  "https://www.facebook.com/events/919710343656806/",
  "https://www.facebook.com/events/922324983164455/",
  "https://www.facebook.com/events/969843514710713/",
  "https://www.facebook.com/events/990306433290594/",
  "https://www.facebook.com/events/1874907930090863/",
  "https://www.facebook.com/events/2197453854065800/",
];

(async function () {
  console.log(
    "%cStarting the Event Link Scraper...",
    "color: #28a745; font-weight: bold;",
  );

  // Use a Set to store unique links automatically.
  const uniqueCleanedLinks = new Set(existingLinks);

  // keep clicking the see more button if it exists
  // as logn as thre is two see more buttons keep clicking the first one
  let seeMoreClickCount = 1;
  while (true) {
    const seeMoreButtons = Array.from(
      document.querySelectorAll('div[role="button"]'),
    ).filter((btn) => btn.innerText.toLowerCase().includes("see more"));

    if (seeMoreButtons.length >= 2) {
      console.log(
        `%cClicking "See More" button to load more content..., Click count: ${
          seeMoreClickCount
        }`,
        "color: #ffc107;",
      );
      seeMoreButtons[0].click();
      seeMoreClickCount++;
      // wait for 2 seconds to let the content load
      await wait(2000);
    } else {
      break;
    }
  }

  let noNewLinksCounter = 0;
  const SCROLL_INTERVAL = 5000;
  // Time between scrolls in milliseconds (2 seconds).
  const STOP_AFTER_IDLE_INTERVALS = 2;
  // Stop after 5 scrolls with no new links.

  // This is the main function that finds links and scrolls the page.
  const scrapeAndScroll = () => {
    const currentLinkCount = uniqueCleanedLinks.size;

    // Find all anchor tags where the href attribute contains "/events/".
    const eventLinks = document.querySelectorAll('a[href*="/events/"]');

    eventLinks.forEach((link) => {
      // The .href property gives the full, absolute URL.
      const fullUrl = link.href;
      let cleanedUrl;

      // Clean the URL by removing the query string and everything after it.
      if (fullUrl.includes("?")) {
        cleanedUrl = fullUrl.substring(0, fullUrl.indexOf("?"));
      } else {
        cleanedUrl = fullUrl;
      }

      // If the link isn't already in our set, log it and add it.
      if (!uniqueCleanedLinks.has(cleanedUrl)) {
        console.log(`%c  -> New link found: ${cleanedUrl}`, "color: #007bff;");
        uniqueCleanedLinks.add(cleanedUrl);
      }
    });

    // Provide feedback in the console about the progress.
    if (uniqueCleanedLinks.size > currentLinkCount) {
      const newLinksFound = uniqueCleanedLinks.size - currentLinkCount;
      console.log(
        `%cFound ${newLinksFound} new link(s) this interval. Total unique links: ${uniqueCleanedLinks.size}`,
        "color: #17a2b8;",
      );
      noNewLinksCounter = 0;
      // Reset the idle counter since we found new content.
    } else {
      console.log(
        `No new links found this interval. Total unique links: ${uniqueCleanedLinks.size}`,
      );
      noNewLinksCounter++;
    }

    // Check if the script should stop automatically.
    if (noNewLinksCounter >= STOP_AFTER_IDLE_INTERVALS) {
      clearInterval(scraperIntervalId);
      console.log(
        `\n%cScraper stopped automatically after ${STOP_AFTER_IDLE_INTERVALS} scrolls with no new links.`,
        "color: #dc3545; font-weight: bold;",
      );
      logFinalResults();
    } else {
      // Scroll to the bottom of the page to load more content.
      window.scrollTo(0, document.body.scrollHeight);
    }
  };
  // This function logs the final results to the console.
  const logFinalResults = () => {
    console.log("\n--- Scraping Complete ---");
    console.log(`Total unique event links found: ${uniqueCleanedLinks.size}`);
    console.log(
      "%cTo copy all links to your clipboard, run the following command in the console:",
      "font-weight: bold;",
    );

    // Make the data easily accessible in the console.
    window.allEventLinks = Array.from(uniqueCleanedLinks);
    console.log("copy(window.allEventLinks.join('\\n'))");
  };
  // Start the scraper.
  const scraperIntervalId = setInterval(scrapeAndScroll, SCROLL_INTERVAL);

  console.log("Scraper is running. It will scroll down every 2 seconds.");
  console.log(
    "%cTo stop manually, type this into the console and press Enter:",
    "color: #ffc107;",
  );
  console.log(`clearInterval(${scraperIntervalId})`);
})();
