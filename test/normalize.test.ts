import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractCity,
  normalizeWebsite,
  normalizeEvent,
  filterFutureEvents,
} from "../web/src/normalize.ts";
import { extractDistrict } from "../web/src/districts.ts";
import type { RawEvent } from "../web/src/types.ts";

describe("normalize", () => {
  it("normalizes bare website hosts", () => {
    assert.equal(
      normalizeWebsite("forms.gle/abc"),
      "https://forms.gle/abc",
    );
    assert.equal(
      normalizeWebsite("https://docs.google.com/x"),
      "https://docs.google.com/x",
    );
  });

  it("maps locations to districts", () => {
    assert.equal(extractDistrict("Hatirjheel, Dhaka-1217, 1217"), "Dhaka");
    assert.equal(extractDistrict("300 Feet Highway, Purbachal"), "Dhaka");
    assert.equal(extractDistrict("Ali Kadam, Bandarban"), "Bandarban");
    assert.equal(extractDistrict("CRB, Chittagong"), "Chattogram");
    assert.equal(extractDistrict("Online event"), "Online");
    assert.equal(extractDistrict("Panam City, Sonargaon, Narayanganj"), "Narayanganj");
    assert.equal(extractDistrict("SHAMSHER NAGAR"), "Moulvibazar");
    assert.equal(
      extractDistrict("Sajek, Khagrachari, Rangamati, Bandarban, Thanchi, Alikadam"),
      "Bandarban",
    );
    assert.equal(extractCity("Chittagong"), "Chattogram");
  });

  it("normalizes events and filters by Asia/Dhaka day", () => {
    const raw: RawEvent[] = [
      {
        name: "Future Race | 10k",
        date: "17 January 2026",
        distance: 10,
        location: "Dhaka, Bangladesh",
        fee: 1000,
        earlyBirdFee: null,
        website: "example.com",
        tags: "Road Race, Road Race",
        responseCount: 10,
        fbLink: "https://www.facebook.com/events/42",
      },
      {
        name: "Past Race",
        date: "1 Oct 2025",
        distance: 5,
        location: "Sylhet",
        fee: null,
        earlyBirdFee: null,
        website: null,
        tags: null,
        responseCount: null,
        fbLink: null,
      },
    ];

    const futureRace = normalizeEvent(raw[0], 0);
    assert.equal(futureRace.website, "https://example.com");
    assert.equal(futureRace.location, "Dhaka");
    assert.equal(futureRace.city, "Dhaka");
    assert.deepEqual(futureRace.tags, ["Road Race"]);

    const all = raw.map((event, index) => normalizeEvent(event, index));
    const { future, past } = filterFutureEvents(all, 20260812);
    assert.equal(future.length, 0);
    assert.equal(past.length, 2);

    const { future: stillUpcoming } = filterFutureEvents(all, 20260101);
    assert.equal(stillUpcoming.length, 1);
    assert.equal(stillUpcoming[0].name, "Future Race | 10k");
  });
});
