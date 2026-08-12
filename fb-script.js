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
  return new Promise(resolve => setTimeout(resolve, ms));
}

const existingLinks = [
  "https://www.facebook.com/events/312098505035861/",
  "https://www.facebook.com/events/490327947462459/",
  "https://www.facebook.com/events/555332594315963/",
  "https://www.facebook.com/events/575514851888090/",
  "https://www.facebook.com/events/578069121638871/",
  "https://www.facebook.com/events/616863397424645/",
  "https://www.facebook.com/events/627843053219631/",
  "https://www.facebook.com/events/647117035126903/",
  "https://www.facebook.com/events/696249480066810/",
  "https://www.facebook.com/events/718415788025173/",
  "https://www.facebook.com/events/719691141122381/",
  "https://www.facebook.com/events/721480814119087/",
  "https://www.facebook.com/events/736122422490820/",
  "https://www.facebook.com/events/754073907683174/",
  "https://www.facebook.com/events/788897559329643/",
  "https://www.facebook.com/events/789231534016799/",
  "https://www.facebook.com/events/791618880302929/",
  "https://www.facebook.com/events/813895684918436/",
  "https://www.facebook.com/events/843141418464127/",
  "https://www.facebook.com/events/853133160310612/",
  "https://www.facebook.com/events/862887989534030/",
  "https://www.facebook.com/events/865875089289213/",
  "https://www.facebook.com/events/874429415247810/",
  "https://www.facebook.com/events/874807811947144/",
  "https://www.facebook.com/events/877143868098350/",
  "https://www.facebook.com/events/913844177217876/",
  "https://www.facebook.com/events/919710343656806/",
  "https://www.facebook.com/events/922324983164455/",
  "https://www.facebook.com/events/937969906075046/",
  "https://www.facebook.com/events/956943123996248/",
  "https://www.facebook.com/events/965423769558900/",
  "https://www.facebook.com/events/969843514710713/",
  "https://www.facebook.com/events/990306433290594/",
  "https://www.facebook.com/events/993458890271153/",
  "https://www.facebook.com/events/1010845491945235/",
  "https://www.facebook.com/events/1013692704748585/",
  "https://www.facebook.com/events/1022900707025381/",
  "https://www.facebook.com/events/1050822980598826/",
  "https://www.facebook.com/events/1070178581747490/",
  "https://www.facebook.com/events/1074421331727471/",
  "https://www.facebook.com/events/1075528950815369/",
  "https://www.facebook.com/events/1079052274408765/",
  "https://www.facebook.com/events/1082351283873934/",
  "https://www.facebook.com/events/1086855456646781/",
  "https://www.facebook.com/events/1101355147958368/",
  "https://www.facebook.com/events/1112768410830667/",
  "https://www.facebook.com/events/1118960576659043/",
  "https://www.facebook.com/events/1124892606242993/",
  "https://www.facebook.com/events/1167593055015434/",
  "https://www.facebook.com/events/1180304947491265/",
  "https://www.facebook.com/events/1190198942555911/",
  "https://www.facebook.com/events/1200537458509104/",
  "https://www.facebook.com/events/1202979818322561/",
  "https://www.facebook.com/events/1222659899452620/",
  "https://www.facebook.com/events/1235906178386844/",
  "https://www.facebook.com/events/1259408212784091/",
  "https://www.facebook.com/events/1272401211011481/",
  "https://www.facebook.com/events/1280320550366447/",
  "https://www.facebook.com/events/1282929109365681/",
  "https://www.facebook.com/events/1310925940683664/",
  "https://www.facebook.com/events/1318540743030706/",
  "https://www.facebook.com/events/1325024898637276/",
  "https://www.facebook.com/events/1325592405440805/",
  "https://www.facebook.com/events/1327272625627369/",
  "https://www.facebook.com/events/1360788339140889/",
  "https://www.facebook.com/events/1380842847079499/",
  "https://www.facebook.com/events/1386860609002490/",
  "https://www.facebook.com/events/1390704139352040/",
  "https://www.facebook.com/events/1415830253475028/",
  "https://www.facebook.com/events/1440615114492109/",
  "https://www.facebook.com/events/1452407899154459/",
  "https://www.facebook.com/events/1466087721119205/",
  "https://www.facebook.com/events/1466554991895530/",
  "https://www.facebook.com/events/1467028837838378/",
  "https://www.facebook.com/events/1473419094675745/",
  "https://www.facebook.com/events/1486789102706703/",
  "https://www.facebook.com/events/1499498291346491/",
  "https://www.facebook.com/events/1508440780167582/",
  "https://www.facebook.com/events/1533362938187355/",
  "https://www.facebook.com/events/1545442873675612/",
  "https://www.facebook.com/events/1564693321868615/",
  "https://www.facebook.com/events/1580292636443073/",
  "https://www.facebook.com/events/1581162030250996/",
  "https://www.facebook.com/events/1586485422746451/",
  "https://www.facebook.com/events/1594926954814145/",
  "https://www.facebook.com/events/1623485452255305/",
  "https://www.facebook.com/events/1688631351829487/",
  "https://www.facebook.com/events/1726062901712767/",
  "https://www.facebook.com/events/1730454554535385/",
  "https://www.facebook.com/events/1874907930090863/",
  "https://www.facebook.com/events/1889865724934564/",
  "https://www.facebook.com/events/1926216974990420/",
  "https://www.facebook.com/events/2006972836779088/",
  "https://www.facebook.com/events/2015042362759677/",
  "https://www.facebook.com/events/2030356421080273/",
  "https://www.facebook.com/events/2074717453264612/",
  "https://www.facebook.com/events/2075246719758012/",
  "https://www.facebook.com/events/2193032994458000/",
  "https://www.facebook.com/events/2197453854065800/",
  "https://www.facebook.com/events/2272538536472882/",
  "https://www.facebook.com/events/2557990514659333/",
  "https://www.facebook.com/events/2618506141831658/",
  "https://www.facebook.com/events/2662673687426287/",
  "https://www.facebook.com/events/2785523131781078/",
  "https://www.facebook.com/events/3335761353244122/",
  "https://www.facebook.com/events/3969084926735782/",
  "https://www.facebook.com/events/4114741255449245/",
  "https://www.facebook.com/events/4201789890037762/",
  "https://www.facebook.com/events/4270751369837883/",
  "https://www.facebook.com/events/4302421213353095/",
  "https://www.facebook.com/events/4327873190767523/",
  "https://www.facebook.com/events/25923606837328023/",
];

(async function () {
  console.log(
    '%cStarting the Event Link Scraper...',
    'color: #28a745; font-weight: bold;',
  );

  // Use a Set to store unique links automatically.
  const uniqueCleanedLinks = new Set(existingLinks);

  // keep clicking the see more button if it exists
  // as logn as thre is two see more buttons keep clicking the first one
  let seeMoreClickCount = 1;
  while (true) {
    const seeMoreButtons = Array.from(
      document.querySelectorAll('div[role="button"]'),
    ).filter(btn => btn.innerText.toLowerCase().includes('see more'));

    if (seeMoreButtons.length >= 2) {
      console.log(
        `%cClicking "See More" button to load more content..., Click count: ${
          seeMoreClickCount
        }`,
        'color: #ffc107;',
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

    eventLinks.forEach(link => {
      // The .href property gives the full, absolute URL.
      const fullUrl = link.href;
      let cleanedUrl;

      // Clean the URL by removing the query string and everything after it.
      if (fullUrl.includes('?')) {
        cleanedUrl = fullUrl.substring(0, fullUrl.indexOf('?'));
      } else {
        cleanedUrl = fullUrl;
      }

      // If the link isn't already in our set, log it and add it.
      if (!uniqueCleanedLinks.has(cleanedUrl)) {
        console.log(`%c  -> New link found: ${cleanedUrl}`, 'color: #007bff;');
        uniqueCleanedLinks.add(cleanedUrl);
      }
    });

    // Provide feedback in the console about the progress.
    if (uniqueCleanedLinks.size > currentLinkCount) {
      const newLinksFound = uniqueCleanedLinks.size - currentLinkCount;
      console.log(
        `%cFound ${newLinksFound} new link(s) this interval. Total unique links: ${uniqueCleanedLinks.size}`,
        'color: #17a2b8;',
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
        'color: #dc3545; font-weight: bold;',
      );
      logFinalResults();
    } else {
      // Scroll to the bottom of the page to load more content.
      window.scrollTo(0, document.body.scrollHeight);
    }
  };
  // This function logs the final results to the console.
  const logFinalResults = () => {
    console.log('\n--- Scraping Complete ---');
    console.log(`Total unique event links found: ${uniqueCleanedLinks.size}`);
    console.log(
      '%cTo copy all links to your clipboard, run the following command in the console:',
      'font-weight: bold;',
    );

    // Make the data easily accessible in the console.
    window.allEventLinks = Array.from(uniqueCleanedLinks);
    console.log("copy(window.allEventLinks.join('\\n'))");
  };
  // Start the scraper.
  const scraperIntervalId = setInterval(scrapeAndScroll, SCROLL_INTERVAL);

  console.log('Scraper is running. It will scroll down every 2 seconds.');
  console.log(
    '%cTo stop manually, type this into the console and press Enter:',
    'color: #ffc107;',
  );
  console.log(`clearInterval(${scraperIntervalId})`);
})();
