import type { FilterState, SortKey } from "./types";
import {
  defaultFilters,
  isDistanceFilterActive,
  snapToScale,
  type DistanceScale,
} from "./filters";

const SORT_VALUES: SortKey[] = ["date", "popular", "fee", "distance", "name"];

function parseBound(
  raw: string | null,
  fallback: number,
  scale: DistanceScale,
): number {
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return snapToScale(value, scale);
}

export function parseFiltersFromSearch(
  search: string,
  scale: DistanceScale,
): FilterState {
  const defaults = defaultFilters(scale);
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const sort = params.get("sort") as SortKey | null;
  let dMin = parseBound(params.get("dmin"), defaults.dMin, scale);
  let dMax = parseBound(params.get("dmax"), defaults.dMax, scale);
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
    sort: sort && SORT_VALUES.includes(sort) ? sort : defaults.sort,
  };
}

export function filtersToSearch(
  state: FilterState,
  scale: DistanceScale,
): string {
  const defaults = defaultFilters(scale);
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  if (isDistanceFilterActive(state, scale)) {
    if (state.dMin > defaults.dMin) params.set("dmin", String(state.dMin));
    if (state.dMax < defaults.dMax) params.set("dmax", String(state.dMax));
  }
  if (state.fee) params.set("fee", state.fee);
  if (state.location) params.set("location", state.location);
  if (state.tag) params.set("tag", state.tag);
  if (state.month) params.set("month", state.month);
  if (state.sort !== defaults.sort) params.set("sort", state.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function countActiveFilters(
  state: FilterState,
  scale: DistanceScale,
): number {
  let count = 0;
  if (state.q.trim()) count += 1;
  if (isDistanceFilterActive(state, scale)) count += 1;
  if (state.fee) count += 1;
  if (state.location) count += 1;
  if (state.tag) count += 1;
  if (state.month) count += 1;
  return count;
}
