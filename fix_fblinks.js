#!/usr/bin/env node
/**
 * Facebook Link Fix Script
 *
 * This script fixes incorrect Facebook links in events.json by mapping events
 * to their correct raw Facebook event files based on event name matching.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const RAW_EVENTS_DIR = path.join(PROJECT_ROOT, 'raw_events');
const EVENTS_JSON_PATH = path.join(PROJECT_ROOT, 'page', 'events.json');

function parseEventsJson() {
  if (!fs.existsSync(EVENTS_JSON_PATH)) {
    throw new Error(`events.json not found at ${EVENTS_JSON_PATH}`);
  }

  let raw = fs.readFileSync(EVENTS_JSON_PATH, 'utf8').trim();

  if (!raw.startsWith('[')) {
    if (raw.startsWith('{')) {
      raw = `[${raw}]`;
    }
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    const cleaned = raw
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/^\uFEFF/, '');
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

function getAllRawEventFiles() {
  const files = fs.readdirSync(RAW_EVENTS_DIR);
  const eventFiles = [];

  for (const file of files) {
    const match = file.match(/^(\d+)\.txt$/);
    if (match) {
      eventFiles.push({
        eventId: match[1],
        fileName: file,
        filePath: path.join(RAW_EVENTS_DIR, file)
      });
    }
  }

  return eventFiles;
}

function extractEventNameFromRaw(rawContent) {
  if (!rawContent) return null;

  // Skip inaccessible events
  if (rawContent.includes('You must log in to continue') ||
      rawContent.includes('Log in to Facebook')) {
    return null;
  }

  const lines = rawContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip common Facebook navigation elements and short lines
    if (line.includes('Log in') || line.includes('Forgotten account') ||
        line.includes('Events') || line.includes('Home') ||
        line.includes('Categories') || line === '' ||
        line.match(/^\d+$/) || line.includes('at ') && line.includes('+06') ||
        line.length < 5) {
      continue;
    }

    // Look for event names (usually appear after date/time info)
    if (line.length > 10 && line.length < 200 &&
        !line.includes('facebook.com') &&
        !line.includes('Privacy') &&
        !line.includes('Terms') &&
        !line.includes('Advertising') &&
        !line.includes('people responded') &&
        !line.includes('Event by') &&
        !line.includes('Public') &&
        !line.includes('Anyone on or off Facebook') &&
        !line.includes('Invite') &&
        !line.includes('Details') &&
        !line.includes('Duration')) {

      // Check if this looks like an event title
      const nextFewLines = lines.slice(i + 1, i + 4).map(l => l.trim());

      // If followed by location-like text, this is likely the event name
      if (nextFewLines.some(nextLine =>
          nextLine.includes(',') ||
          nextLine.includes('Online event') ||
          nextLine.includes('Division') ||
          nextLine.includes('Bangladesh') ||
          nextLine === 'Invite' ||
          nextLine === 'Details')) {
        return line;
      }
    }
  }

  return null;
}

function normalizeEventName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[|]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\d+k$/i, '')
    .replace(/\d+km$/i, '')
    .replace(/edition\s*\d+/i, '')
    .replace(/season\s*\d+/i, '')
    .replace(/\d{4}/g, '2025') // Normalize years to 2025 for comparison
    .replace(/powered by.*$/i, '')
    .replace(/sponsored by.*$/i, '')
    .trim();
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function buildRawEventIndex() {
  const rawFiles = getAllRawEventFiles();
  const index = {};

  console.log('Building index of raw event files...');

  for (const rawFile of rawFiles) {
    try {
      const content = fs.readFileSync(rawFile.filePath, 'utf8');
      const eventName = extractEventNameFromRaw(content);

      if (eventName) {
        index[rawFile.eventId] = {
          eventId: rawFile.eventId,
          eventName: eventName,
          normalizedName: normalizeEventName(eventName)
        };
        console.log(`  ${rawFile.eventId}: "${eventName}"`);
      } else {
        console.log(`  ${rawFile.eventId}: [Could not extract name]`);
      }
    } catch (err) {
      console.log(`  ${rawFile.eventId}: [Error reading file]`);
    }
  }

  return index;
}

function findCorrectEventId(eventName, rawEventIndex) {
  const normalizedTarget = normalizeEventName(eventName);
  let bestMatch = null;
  let bestSimilarity = 0;

  for (const [eventId, rawEvent] of Object.entries(rawEventIndex)) {
    const similarity = calculateSimilarity(normalizedTarget, rawEvent.normalizedName);

    if (similarity > bestSimilarity && similarity > 0.7) {
      bestSimilarity = similarity;
      bestMatch = {
        eventId: eventId,
        eventName: rawEvent.eventName,
        similarity: similarity
      };
    }
  }

  return bestMatch;
}

function fixFacebookLinks() {
  console.log('Loading events.json...');
  const events = parseEventsJson();

  console.log('Building raw event index...');
  const rawEventIndex = buildRawEventIndex();

  console.log('\nFinding and fixing incorrect Facebook links...\n');

  let fixedCount = 0;
  const fixes = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const currentEventId = event.fbLink ? event.fbLink.match(/events\/(\d+)/)?.[1] : null;

    if (!currentEventId) {
      console.log(`Event #${i + 1}: "${event.name}" - No Facebook link to fix`);
      continue;
    }

    const currentRawEvent = rawEventIndex[currentEventId];
    if (!currentRawEvent) {
      console.log(`Event #${i + 1}: "${event.name}" - Raw file not found for ${currentEventId}`);
      continue;
    }

    // Check if current link is correct
    const currentSimilarity = calculateSimilarity(
      normalizeEventName(event.name),
      currentRawEvent.normalizedName
    );

    if (currentSimilarity >= 0.7) {
      // Current link is correct
      continue;
    }

    // Find the correct event ID
    const correctMatch = findCorrectEventId(event.name, rawEventIndex);

    if (correctMatch && correctMatch.eventId !== currentEventId) {
      const oldLink = event.fbLink;
      const newLink = `https://www.facebook.com/events/${correctMatch.eventId}`;

      event.fbLink = newLink;
      fixedCount++;

      fixes.push({
        eventIndex: i + 1,
        eventName: event.name,
        oldEventId: currentEventId,
        oldEventName: currentRawEvent.eventName,
        newEventId: correctMatch.eventId,
        newEventName: correctMatch.eventName,
        similarity: correctMatch.similarity,
        oldLink: oldLink,
        newLink: newLink
      });

      console.log(`✅ Fixed Event #${i + 1}: "${event.name}"`);
      console.log(`   Old: ${currentEventId} ("${currentRawEvent.eventName}")`);
      console.log(`   New: ${correctMatch.eventId} ("${correctMatch.eventName}") [${(correctMatch.similarity * 100).toFixed(1)}% match]`);
      console.log('');
    } else {
      console.log(`❌ No good match found for Event #${i + 1}: "${event.name}"`);
      console.log(`   Currently linked to: ${currentEventId} ("${currentRawEvent.eventName}")`);
      console.log('');
    }
  }

  if (fixedCount > 0) {
    // Create backup
    const backupPath = EVENTS_JSON_PATH + '.backup.' + Date.now();
    fs.copyFileSync(EVENTS_JSON_PATH, backupPath);
    console.log(`Backup created: ${path.basename(backupPath)}`);

    // Save fixed events
    fs.writeFileSync(EVENTS_JSON_PATH, JSON.stringify(events, null, 2));
    console.log(`Fixed events.json with ${fixedCount} corrections`);

    // Save fix report
    const reportPath = path.join(PROJECT_ROOT, 'fblink_fixes_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(fixes, null, 2));
    console.log(`Fix report saved to: ${path.basename(reportPath)}`);
  } else {
    console.log('No corrections needed.');
  }

  return { fixedCount, fixes };
}

function main() {
  try {
    console.log('Facebook Link Fix Script');
    console.log('========================\n');

    const result = fixFacebookLinks();

    console.log(`\nSummary:`);
    console.log(`- Events fixed: ${result.fixedCount}`);
    console.log(`- Total fixes applied: ${result.fixes.length}`);

    if (result.fixedCount > 0) {
      console.log('\n✅ Facebook links have been corrected!');
      console.log('Run "node verify_fblinks.js" to verify the fixes.');
    }

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFacebookLinks };
