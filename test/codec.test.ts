import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { encodeEvents, decodeEvents, decodeEventsBase64, encodeEventsBase64 } from "../web/src/codec.ts";
import type { EventRecord } from "../web/src/types.ts";

function sampleEvents(): EventRecord[] {
  return [
    {
      id: "1-10-0",
      name: "Test Race | 10k",
      dateDisplay: "17 January 2026",
      dateYmd: 20260117,
      distance: 10,
      location: "Hatirjheel, Dhaka",
      city: "Dhaka",
      fee: 999,
      earlyBirdFee: null,
      website: "https://example.com/register",
      tags: ["Road Race", "AIMS"],
      responseCount: 2500,
      fbLink: "https://www.facebook.com/events/123",
      fbEventId: "123",
    },
    {
      id: "2-x-1",
      name: "Virtual Ultra",
      dateDisplay: "22 Jan – 4 Feb 2026",
      dateYmd: 20260122,
      distance: 21.1,
      location: "Online event",
      city: "Online",
      fee: null,
      earlyBirdFee: 500,
      website: null,
      tags: [],
      responseCount: null,
      fbLink: null,
      fbEventId: null,
    },
  ];
}

describe("BDEV codec", () => {
  it("round-trips events through binary", () => {
    const input = sampleEvents();
    const encoded = encodeEvents(input, 20260812);
    const { events, buildYmd } = decodeEvents(encoded);
    assert.equal(buildYmd, 20260812);
    assert.equal(events.length, 2);
    assert.equal(events[0].name, input[0].name);
    assert.equal(events[0].distance, 10);
    assert.equal(events[1].distance, 21.1);
    assert.equal(events[1].earlyBirdFee, 500);
    assert.equal(events[1].fee, null);
    assert.deepEqual(events[0].tags, ["Road Race", "AIMS"]);
  });

  it("round-trips through base64", () => {
    const input = sampleEvents();
    const b64 = encodeEventsBase64(input, 20260812);
    const { events } = decodeEventsBase64(b64);
    assert.equal(events[0].website, "https://example.com/register");
    assert.equal(events[1].city, "Online");
  });

  it("rejects invalid magic", () => {
    assert.throws(() => decodeEvents(new Uint8Array(32)));
  });
});
