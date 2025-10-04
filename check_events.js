#!/usr/bin/env node
/**
 * Compare event IDs between:
 *  - raw_events/<eventId>.txt
 *  - page/events.json (fbLink fields containing https://www.facebook.com/events/<eventId>)
 *
 * Usage:
 *   node check_events.js
 *   node check_events.js --json        (structured JSON output)
 *
 * Exit codes:
 *   0 = all good
 *   1 = discrepancies found or fatal error
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const RAW_EVENTS_DIR = path.join(PROJECT_ROOT, 'raw_events');
const EVENTS_JSON_PATH = path.join(PROJECT_ROOT, 'page', 'events.json');

function readRawEventIds() {
  if (!fs.existsSync(RAW_EVENTS_DIR)) {
    throw new Error(`raw_events directory not found at ${RAW_EVENTS_DIR}`);
  }
  const files = fs.readdirSync(RAW_EVENTS_DIR);
  const ids = new Set();
  for (const f of files) {
    const m = f.match(/^(\d+)\.txt$/);
    if (m) {
      ids.add(m[1]);
    }
  }
  return { ids, count: ids.size };
}

function parseEventsJson() {
  if (!fs.existsSync(EVENTS_JSON_PATH)) {
    throw new Error(`events.json not found at ${EVENTS_JSON_PATH}`);
  }
  let raw = fs.readFileSync(EVENTS_JSON_PATH, 'utf8').trim();

  // Attempt to normalize if file is a concatenation of objects without outer array
  if (!raw.startsWith('[')) {
    // Heuristic: if it starts with "{" and ends with "}" and contains "},{", wrap it
    if (raw.startsWith('{')) {
      raw = `[${raw}]`;
    }
  }

  // Try parse; if it fails and we have trailing commas, attempt a cleanup
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    // Remove trailing commas inside arrays/objects (simple heuristic)
    const cleaned = raw
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/^\uFEFF/, ''); // BOM removal
    try {
      data = JSON.parse(cleaned);
    } catch (err2) {
      throw new Error(`Failed to parse events.json: ${err2.message}`);
    }
  }

  if (!Array.isArray(data)) {
    throw new Error('events.json root is not an array after parsing.');
  }
  return data;
}

function extractIdsFromEvents(events) {
  const idPattern = /facebook\.com\/events\/(\d+)/i;
  const allIds = [];
  const occurrences = new Map(); // id -> count

  events.forEach((evt, index) => {
    if (!evt || typeof evt !== 'object') return;
    // Flexible key search just in case
    const fbLink = evt.fbLink || evt.fblink || evt.fb_link || evt['fb-link'] || evt['fb'] || null;
    if (typeof fbLink !== 'string') return;
    const m = fbLink.match(idPattern);
    if (m) {
      const id = m[1];
      allIds.push(id);
      occurrences.set(id, (occurrences.get(id) || 0) + 1);
    }
  });

  return { allIds, occurrences };
}

function analyze() {
  const { ids: rawIds } = readRawEventIds();
  const events = parseEventsJson();
  const { allIds: eventIds, occurrences } = extractIdsFromEvents(events);

  const eventIdSet = new Set(eventIds);

  const missingInEventsJson = [];
  for (const id of rawIds) {
    if (!eventIdSet.has(id)) {
      missingInEventsJson.push(id);
    }
  }

  const missingRawFiles = [];
  for (const id of eventIdSet) {
    if (!rawIds.has(id)) {
      missingRawFiles.push(id);
    }
  }

  const duplicates = [];
  for (const [id, count] of occurrences.entries()) {
    if (count > 1) {
      duplicates.push({ id, count });
    }
  }

  missingInEventsJson.sort();
  missingRawFiles.sort();
  duplicates.sort((a, b) => a.id.localeCompare(b.id));

  return {
    summary: {
      totalRawFiles: rawIds.size,
      totalEventEntriesScanned: eventIds.length,
      uniqueEventIdsInJson: eventIdSet.size,
      missingInEventsJsonCount: missingInEventsJson.length,
      missingRawFilesCount: missingRawFiles.length,
      duplicateIdCount: duplicates.length,
      mismatch:
        missingInEventsJson.length > 0 ||
        missingRawFiles.length > 0 ||
        duplicates.length > 0
    },
    missingInEventsJson,
    missingRawFiles,
    duplicates
  };
}

function formatHuman(result) {
  const { summary, missingInEventsJson, missingRawFiles, duplicates } = result;
  const lines = [];
  lines.push('Event ID Consistency Report');
  lines.push('===========================');
  lines.push(`Raw event files (unique IDs):      ${summary.totalRawFiles}`);
  lines.push(`Events.json fbLink references:     ${summary.totalEventEntriesScanned}`);
  lines.push(`Unique fbLink IDs in events.json:  ${summary.uniqueEventIdsInJson}`);
  lines.push('');

  if (missingInEventsJson.length === 0) {
    lines.push('✅ All raw_events IDs are present in events.json.');
  } else {
    lines.push('❌ Raw event files not represented in events.json:');
    lines.push('   ' + missingInEventsJson.join(', '));
  }

  if (missingRawFiles.length === 0) {
    lines.push('✅ All events.json IDs have corresponding raw .txt files.');
  } else {
    lines.push('');
    lines.push('❌ IDs in events.json missing raw .txt files:');
    lines.push('   ' + missingRawFiles.join(', '));
  }

  if (duplicates.length === 0) {
    lines.push('');
    lines.push('✅ No duplicate fbLink IDs in events.json.');
  } else {
    lines.push('');
    lines.push('⚠️ Duplicate fbLink IDs (ID -> count):');
    duplicates.forEach(d => lines.push(`   ${d.id} -> ${d.count} occurrences`));
  }

  lines.push('');
  lines.push(summary.mismatch ? 'RESULT: INCONSISTENCIES FOUND' : 'RESULT: OK');
  return lines.join('\n');
}

function main() {
  try {
    const res = analyze();
    const jsonOutput = process.argv.includes('--json');
    if (jsonOutput) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(formatHuman(res));
    }
    process.exit(res.summary.mismatch ? 1 : 0);
  } catch (err) {
    const jsonOutput = process.argv.includes('--json');
    if (jsonOutput) {
      console.error(JSON.stringify({ error: err.message }, null, 2));
    } else {
      console.error('Fatal error:', err.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyze };
