import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseEventStartYmd,
  todayYmd,
  ymdFromParts,
} from "../web/src/date.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const events = JSON.parse(
  readFileSync(path.join(root, "page", "events.json"), "utf8"),
);

describe("parseEventStartYmd", () => {
  it("parses single long-month dates", () => {
    assert.equal(parseEventStartYmd("17 January 2026"), 20260117);
  });

  it("parses abbreviated month dates", () => {
    assert.equal(parseEventStartYmd("21 Dec 2025"), 20251221);
  });

  it("uses the start day for same-month numeric ranges", () => {
    assert.equal(parseEventStartYmd("1-14 Nov 2025"), 20251101);
    assert.equal(parseEventStartYmd("22-23 Jan 2027"), 20270122);
  });

  it("uses the start day for en-dash cross-month ranges", () => {
    assert.equal(parseEventStartYmd("22 Jan – 4 Feb 2026"), 20260122);
    assert.equal(parseEventStartYmd("25 Jan – 8 Feb 2026"), 20260125);
    assert.equal(parseEventStartYmd("18 Feb – 18 Mar 2026"), 20260218);
  });

  it("parses every unique date in events.json", () => {
    const dates = [...new Set(events.map((event) => event.date))];
    for (const date of dates) {
      assert.notEqual(
        parseEventStartYmd(date),
        null,
        `unparseable date: ${date}`,
      );
    }
  });
});

describe("todayYmd Asia/Dhaka", () => {
  it("returns the Dhaka calendar day near midnight UTC", () => {
    // 2026-08-11 18:30 UTC == 2026-08-12 00:30 Asia/Dhaka
    const justAfterDhakaMidnight = new Date("2026-08-11T18:30:00.000Z");
    assert.equal(todayYmd(justAfterDhakaMidnight), 20260812);

    // 2026-08-11 17:30 UTC == 2026-08-11 23:30 Asia/Dhaka
    const justBeforeDhakaMidnight = new Date("2026-08-11T17:30:00.000Z");
    assert.equal(todayYmd(justBeforeDhakaMidnight), 20260811);
  });

  it("builds ymd parts stably", () => {
    assert.equal(ymdFromParts(2026, 1, 9), 20260109);
  });
});
