#!/usr/bin/env node
/**
 * Regenerate existingLinks in fb-script.js from page/events.json
 *
 * Usage: node scripts/sync-fb-script.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const EVENTS_JSON = path.join(ROOT, 'page', 'events.json');
const FB_SCRIPT = path.join(ROOT, 'fb-script.js');

const ID_RE = /facebook\.com\/events\/(\d+)/i;

function collectLinks() {
  const events = JSON.parse(fs.readFileSync(EVENTS_JSON, 'utf8'));
  const ids = new Set();
  for (const evt of events) {
    const link = evt.fbLink || '';
    const m = link.match(ID_RE);
    if (m) ids.add(m[1]);
  }
  return [...ids]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((id) => `  "https://www.facebook.com/events/${id}/",`);
}

function main() {
  const script = fs.readFileSync(FB_SCRIPT, 'utf8');
  const links = collectLinks();
  const block = `const existingLinks = [\n${links.join('\n')}\n];`;

  const updated = script.replace(
    /const existingLinks = \[[\s\S]*?\];/,
    block,
  );

  if (updated === script) {
    console.error('Could not find existingLinks block in fb-script.js');
    process.exit(1);
  }

  fs.writeFileSync(FB_SCRIPT, updated);
  console.log(`Synced ${links.length} links into fb-script.js`);
}

main();
