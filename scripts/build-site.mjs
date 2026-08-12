#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

import { encodeEvents, decodeEvents } from "../web/src/codec.ts";
import { todayYmd, formatYmd, isoDateFromYmd } from "../web/src/date.ts";
import { eventJsonLd } from "../web/src/format.ts";
import {
  filterFutureEvents,
  normalizeAll,
} from "../web/src/normalize.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const eventsPath = path.join(root, "page", "events.json");
const templatePath = path.join(root, "web", "template.html");
const stylesPath = path.join(root, "web", "src", "styles.css");
const appEntry = path.join(root, "web", "src", "app.ts");
const distDir = path.join(root, "dist");

function parseArgs(argv) {
  const args = { asOf: null };
  for (const arg of argv) {
    if (arg.startsWith("--as-of=")) {
      const value = arg.slice("--as-of=".length);
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) {
        throw new Error(`Invalid --as-of value: ${value}`);
      }
      args.asOf =
        Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3]);
    }
  }
  return args;
}

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

function sha256Base64(content) {
  return createHash("sha256").update(content).digest("base64");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="title">
  <title id="title">Running events</title>
  <defs>
    <radialGradient id="bg" cx="30%" cy="20%" r="90%">
      <stop offset="0" stop-color="#29483b"/>
      <stop offset="1" stop-color="#101a16"/>
    </radialGradient>
    <linearGradient id="runner" x1="18" y1="12" x2="51" y2="50" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f4ffe0"/>
      <stop offset="0.38" stop-color="#d7ff4e"/>
      <stop offset="1" stop-color="#a9dc28"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#bg)"/>
  <path d="M7 27h10M5 35h12M8 43h8" fill="none" stroke="#ff5a1f" stroke-width="3.5" stroke-linecap="round"/>
  <g fill="none" stroke="url(#runner)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M33 23l-9 6-7-4M35 23l8 6 7-5" stroke-width="5.5"/>
    <path d="M34 22l-5 13 7 3" stroke-width="7"/>
    <path d="M30 35l-8 9-9 5M36 38l9 4 7 8" stroke-width="6.5"/>
  </g>
  <circle cx="39.5" cy="13.5" r="5.5" fill="#d7ff4e"/>
  <path d="M9 54h46" stroke="#ff5a1f" stroke-width="3" stroke-linecap="round"/>
</svg>`;
}

async function bundleApp() {
  const result = await esbuild.build({
    entryPoints: [appEntry],
    bundle: true,
    minify: true,
    format: "iife",
    target: ["es2020"],
    write: false,
    legalComments: "none",
  });
  return result.outputFiles[0].text;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const buildYmd = args.asOf ?? todayYmd();

  const raw = JSON.parse(await readFile(eventsPath, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error("events.json must be an array");
  }

  const normalized = normalizeAll(raw);
  const { future, past } = filterFutureEvents(normalized, buildYmd);

  const binary = encodeEvents(future, buildYmd);
  const roundTrip = decodeEvents(binary);
  if (roundTrip.events.length !== future.length) {
    throw new Error("Binary round-trip event count mismatch");
  }
  for (let i = 0; i < future.length; i += 1) {
    const a = future[i];
    const b = roundTrip.events[i];
    if (
      a.name !== b.name ||
      a.dateYmd !== b.dateYmd ||
      a.dateDisplay !== b.dateDisplay ||
      a.location !== b.location ||
      a.city !== b.city ||
      a.distance !== b.distance ||
      a.fee !== b.fee ||
      a.earlyBirdFee !== b.earlyBirdFee ||
      a.website !== b.website ||
      a.fbLink !== b.fbLink ||
      a.responseCount !== b.responseCount ||
      a.tags.join("|") !== b.tags.join("|")
    ) {
      throw new Error(`Binary round-trip mismatch at index ${i}: ${a.name}`);
    }
  }

  const eventsB64 = bytesToBase64(binary);
  const styles = await readFile(stylesPath, "utf8");
  const appJs = await bundleApp();
  const template = await readFile(templatePath, "utf8");

  const pageUrl = "https://sjsakib.github.io/bd-races/";
  const title = `Upcoming races in Bangladesh · ${future.length} events`;
  const description = `Discover ${future.length} upcoming running, cycling, and triathlon events in Bangladesh. Filter by distance, location, date, and registration fee.`;
  const jsonLd = JSON.stringify(eventJsonLd(future, pageUrl));

  const dataScript =
    `window.__EVENTS_B64__=${JSON.stringify(eventsB64)};window.__BUILD_YMD__=${buildYmd};`;
  const styleHash = sha256Base64(styles);
  const dataHash = sha256Base64(dataScript);
  const appHash = sha256Base64(appJs);
  const csp = [
    "default-src 'none'",
    "img-src 'self' data:",
    "style-src 'sha256-" + styleHash + "'",
    "script-src 'sha256-" + dataHash + "' 'sha256-" + appHash + "'",
    "connect-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");

  const noscriptItems = future
    .map((event) => {
      const href = event.website || event.fbLink || pageUrl;
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(event.name)}</a> — ${escapeHtml(event.dateDisplay)}</li>`;
    })
    .join("\n          ");

  const faviconSvg = createFaviconSvg();
  const faviconHref = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

  const html = template
    .replaceAll("{{TITLE}}", escapeHtml(title))
    .replaceAll("{{DESCRIPTION}}", escapeHtml(description))
    .replaceAll("{{CANONICAL}}", escapeHtml(pageUrl))
    .replaceAll("{{FAVICON_HREF}}", faviconHref)
    .replaceAll("{{CSP}}", csp.replaceAll('"', "'"))
    .replaceAll("{{STYLES}}", styles)
    .replaceAll("{{JSON_LD}}", jsonLd)
    .replaceAll("{{NOSCRIPT_ITEMS}}", noscriptItems)
    .replaceAll("{{DATA_SCRIPT}}", dataScript)
    .replaceAll("{{APP_JS}}", appJs);

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(distDir, "index.html"), html, "utf8");
  await writeFile(path.join(distDir, "favicon.svg"), faviconSvg, "utf8");
  await writeFile(
    path.join(distDir, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${pageUrl}sitemap.xml\n`,
    "utf8",
  );
  await writeFile(
    path.join(distDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url>\n` +
      `    <loc>${pageUrl}</loc>\n` +
      `    <lastmod>${formatYmd(buildYmd)}</lastmod>\n` +
      `  </url>\n` +
      `</urlset>\n`,
    "utf8",
  );

  console.log("Build complete");
  console.log(`  source events : ${raw.length}`);
  console.log(`  past excluded : ${past.length}`);
  console.log(`  future emitted: ${future.length}`);
  console.log(`  build day     : ${isoDateFromYmd(buildYmd)} (Asia/Dhaka)`);
  console.log(`  binary bytes  : ${binary.byteLength}`);
  console.log(`  html bytes    : ${Buffer.byteLength(html)}`);
  console.log(`  output        : ${path.join(distDir, "index.html")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
