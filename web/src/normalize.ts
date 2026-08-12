import type { EventRecord, RawEvent } from "./types";
import { parseEventStartYmd } from "./date";
import { extractDistrict } from "./districts";

const FB_ID_RE = /facebook\.com\/events\/(\d+)/i;

export function normalizeWebsite(website: string | null | undefined): string | null {
  if (!website || typeof website !== "string") return null;
  const trimmed = website.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function extractFbEventId(fbLink: string | null | undefined): string | null {
  if (!fbLink || typeof fbLink !== "string") return null;
  const match = fbLink.match(FB_ID_RE);
  return match ? match[1] : null;
}

export function normalizeFbLink(fbLink: string | null | undefined): string | null {
  const id = extractFbEventId(fbLink);
  if (id) return `https://www.facebook.com/events/${id}`;
  if (!fbLink || typeof fbLink !== "string") return null;
  const trimmed = fbLink.trim();
  return trimmed || null;
}

export function normalizeLocation(location: string | null | undefined): string {
  if (!location || typeof location !== "string") return "Location TBA";
  return location
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^bangladesh$/i.test(part))
    .join(", ") || "Location TBA";
}

/** @deprecated Use extractDistrict — kept for tests and backward compatibility. */
export const extractCity = extractDistrict;

export function normalizeTags(tags: string | null | undefined): string[] {
  if (!tags || typeof tags !== "string") return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags.split(",")) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function normalizeEvent(raw: RawEvent, index: number): EventRecord {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid event at index ${index}`);
  }
  if (!raw.name || typeof raw.name !== "string") {
    throw new Error(`Event at index ${index} is missing a name`);
  }
  if (!raw.date || typeof raw.date !== "string") {
    throw new Error(`Event "${raw.name}" is missing a date`);
  }

  const dateYmd = parseEventStartYmd(raw.date);
  if (dateYmd === null) {
    throw new Error(`Unparseable date "${raw.date}" for event "${raw.name}"`);
  }

  const location = normalizeLocation(raw.location);
  const fbLink = normalizeFbLink(raw.fbLink);
  const fbEventId = extractFbEventId(raw.fbLink);
  const id = fbEventId
    ? `${fbEventId}-${raw.distance ?? "x"}-${index}`
    : `event-${index}`;

  return {
    id,
    name: raw.name.trim(),
    dateDisplay: raw.date.trim(),
    dateYmd,
    distance: nullableNumber(raw.distance),
    location,
    city: extractDistrict(location),
    fee: nullableNumber(raw.fee),
    earlyBirdFee: nullableNumber(raw.earlyBirdFee),
    website: normalizeWebsite(raw.website),
    tags: normalizeTags(raw.tags),
    responseCount: nullableNumber(raw.responseCount),
    fbLink,
    fbEventId,
  };
}

export function normalizeAll(rawEvents: RawEvent[]): EventRecord[] {
  return rawEvents.map((event, index) => normalizeEvent(event, index));
}

export function filterFutureEvents(
  events: EventRecord[],
  asOfYmd: number,
): { future: EventRecord[]; past: EventRecord[] } {
  const future: EventRecord[] = [];
  const past: EventRecord[] = [];
  for (const event of events) {
    if (event.dateYmd >= asOfYmd) future.push(event);
    else past.push(event);
  }
  future.sort((a, b) => {
    if (a.dateYmd !== b.dateYmd) return a.dateYmd - b.dateYmd;
    return a.name.localeCompare(b.name);
  });
  return { future, past };
}
