import { monthKeyFromYmd } from "./date";
import type { EventRecord, FilterState, SortKey } from "./types";

export type DistanceScale = number[];

export function buildDistanceScale(events: EventRecord[]): DistanceScale {
  return [
    ...new Set(
      events
        .map((event) => event.distance)
        .filter((distance): distance is number => distance !== null),
    ),
  ].sort((a, b) => a - b);
}

export function defaultFilters(scale: DistanceScale): FilterState {
  return {
    q: "",
    dMin: scale[0] ?? 0,
    dMax: scale[scale.length - 1] ?? 0,
    fee: "",
    location: "",
    tag: "",
    month: "",
    sort: "date",
  };
}

/** @deprecated Use defaultFilters(scale) after events are loaded. */
export const DEFAULT_FILTERS: FilterState = {
  q: "",
  dMin: 0,
  dMax: 0,
  fee: "",
  location: "",
  tag: "",
  month: "",
  sort: "date",
};

export function isDistanceFilterActive(
  state: Pick<FilterState, "dMin" | "dMax">,
  scale: DistanceScale,
): boolean {
  if (scale.length === 0) return false;
  return state.dMin > scale[0] || state.dMax < scale[scale.length - 1];
}

export function formatDistanceLabel(km: number): string {
  return Number.isInteger(km) ? `${km}K` : `${km}K`;
}

export function formatDistanceRange(
  min: number,
  max: number,
  scale: DistanceScale,
): string {
  if (!isDistanceFilterActive({ dMin: min, dMax: max }, scale)) {
    return "Any distance";
  }
  if (min === max) return formatDistanceLabel(min);
  return `${formatDistanceLabel(min)} – ${formatDistanceLabel(max)}`;
}

export function snapToScale(value: number, scale: DistanceScale): number {
  if (scale.length === 0) return value;
  let best = scale[0];
  let bestDelta = Math.abs(value - best);
  for (const distance of scale) {
    const delta = Math.abs(value - distance);
    if (delta < bestDelta) {
      best = distance;
      bestDelta = delta;
    }
  }
  return best;
}

export function distanceIndex(value: number, scale: DistanceScale): number {
  const exact = scale.indexOf(value);
  if (exact >= 0) return exact;
  return snapToScale(value, scale) === scale[0] ? 0 : scale.length - 1;
}

export function indexToDistance(index: number, scale: DistanceScale): number {
  if (scale.length === 0) return 0;
  const clamped = Math.min(scale.length - 1, Math.max(0, Math.round(index)));
  return scale[clamped];
}

export function pickDistanceTicks(scale: DistanceScale): number[] {
  if (scale.length <= 5) return scale.slice();
  const picks: number[] = [scale[0]];
  for (const target of [10, 21.1, 42.2]) {
    if (scale.includes(target)) picks.push(target);
  }
  picks.push(scale[scale.length - 1]);
  return picks;
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
  scale: DistanceScale,
): boolean {
  if (!isDistanceFilterActive({ dMin, dMax }, scale)) return true;
  if (event.distance === null) return false;
  return event.distance >= dMin && event.distance <= dMax;
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
  scale: DistanceScale,
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

    if (!matchesDistance(event, state.dMin, state.dMax, scale)) return false;
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
  const distances = buildDistanceScale(events);

  return { locations, tags, months, distances };
}
