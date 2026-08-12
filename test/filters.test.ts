import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterEvents,
  sortEvents,
  DEFAULT_FILTERS,
  formatDistanceRange,
} from "../web/src/filters.ts";
import { filtersToSearch, parseFiltersFromSearch } from "../web/src/url-state.ts";
import type { EventRecord } from "../web/src/types.ts";

const events: EventRecord[] = [
  {
    id: "1",
    name: "Dhaka 10K Classic",
    dateDisplay: "20 November 2026",
    dateYmd: 20261120,
    distance: 10,
    location: "Dhaka",
    city: "Dhaka",
    fee: 800,
    earlyBirdFee: 600,
    website: "https://example.com",
    tags: ["Road Race"],
    responseCount: 1200,
    fbLink: "https://www.facebook.com/events/1",
    fbEventId: "1",
  },
  {
    id: "2",
    name: "Sylhet Trail Ultra",
    dateDisplay: "11 December 2026",
    dateYmd: 20261211,
    distance: 50,
    location: "Sylhet",
    city: "Sylhet",
    fee: 2000,
    earlyBirdFee: null,
    website: null,
    tags: ["Trail", "Ultra"],
    responseCount: 90,
    fbLink: "https://www.facebook.com/events/2",
    fbEventId: "2",
  },
  {
    id: "3",
    name: "Online Marathon Challenge",
    dateDisplay: "1 Jan 2027",
    dateYmd: 20270101,
    distance: 42.2,
    location: "Online event",
    city: "Online",
    fee: null,
    earlyBirdFee: null,
    website: null,
    tags: ["Marathon"],
    responseCount: 400,
    fbLink: null,
    fbEventId: null,
  },
];

describe("filters and url state", () => {
  it("filters by search, city, and exact tag", () => {
    const filtered = filterEvents(events, {
      ...DEFAULT_FILTERS,
      q: "trail",
      location: "Sylhet",
      tag: "Ultra",
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "2");
  });

  it("does not substring-match unrelated tags", () => {
    const filtered = filterEvents(events, {
      ...DEFAULT_FILTERS,
      tag: "Marathon",
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "3");
  });

  it("filters by distance slider range", () => {
    const mid = filterEvents(events, { ...DEFAULT_FILTERS, dMin: 8, dMax: 15 });
    assert.deepEqual(mid.map((e) => e.id), ["1"]);

    const long = filterEvents(events, { ...DEFAULT_FILTERS, dMin: 40, dMax: 50 });
    assert.deepEqual(long.map((e) => e.id).sort(), ["2", "3"]);

    assert.equal(formatDistanceRange(0, 50), "Any distance");
    assert.equal(formatDistanceRange(5, 21), "5K – 21K");
  });

  it("sorts by popularity", () => {
    const sorted = sortEvents(events, "popular");
    assert.equal(sorted[0].id, "1");
  });

  it("serializes and restores query state", () => {
    const state = {
      ...DEFAULT_FILTERS,
      q: "dhaka",
      dMin: 5,
      dMax: 21,
      fee: "500-1000",
      location: "Dhaka",
      sort: "popular" as const,
    };
    const search = filtersToSearch(state);
    assert.equal(search.includes("q=dhaka"), true);
    assert.equal(search.includes("dmin=5"), true);
    assert.equal(search.includes("dmax=21"), true);
    assert.deepEqual(parseFiltersFromSearch(search), state);
  });
});
