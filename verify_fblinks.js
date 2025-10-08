#!/usr/bin/env node
/**
 * Facebook Link Verification Script
 *
 * This script compares event names and details in events.json with the actual
 * content from their corresponding raw Facebook event files to identify mismatches.
 *
 * Usage: node verify_fblinks.js
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

  // Handle potential formatting issues
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

function extractEventIdFromFbLink(fbLink) {
  if (!fbLink || typeof fbLink !== 'string') return null;
  const match = fbLink.match(/facebook\.com\/events\/(\d+)/i);
  return match ? match[1] : null;
}

function readRawEventFile(eventId) {
  const filePath = path.join(RAW_EVENTS_DIR, `${eventId}.txt`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractEventNameFromRaw(rawContent) {
  if (!rawContent) return null;

  const lines = rawContent.split('\n');

  // Look for event title patterns in Facebook page content
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip common Facebook navigation elements
    if (line.includes('Log in') || line.includes('Forgotten account') ||
        line.includes('Events') || line.includes('Home') ||
        line.includes('Categories') || line === '' ||
        line.match(/^\d+$/) || line.includes('at ') && line.includes('+06')) {
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
        !line.includes('Anyone on or off Facebook')) {

      // This might be an event name
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

      // If next line looks like location or another detail, this is likely the event name
      if (nextLine.includes(',') || nextLine.includes('Online event') ||
          nextLine === 'Invite' || nextLine === 'Details' ||
          nextLine.includes('Division') || nextLine.includes('Bangladesh')) {
        return line;
      }
    }
  }

  return null;
}

function extractEventDateFromRaw(rawContent) {
  if (!rawContent) return null;

  const lines = rawContent.split('\n');

  for (const line of lines) {
    // Look for date patterns like "21 Dec 2025 at 16:00" or "Friday 17 July 2026 at 04:30"
    if (line.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i) ||
        line.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i)) {
      return line.trim();
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
    .trim();
}

function verifyFacebookLinks() {
  const events = parseEventsJson();
  const mismatches = [];
  const matches = [];
  const errors = [];

  console.log(`Checking ${events.length} events for Facebook link accuracy...\n`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const eventId = extractEventIdFromFbLink(event.fbLink);

    if (!eventId) {
      errors.push({
        index: i,
        event: event.name,
        issue: 'Invalid or missing Facebook link',
        fbLink: event.fbLink
      });
      continue;
    }

    const rawContent = readRawEventFile(eventId);
    if (!rawContent) {
      errors.push({
        index: i,
        event: event.name,
        issue: 'Raw event file not found',
        eventId: eventId
      });
      continue;
    }

    // Check if raw content indicates access issues
    if (rawContent.includes('You must log in to continue') ||
        rawContent.includes('Log in to Facebook')) {
      errors.push({
        index: i,
        event: event.name,
        issue: 'Facebook event requires login (private or deleted)',
        eventId: eventId
      });
      continue;
    }

    const rawEventName = extractEventNameFromRaw(rawContent);
    const rawEventDate = extractEventDateFromRaw(rawContent);

    if (!rawEventName) {
      errors.push({
        index: i,
        event: event.name,
        issue: 'Could not extract event name from raw content',
        eventId: eventId
      });
      continue;
    }

    // Normalize names for comparison
    const normalizedJsonName = normalizeEventName(event.name);
    const normalizedRawName = normalizeEventName(rawEventName);

    // Check for similarity (allowing for distance suffixes and minor variations)
    const similarity = calculateSimilarity(normalizedJsonName, normalizedRawName);

    if (similarity < 0.6) { // Threshold for considering it a mismatch
      mismatches.push({
        index: i,
        jsonEvent: event.name,
        rawEvent: rawEventName,
        jsonDate: event.date,
        rawDate: rawEventDate,
        eventId: eventId,
        similarity: similarity.toFixed(2)
      });
    } else {
      matches.push({
        index: i,
        event: event.name,
        eventId: eventId,
        similarity: similarity.toFixed(2)
      });
    }
  }

  return { mismatches, matches, errors };
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

function main() {
  try {
    const { mismatches, matches, errors } = verifyFacebookLinks();

    console.log('='.repeat(80));
    console.log('FACEBOOK LINK VERIFICATION REPORT');
    console.log('='.repeat(80));

    console.log(`\nSUMMARY:`);
    console.log(`Total events checked: ${matches.length + mismatches.length + errors.length}`);
    console.log(`Matching links: ${matches.length}`);
    console.log(`Mismatched links: ${mismatches.length}`);
    console.log(`Errors: ${errors.length}`);

    if (mismatches.length > 0) {
      console.log(`\n❌ MISMATCHED FACEBOOK LINKS (${mismatches.length}):`);
      console.log('-'.repeat(80));
      mismatches.forEach((mismatch, idx) => {
        console.log(`${idx + 1}. Event #${mismatch.index + 1}`);
        console.log(`   JSON Event: "${mismatch.jsonEvent}"`);
        console.log(`   Raw Event:  "${mismatch.rawEvent}"`);
        console.log(`   JSON Date:  ${mismatch.jsonDate}`);
        console.log(`   Raw Date:   ${mismatch.rawDate || 'N/A'}`);
        console.log(`   Event ID:   ${mismatch.eventId}`);
        console.log(`   Similarity: ${mismatch.similarity}`);
        console.log(`   FB Link:    https://www.facebook.com/events/${mismatch.eventId}`);
        console.log('');
      });
    }

    if (errors.length > 0) {
      console.log(`\n⚠️  ERRORS (${errors.length}):`);
      console.log('-'.repeat(80));
      errors.forEach((error, idx) => {
        console.log(`${idx + 1}. Event #${error.index + 1}: "${error.event}"`);
        console.log(`   Issue: ${error.issue}`);
        if (error.eventId) console.log(`   Event ID: ${error.eventId}`);
        if (error.fbLink) console.log(`   FB Link: ${error.fbLink}`);
        console.log('');
      });
    }

    if (mismatches.length === 0 && errors.length === 0) {
      console.log('\n✅ All Facebook links appear to be correctly matched!');
    }

    console.log(`\n✅ CORRECTLY MATCHED LINKS: ${matches.length}`);

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyFacebookLinks };
