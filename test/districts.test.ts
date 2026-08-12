import assert from "node:assert/strict";
import { describe, it } from "node:test";

import events from "../page/events.json" with { type: "json" };
import { extractDistrict } from "../web/src/districts.ts";
import { normalizeEvent, filterFutureEvents } from "../web/src/normalize.ts";

describe("district mapping for future events", () => {
  it("maps every future venue to a known district", () => {
    const all = events.map((event, index) => normalizeEvent(event, index));
    const { future } = filterFutureEvents(all, 20260812);

    const expected: Record<string, string> = {
      "300 Feet Highway, Purbachal": "Dhaka",
      "A K B C Ghose Institute, Satkania, Chittagong": "Chattogram",
      "Abdul Mazid Akond Memorial High School, Gazipur": "Gazipur",
      "Dhanmondi Cricket Academy, Dhaka": "Dhaka",
      "Diabari Uttara, Dhaka": "Dhaka",
      "Doldoli Tea Garden Field, Sylhet": "Sylhet",
      Gazipur: "Gazipur",
      "Hatirjheel Amphitheatre, Dhaka": "Dhaka",
      "Hatirjheel, Dhaka": "Dhaka",
      "Inani Beach, Cox's Bazar": "Cox's Bazar",
      "Ishak Mia Sarak, Chunati, Lohagara, Chattogram": "Chattogram",
      "Jashore City": "Jashore",
      "Jolshiri Central Park, Kanchan, Dhaka": "Dhaka",
      "Jugibil, Kamalganj, Moulvibazar (Rajkandi Reserve Forest)": "Moulvibazar",
      "Moulvibazar Sadar": "Moulvibazar",
      "Narsingdi Sadar": "Narsingdi",
      "Palashtali, Kaliakair, Gazipur": "Gazipur",
      "Panam City, Sonargaon, Narayanganj": "Narayanganj",
      "Patenga Sea Beach, Chattogram": "Chattogram",
      "Raipura Upazila Parishad Gate, Narsingdi": "Narsingdi",
      "Raipura, Narsingdi": "Narsingdi",
      "Rajar Math, Bandarban Sadar": "Bandarban",
      "Rajshahi University, Rajshahi": "Rajshahi",
      "SHAMSHER NAGAR": "Moulvibazar",
      "Sajek, Khagrachari, Rangamati, Bandarban, Thanchi, Alikadam": "Bandarban",
      "Shamshernagar, Sylhet Division": "Moulvibazar",
      "Shanto-Mariam University of Creative Technology, Uttara, Dhaka": "Dhaka",
      "Shimrail Kandi Bridge, Brahmanbaria": "Brahmanbaria",
      "Sylhet Central Shaheed Minar, Sylhet City": "Sylhet",
      "Uttara, Dhaka": "Dhaka",
      "দীঘল দ্বীপ, দিঘলিয়া, খুলনা": "Khulna",
    };

    const locations = [...new Set(future.map((event) => event.location))].sort();
    for (const location of locations) {
      assert.equal(
        extractDistrict(location),
        expected[location],
        `unexpected district for ${location}`,
      );
    }
  });
});
