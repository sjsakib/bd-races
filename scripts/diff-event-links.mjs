#!/usr/bin/env node
/**
 * Diff pasted Facebook event links against known events and raw files.
 *
 * Usage:
 *   node scripts/diff-event-links.mjs --file links.txt
 *   echo "https://..." | node scripts/diff-event-links.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractIds, selectEventLinks } from './fb-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const EVENTS_JSON = path.join(ROOT, 'page', 'events.json');

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function readInput() {
  const fileArg = process.argv.indexOf('--file');
  if (fileArg !== -1) {
    return fs.readFileSync(process.argv[fileArg + 1], 'utf8');
  }
  if (process.argv.length > 2 && !process.argv[2].startsWith('--')) {
    return process.argv.slice(2).join('\n');
  }
  return readStdin();
}

async function main() {
  const text = await readInput();
  const pastedIds = extractIds(text);
  if (pastedIds.size === 0) {
    console.error('No Facebook event IDs found in input.');
    process.exit(1);
  }

  const events = JSON.parse(fs.readFileSync(EVENTS_JSON, 'utf8'));
  console.log(JSON.stringify(selectEventLinks(pastedIds, events), null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
