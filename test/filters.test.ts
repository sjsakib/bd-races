import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterEvents,
  sortEvents,
  buildDistanceScale,
  defaultFilters,
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

const SCALE = buildDistanceScale(events);

describe("filters and url state", () => {
  it("filters by search, city, and exact tag", () => {
    const filtered = filterEvents(events, {
      ...defaultFilters(SCALE),
      q: "trail",
      location: "Sylhet",
      tag: "Ultra",
    }, SCALE);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "2");
  });

  it("does not substring-match unrelated tags", () => {
    const filtered = filterEvents(events, {
      ...defaultFilters(SCALE),
      tag: "Marathon",
    }, SCALE);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "3");
  });

  it("filters by distance slider range with snapped values", () => {
    const mid = filterEvents(events, {
      ...defaultFilters(SCALE),
      dMin: 10,
      dMax: 10,
    }, SCALE);
    assert.deepEqual(mid.map((e) => e.id), ["1"]);

    const long = filterEvents(events, {
      ...defaultFilters(SCALE),
      dMin: 42.2,
      dMax: 50,
    }, SCALE);
    assert.deepEqual(long.map((e) => e.id).sort(), ["2", "3"]);

    assert.equal(formatDistanceRange(SCALE[0], SCALE[SCALE.length - 1], SCALE), "Any distance");
    assert.equal(formatDistanceRange(10, 42.2, SCALE), "10K – 42.2K");
  });

  it("sorts by popularity", () => {
    const sorted = sortEvents(events, "popular");
    assert.equal(sorted[0].id, "1");
  });

  it("serializes and restores query state", () => {
    const state = {
      ...defaultFilters(SCALE),
      q: "dhaka",
      dMin: 42.2,
      dMax: 50,
      fee: "500-1000",
      location: "Dhaka",
      sort: "popular" as const,
    };
    const search = filtersToSearch(state, SCALE);
    assert.equal(search.includes("q=dhaka"), true);
    assert.equal(search.includes("dmin=42.2"), true);
    assert.deepEqual(parseFiltersFromSearch(search, SCALE), state);
  });
});
