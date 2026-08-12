import type { FilterState, SortKey } from "./types";
import {
  clampDistance,
  DEFAULT_FILTERS,
  DISTANCE_SLIDER_MAX,
  DISTANCE_SLIDER_MIN,
  isDistanceFilterActive,
} from "./filters";

const SORT_VALUES: SortKey[] = ["date", "popular", "fee", "distance", "name"];

function parseBound(raw: string | null, fallback: number): number {
  if (raw === null || raw === "") return fallback;
  return clampDistance(Number(raw));
}

export function parseFiltersFromSearch(search: string): FilterState {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const sort = params.get("sort") as SortKey | null;
  let dMin = parseBound(params.get("dmin"), DISTANCE_SLIDER_MIN);
  let dMax = parseBound(params.get("dmax"), DISTANCE_SLIDER_MAX);
  if (dMin > dMax) {
    const swap = dMin;
    dMin = dMax;
    dMax = swap;
  }

  return {
    q: params.get("q") ?? "",
    dMin,
    dMax,
    fee: params.get("fee") ?? "",
    location: params.get("location") ?? "",
    tag: params.get("tag") ?? "",
    month: params.get("month") ?? "",
    sort: sort && SORT_VALUES.includes(sort) ? sort : DEFAULT_FILTERS.sort,
  };
}

export function filtersToSearch(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  if (isDistanceFilterActive(state)) {
    if (state.dMin > DISTANCE_SLIDER_MIN) params.set("dmin", String(state.dMin));
    if (state.dMax < DISTANCE_SLIDER_MAX) params.set("dmax", String(state.dMax));
  }
  if (state.fee) params.set("fee", state.fee);
  if (state.location) params.set("location", state.location);
  if (state.tag) params.set("tag", state.tag);
  if (state.month) params.set("month", state.month);
  if (state.sort !== DEFAULT_FILTERS.sort) params.set("sort", state.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function countActiveFilters(state: FilterState): number {
  let count = 0;
  if (state.q.trim()) count += 1;
  if (isDistanceFilterActive(state)) count += 1;
  if (state.fee) count += 1;
  if (state.location) count += 1;
  if (state.tag) count += 1;
  if (state.month) count += 1;
  return count;
}
