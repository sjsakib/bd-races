import { monthKeyFromYmd } from "./date";
import type { EventRecord, FilterState, SortKey } from "./types";

/** Slider spans 0–50K; 50 means “50K+” (no upper bound). */
export const DISTANCE_SLIDER_MIN = 0;
export const DISTANCE_SLIDER_MAX = 50;
export const DISTANCE_SLIDER_STEP = 1;

export const DEFAULT_FILTERS: FilterState = {
  q: "",
  dMin: DISTANCE_SLIDER_MIN,
  dMax: DISTANCE_SLIDER_MAX,
  fee: "",
  location: "",
  tag: "",
  month: "",
  sort: "date",
};

export function isDistanceFilterActive(state: Pick<FilterState, "dMin" | "dMax">): boolean {
  return state.dMin > DISTANCE_SLIDER_MIN || state.dMax < DISTANCE_SLIDER_MAX;
}

export function formatDistanceRange(min: number, max: number): string {
  if (min <= DISTANCE_SLIDER_MIN && max >= DISTANCE_SLIDER_MAX) {
    return "Any distance";
  }
  if (min <= DISTANCE_SLIDER_MIN && max < DISTANCE_SLIDER_MAX) {
    return `Up to ${max}K`;
  }
  if (min > DISTANCE_SLIDER_MIN && max >= DISTANCE_SLIDER_MAX) {
    return `${min}K+`;
  }
  return `${min}K – ${max}K`;
}

export function effectiveFee(event: EventRecord): number | null {
  if (event.fee !== null) return event.fee;
  if (event.earlyBirdFee !== null) return event.earlyBirdFee;
  return null;
}

function matchesDistance(
  event: EventRecord,
  dMin: number,
  dMax: number,
): boolean {
  if (!isDistanceFilterActive({ dMin, dMax })) return true;
  if (event.distance === null) return false;

  const min = Math.max(DISTANCE_SLIDER_MIN, dMin);
  const max = Math.min(DISTANCE_SLIDER_MAX, dMax);
  const upper = max >= DISTANCE_SLIDER_MAX ? Number.POSITIVE_INFINITY : max + 0.1;
  return event.distance >= min && event.distance <= upper;
}

function matchesFee(event: EventRecord, fee: string): boolean {
  if (!fee) return true;
  const value = effectiveFee(event);
  switch (fee) {
    case "free":
      return value === 0;
    case "tba":
      return value === null;
    case "0-500":
      return value !== null && value > 0 && value <= 500;
    case "500-1000":
      return value !== null && value > 500 && value <= 1000;
    case "1000-2000":
      return value !== null && value > 1000 && value <= 2000;
    case "2000+":
      return value !== null && value > 2000;
    default:
      return true;
  }
}

export function filterEvents(
  events: EventRecord[],
  state: FilterState,
): EventRecord[] {
  const q = state.q.trim().toLowerCase();

  return events.filter((event) => {
    if (q) {
      const haystack = [
        event.name,
        event.location,
        event.city,
        event.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (!matchesDistance(event, state.dMin, state.dMax)) return false;
    if (!matchesFee(event, state.fee)) return false;

    if (state.location && event.city !== state.location) return false;

    if (state.tag) {
      const wanted = state.tag.toLowerCase();
      if (!event.tags.some((tag) => tag.toLowerCase() === wanted)) return false;
    }

    if (state.month) {
      if (state.month === "later") {
        // no-op placeholder
      } else if (monthKeyFromYmd(event.dateYmd) !== state.month) {
        return false;
      }
    }

    return true;
  });
}

export function sortEvents(
  events: EventRecord[],
  sort: SortKey,
): EventRecord[] {
  const copy = events.slice();
  switch (sort) {
    case "popular":
      return copy.sort(
        (a, b) => (b.responseCount ?? -1) - (a.responseCount ?? -1),
      );
    case "fee":
      return copy.sort((a, b) => {
        const feeA = effectiveFee(a);
        const feeB = effectiveFee(b);
        if (feeA === null && feeB === null) return a.dateYmd - b.dateYmd;
        if (feeA === null) return 1;
        if (feeB === null) return -1;
        return feeA - feeB;
      });
    case "distance":
      return copy.sort((a, b) => {
        if (a.distance === null && b.distance === null) return a.dateYmd - b.dateYmd;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "date":
    default:
      return copy.sort((a, b) => {
        if (a.dateYmd !== b.dateYmd) return a.dateYmd - b.dateYmd;
        return a.name.localeCompare(b.name);
      });
  }
}

export function collectFilterOptions(events: EventRecord[]): {
  locations: string[];
  tags: string[];
  months: string[];
  distances: number[];
} {
  const locations = [...new Set(events.map((e) => e.city))].sort((a, b) =>
    a.localeCompare(b),
  );
  const tags = [
    ...new Set(events.flatMap((e) => e.tags)),
  ].sort((a, b) => a.localeCompare(b));
  const months = [
    ...new Set(events.map((e) => monthKeyFromYmd(e.dateYmd))),
  ].sort();
  const distances = [
    ...new Set(
      events
        .map((e) => e.distance)
        .filter((d): d is number => d !== null),
    ),
  ].sort((a, b) => a - b);

  return { locations, tags, months, distances };
}

export function clampDistance(value: number): number {
  if (!Number.isFinite(value)) return DISTANCE_SLIDER_MIN;
  return Math.min(
    DISTANCE_SLIDER_MAX,
    Math.max(DISTANCE_SLIDER_MIN, Math.round(value)),
  );
}
