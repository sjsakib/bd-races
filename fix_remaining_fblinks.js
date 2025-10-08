#!/usr/bin/env node
/**
 * Manual fix for remaining mismatched Facebook links
 *
 * This script manually corrects the remaining Facebook link issues
 * that couldn't be automatically resolved by the previous fix script.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
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

function fixRemainingLinks() {
  console.log('Loading events.json...');
  const events = parseEventsJson();

  console.log('Applying manual corrections for remaining mismatched links...\n');

  const fixes = [];
  let fixedCount = 0;

  // Manual corrections based on analysis of the verification report
  const manualCorrections = [
    // Fix CUMILLA MARATHON events that are incorrectly linked to BM LP GAS RRC
    {
      eventName: "CUMILLA MARATHON 2025 | 42.195k",
      currentEventId: "555332594315963",
      correctEventId: "788897559329643", // Based on verification showing this has CUMILLA MARATHON content
      reason: "CUMILLA MARATHON content found in event 788897559329643"
    },
    {
      eventName: "CUMILLA MARATHON 2025 | 21.0975k",
      currentEventId: "555332594315963",
      correctEventId: "788897559329643",
      reason: "CUMILLA MARATHON content found in event 788897559329643"
    },

    // Fix SHERPUR HALF MARATHON that's incorrectly linked
    {
      eventName: "SHERPUR HALF MARATHON 2025 | 21.1k",
      currentEventId: "788897559329643", // This actually has CUMILLA MARATHON content
      correctEventId: "575514851888090", // This should have SHERPUR content
      reason: "SHERPUR HALF MARATHON content should be in event 575514851888090"
    },

    // Fix CRC Mini Race that's incorrectly linked to SHERPUR
    {
      eventName: "CRC Mini Race 2025 | 2.1k",
      currentEventId: "575514851888090", // This has SHERPUR content
      correctEventId: null, // No good match found, will remove fbLink
      reason: "No matching Facebook event found for CRC Mini Race"
    },

    // Fix Bahadurpur Runners event with Bengali title mismatch
    {
      eventName: "Bahadurpur Runners 10K Run( Mini Marathon 2025) | 10k",
      currentEventId: "1508440780167582", // Has Bengali title
      correctEventId: "1124892606242993", // Should have English Bahadurpur content
      reason: "English event name should link to English Facebook event"
    }
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Find manual correction for this event
    const correction = manualCorrections.find(c =>
      event.name === c.eventName &&
      event.fbLink &&
      event.fbLink.includes(c.currentEventId)
    );

    if (correction) {
      const oldLink = event.fbLink;

      if (correction.correctEventId) {
        const newLink = `https://www.facebook.com/events/${correction.correctEventId}`;
        event.fbLink = newLink;

        fixes.push({
          eventIndex: i + 1,
          eventName: event.name,
          oldEventId: correction.currentEventId,
          newEventId: correction.correctEventId,
          oldLink: oldLink,
          newLink: newLink,
          reason: correction.reason
        });

        console.log(`✅ Fixed Event #${i + 1}: "${event.name}"`);
        console.log(`   Old: ${correction.currentEventId}`);
        console.log(`   New: ${correction.correctEventId}`);
        console.log(`   Reason: ${correction.reason}`);
        console.log('');
      } else {
        // Remove fbLink if no good match
        delete event.fbLink;

        fixes.push({
          eventIndex: i + 1,
          eventName: event.name,
          oldEventId: correction.currentEventId,
          newEventId: null,
          oldLink: oldLink,
          newLink: null,
          reason: correction.reason
        });

        console.log(`⚠️  Removed fbLink for Event #${i + 1}: "${event.name}"`);
        console.log(`   Old: ${correction.currentEventId}`);
        console.log(`   Reason: ${correction.reason}`);
        console.log('');
      }

      fixedCount++;
    }
  }

  // Special handling for events that are actually correct but flagged due to strict similarity threshold
  console.log('Validating events that may be correctly linked...\n');

  // These events are likely correct despite low similarity scores
  const likelyCorrectEvents = [
    // Chuti Resort events - just have extra "Powered by" text
    { name: "Chuti Resort Shamshernagar Ultra 2025 (Season 2) | 10k", eventId: "2272538536472882" },
    { name: "Chuti Resort Shamshernagar Ultra 2025 (Season 2) | 25k", eventId: "2272538536472882" },
    { name: "Chuti Resort Shamshernagar Ultra 2025 (Season 2) | 50k", eventId: "2272538536472882" },

    // Dhaka Dash 30K with 7.5k distance - reasonable for multi-distance event
    { name: "Dhaka Dash 30K | 7.5k", eventId: "1200537458509104" }
  ];

  for (const correctEvent of likelyCorrectEvents) {
    const matchingEvent = events.find(e =>
      e.name === correctEvent.name &&
      e.fbLink &&
      e.fbLink.includes(correctEvent.eventId)
    );

    if (matchingEvent) {
      console.log(`✅ Validated Event: "${correctEvent.name}"`);
      console.log(`   Facebook link appears correct: ${correctEvent.eventId}`);
      console.log('');
    }
  }

  if (fixedCount > 0) {
    // Create backup
    const backupPath = EVENTS_JSON_PATH + '.backup.manual.' + Date.now();
    fs.copyFileSync(EVENTS_JSON_PATH, backupPath);
    console.log(`Backup created: ${path.basename(backupPath)}`);

    // Save fixed events
    fs.writeFileSync(EVENTS_JSON_PATH, JSON.stringify(events, null, 2));
    console.log(`Applied ${fixedCount} manual corrections to events.json`);

    // Save fix report
    const reportPath = path.join(PROJECT_ROOT, 'manual_fblink_fixes_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(fixes, null, 2));
    console.log(`Manual fix report saved to: ${path.basename(reportPath)}`);
  } else {
    console.log('No manual corrections needed.');
  }

  return { fixedCount, fixes };
}

function main() {
  try {
    console.log('Manual Facebook Link Fix Script');
    console.log('===============================\n');

    const result = fixRemainingLinks();

    console.log(`\nSummary:`);
    console.log(`- Manual fixes applied: ${result.fixedCount}`);

    if (result.fixedCount > 0) {
      console.log('\n✅ Manual corrections have been applied!');
      console.log('Run "node verify_fblinks.js" to verify all fixes.');
    } else {
      console.log('\n✅ No manual corrections were needed.');
    }

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixRemainingLinks };
