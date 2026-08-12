import { monthKeyFromYmd, monthLabelFromKey, isoDateFromYmd } from "./date";
import {
  buildDistanceScale,
  collectFilterOptions,
  defaultFilters,
  filterEvents,
  formatDistanceLabel,
  formatDistanceRange,
  indexToDistance,
  isDistanceFilterActive,
  pickDistanceTicks,
  sortEvents,
  type DistanceScale,
} from "./filters";
import {
  buildCopyText,
  formatDistance,
  formatFee,
  formatPopular,
  primaryAction,
} from "./format";
import type { EventRecord, FilterState } from "./types";
import { countActiveFilters, filtersToSearch, parseFiltersFromSearch } from "./url-state";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean | number | null | undefined> = {},
  children: Array<Node | string | null | undefined> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "className") {
      node.className = String(value);
      continue;
    }
    if (key === "text") {
      node.textContent = String(value);
      continue;
    }
    if (value === true) {
      node.setAttribute(key, "");
      continue;
    }
    node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function groupByMonth(events: EventRecord[]): Array<[string, EventRecord[]]> {
  const map = new Map<string, EventRecord[]>();
  for (const event of events) {
    const key = monthKeyFromYmd(event.dateYmd);
    const list = map.get(key);
    if (list) list.push(event);
    else map.set(key, [event]);
  }
  return [...map.entries()];
}

function feeLabel(value: string): string {
  switch (value) {
    case "free":
      return "Free";
    case "tba":
      return "Fee TBA";
    case "0-500":
      return "৳0–500";
    case "500-1000":
      return "৳500–1000";
    case "1000-2000":
      return "৳1000–2000";
    case "2000+":
      return "৳2000+";
    default:
      return value;
  }
}

function createSelect(
  id: string,
  label: string,
  items: Array<[string, string]>,
  selected: string,
): HTMLSelectElement {
  const select = el("select", {
    id,
    className: "filter-select",
    "aria-label": label,
  }) as HTMLSelectElement;
  for (const [value, text] of items) {
    const option = el("option", { value, text });
    if (value === selected) option.selected = true;
    select.append(option);
  }
  return select;
}

function field(label: string, control: HTMLElement): HTMLElement {
  return el("label", { className: "field" }, [
    el("span", { className: "field-label", text: label }),
    control,
  ]);
}

function createDistanceSlider(
  scale: DistanceScale,
  initialMin: number,
  initialMax: number,
): {
  root: HTMLElement;
  minInput: HTMLInputElement;
  maxInput: HTMLInputElement;
  valueLabel: HTMLElement;
  sync: (min: number, max: number) => void;
} {
  const maxIndex = Math.max(0, scale.length - 1);
  const minIndex = scale.indexOf(initialMin);
  const maxIndexValue = scale.indexOf(initialMax);

  const valueLabel = el("div", {
    className: "range-value",
    id: "distance-range-value",
    text: formatDistanceRange(initialMin, initialMax, scale),
  });

  const minInput = el("input", {
    type: "range",
    id: "distance-min",
    className: "range-input range-input-min",
    min: "0",
    max: String(maxIndex),
    step: "1",
    value: String(minIndex >= 0 ? minIndex : 0),
    "aria-label": "Minimum distance in kilometers",
  }) as HTMLInputElement;

  const maxInput = el("input", {
    type: "range",
    id: "distance-max",
    className: "range-input range-input-max",
    min: "0",
    max: String(maxIndex),
    step: "1",
    value: String(maxIndexValue >= 0 ? maxIndexValue : maxIndex),
    "aria-label": "Maximum distance in kilometers",
  }) as HTMLInputElement;

  const track = el("div", { className: "range-track" }, [
    el("div", { className: "range-track-fill", id: "distance-range-fill" }),
    minInput,
    maxInput,
  ]);

  const ticks = el("div", { className: "range-ticks" });
  for (const distance of pickDistanceTicks(scale)) {
    const idx = Math.max(0, scale.indexOf(distance));
    const position = maxIndex > 0 ? (idx / maxIndex) * 100 : 0;
    const tick = el("span", { text: formatDistanceLabel(distance) });
    tick.style.left = `${position}%`;
    ticks.append(tick);
  }

  const root = el("div", { className: "distance-slider" }, [
    valueLabel,
    track,
    ticks,
  ]);

  function sync(min: number, max: number) {
    const minIdx = Math.max(0, scale.indexOf(min));
    const maxIdx = Math.max(minIdx, scale.indexOf(max));
    minInput.value = String(minIdx);
    maxInput.value = String(maxIdx);
    valueLabel.textContent = formatDistanceRange(min, max, scale);
    const fill = root.querySelector("#distance-range-fill") as HTMLElement | null;
    if (fill && maxIndex > 0) {
      const start = minIdx / maxIndex;
      const end = maxIdx / maxIndex;
      fill.style.left = `calc(var(--range-thumb) + (100% - var(--range-thumb-size)) * ${start})`;
      fill.style.width = `calc((100% - var(--range-thumb-size)) * ${Math.max(0, end - start)})`;
    }
  }

  sync(initialMin, initialMax);

  return { root, minInput, maxInput, valueLabel, sync };
}

export function createApp(root: HTMLElement, allEvents: EventRecord[], buildYmd: number) {
  const distanceScale = buildDistanceScale(allEvents);
  let state: FilterState = parseFiltersFromSearch(window.location.search, distanceScale);
  let visibleEvents: EventRecord[] = [];
  const options = collectFilterOptions(allEvents);

  const liveRegion = el("div", {
    className: "sr-only",
    "aria-live": "polite",
    "aria-atomic": "true",
    id: "live-region",
  });

  const resultCount = el("p", { className: "result-count", id: "result-count" });
  const chips = el("div", {
    className: "filter-chips",
    id: "filter-chips",
    role: "list",
    "aria-label": "Active filters",
  });
  const feed = el("div", { className: "event-feed", id: "event-feed" });

  const searchInput = el("input", {
    type: "search",
    id: "search-input",
    className: "search-input",
    placeholder: "Search races, places, tags…",
    "aria-label": "Search events",
    autocomplete: "off",
    value: state.q,
  }) as HTMLInputElement;

  const sortSelect = el("select", {
    id: "sort-select",
    className: "sort-select",
    "aria-label": "Sort events",
  }) as HTMLSelectElement;
  for (const [value, label] of [
    ["date", "Soonest first"],
    ["popular", "Most popular"],
    ["fee", "Fee: low to high"],
    ["distance", "Distance"],
    ["name", "Name A–Z"],
  ] as const) {
    const option = el("option", { value, text: label });
    if (value === state.sort) option.selected = true;
    sortSelect.append(option);
  }

  const distanceSlider = createDistanceSlider(distanceScale, state.dMin, state.dMax);

  const feeSelect = createSelect(
    "fee-filter",
    "Fee",
    [
      ["", "All fees"],
      ["free", "Free"],
      ["0-500", "৳0–500"],
      ["500-1000", "৳500–1000"],
      ["1000-2000", "৳1000–2000"],
      ["2000+", "৳2000+"],
      ["tba", "Fee TBA"],
    ],
    state.fee,
  );

  const locationSelect = createSelect(
    "location-filter",
    "Location",
    [
      ["", "All locations"],
      ...options.locations.map((loc) => [loc, loc] as [string, string]),
    ],
    state.location,
  );

  const tagSelect = createSelect(
    "tag-filter",
    "Event type",
    [
      ["", "All types"],
      ...options.tags.map((tag) => [tag, tag] as [string, string]),
    ],
    state.tag,
  );

  const monthSelect = createSelect(
    "month-filter",
    "Month",
    [
      ["", "All months"],
      ...options.months.map((m) => [m, monthLabelFromKey(m)] as [string, string]),
    ],
    state.month,
  );

  const copyButton = el("button", {
    type: "button",
    className: "button filter-copy",
    id: "copy-list",
  }, ["Copy list"]);

  const filterPanel = el("aside", {
    className: "filter-panel",
    id: "filter-panel",
    "aria-label": "Filters",
  }, [
    el("div", { className: "filter-panel-header" }, [
      el("h2", { text: "Filters" }),
      el("button", {
        type: "button",
        className: "icon-button sheet-close",
        "aria-label": "Close filters",
        id: "close-filters",
      }, ["Close"]),
    ]),
    el("div", { className: "filter-fields" }, [
      field("Sort by", sortSelect),
      el("div", { className: "field" }, [
        el("span", { className: "field-label", text: "Distance" }),
        distanceSlider.root,
      ]),
      field("Fee", feeSelect),
      field("Location", locationSelect),
      field("Event type", tagSelect),
      field("Month", monthSelect),
    ]),
    el("div", { className: "filter-actions" }, [
      el("button", {
        type: "button",
        className: "button button-secondary",
        id: "clear-filters",
      }, ["Clear all"]),
      copyButton,
      el("button", {
        type: "button",
        className: "button button-primary sheet-apply",
        id: "apply-filters",
      }, ["Show results"]),
    ]),
  ]);

  const backdrop = el("div", {
    className: "sheet-backdrop",
    id: "sheet-backdrop",
    hidden: true,
  });

  const filterToggle = el("button", {
    type: "button",
    className: "button button-secondary filter-toggle",
    id: "open-filters",
    "aria-expanded": "false",
    "aria-controls": "filter-panel",
  }, ["Filters"]);

  const masthead = el("header", { className: "masthead" }, [
    el("div", { className: "masthead-copy" }, [
      el("p", { className: "eyebrow", text: "Bangladesh race calendar" }),
      el("h1", { text: "Upcoming races" }),
      el("p", {
        className: "lede",
        text: "Find your next run by distance, city, date, and registration fee — curated from public Facebook events.",
      }),
    ]),
    el("div", { className: "masthead-stats" }, [
      el("div", { className: "stat-card" }, [
        el("span", { className: "stat-label", text: "Upcoming" }),
        el("strong", { className: "stat-value", text: String(allEvents.length) }),
      ]),
      el("div", { className: "stat-card" }, [
        el("span", { className: "stat-label", text: "Data as of" }),
        el("strong", {
          className: "stat-value",
          text: isoDateFromYmd(buildYmd),
        }),
      ]),
    ]),
  ]);

  const toolbar = el("div", { className: "discovery-bar" }, [
    el("div", { className: "discovery-bar-main" }, [
      searchInput,
      filterToggle,
    ]),
    el("div", { className: "discovery-bar-meta" }, [resultCount]),
    chips,
  ]);

  const layout = el("div", { className: "layout" }, [
    filterPanel,
    el("main", { className: "main-panel", id: "main-content" }, [feed]),
  ]);

  const footer = el("footer", { className: "site-footer" }, [
    el("p", {
      text: "Event details are compiled from public Facebook listings and may change. Always confirm fees and schedules with the organizer.",
    }),
    el("p", {}, [
      el("a", {
        href: "https://github.com/sjsakib/bd-races",
        target: "_blank",
        rel: "noopener noreferrer",
        text: "Suggest a correction on GitHub",
      }),
    ]),
  ]);

  root.replaceChildren(
    el("a", { className: "skip-link", href: "#main-content", text: "Skip to events" }),
    masthead,
    toolbar,
    layout,
    footer,
    backdrop,
    liveRegion,
  );

  function setSheetOpen(open: boolean) {
    document.body.classList.toggle("sheet-open", open);
    filterPanel.classList.toggle("is-open", open);
    backdrop.hidden = !open;
    filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      (document.getElementById("close-filters") as HTMLButtonElement | null)?.focus();
    } else {
      filterToggle.focus();
    }
  }

  function updateUrl() {
    const next = `${window.location.pathname}${filtersToSearch(state, distanceScale)}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }

  function renderChips() {
    type Chip = { clear: () => void; label: string };
    const items: Chip[] = [];
    if (state.q.trim()) {
      items.push({
        label: `Search: ${state.q.trim()}`,
        clear: () => {
          state = { ...state, q: "" };
          searchInput.value = "";
        },
      });
    }
    if (isDistanceFilterActive(state, distanceScale)) {
      items.push({
        label: formatDistanceRange(state.dMin, state.dMax, distanceScale),
        clear: () => {
          const defaults = defaultFilters(distanceScale);
          state = {
            ...state,
            dMin: defaults.dMin,
            dMax: defaults.dMax,
          };
        },
      });
    }
    if (state.fee) {
      items.push({
        label: feeLabel(state.fee),
        clear: () => {
          state = { ...state, fee: "" };
        },
      });
    }
    if (state.location) {
      items.push({
        label: state.location,
        clear: () => {
          state = { ...state, location: "" };
        },
      });
    }
    if (state.tag) {
      items.push({
        label: state.tag,
        clear: () => {
          state = { ...state, tag: "" };
        },
      });
    }
    if (state.month) {
      items.push({
        label: monthLabelFromKey(state.month),
        clear: () => {
          state = { ...state, month: "" };
        },
      });
    }

    chips.replaceChildren();
    if (!items.length) {
      chips.hidden = true;
      return;
    }
    chips.hidden = false;
    for (const item of items) {
      const chip = el("button", {
        type: "button",
        className: "chip",
        role: "listitem",
      }, [`${item.label} ×`]);
      chip.addEventListener("click", () => {
        item.clear();
        syncControls();
        render();
      });
      chips.append(chip);
    }
  }

  function createCard(event: EventRecord): HTMLElement {
    const action = primaryAction(event);
    const popular = formatPopular(event.responseCount);

    const card = el("article", { className: "event-card" });
    const title = el("h3", { className: "event-title", text: event.name });

    const meta = el("div", { className: "event-meta" }, [
      el("time", {
        className: "meta-pill",
        datetime: isoDateFromYmd(event.dateYmd),
        text: event.dateDisplay,
      }),
      el("span", {
        className: "meta-pill",
        text: formatDistance(event.distance),
      }),
      el("span", {
        className: "meta-pill",
        text: formatFee(event.fee, event.earlyBirdFee),
      }),
    ]);

    const location = el("p", {
      className: "event-location",
      text: event.location,
    });

    const tags = el("div", { className: "event-tags" });
    for (const tag of event.tags) {
      const button = el("button", {
        type: "button",
        className: "tag",
        text: tag,
      });
      button.addEventListener("click", () => {
        state = { ...state, tag };
        syncControls();
        render();
      });
      tags.append(button);
    }

    const actions = el("div", { className: "event-actions" });
    if (action) {
      actions.append(
        el("a", {
          className: "button button-primary",
          href: action.href,
          target: "_blank",
          rel: "noopener noreferrer",
          text: action.label,
        }),
      );
    }
    if (event.fbLink && action?.href !== event.fbLink) {
      actions.append(
        el("a", {
          className: "button button-secondary",
          href: event.fbLink,
          target: "_blank",
          rel: "noopener noreferrer",
          text: "Facebook",
        }),
      );
    }
    if (popular) {
      actions.append(el("span", { className: "popularity", text: popular }));
    }

    card.append(meta, title, location);
    if (event.tags.length) card.append(tags);
    card.append(actions);
    return card;
  }

  function renderFeed() {
    feed.replaceChildren();
    if (!visibleEvents.length) {
      feed.append(
        el("div", { className: "empty-state" }, [
          el("h2", { text: "No races match these filters" }),
          el("p", {
            text: "Try clearing a filter or searching a different city or distance.",
          }),
          el("button", {
            type: "button",
            className: "button button-primary",
            id: "empty-clear",
          }, ["Clear filters"]),
        ]),
      );
      document.getElementById("empty-clear")?.addEventListener("click", clearAll);
      return;
    }

    for (const [month, events] of groupByMonth(visibleEvents)) {
      const section = el("section", {
        className: "month-group",
        "aria-labelledby": `month-${month}`,
      });
      section.append(
        el("div", { className: "month-heading" }, [
          el("h2", {
            id: `month-${month}`,
            text: monthLabelFromKey(month),
          }),
          el("span", {
            className: "month-count",
            text: `${events.length} race${events.length === 1 ? "" : "s"}`,
          }),
        ]),
      );
      const grid = el("div", { className: "event-grid" });
      for (const event of events) grid.append(createCard(event));
      section.append(grid);
      feed.append(section);
    }
  }

  function syncControls() {
    searchInput.value = state.q;
    sortSelect.value = state.sort;
    distanceSlider.sync(state.dMin, state.dMax);
    feeSelect.value = state.fee;
    locationSelect.value = state.location;
    tagSelect.value = state.tag;
    monthSelect.value = state.month;
    const active = countActiveFilters(state, distanceScale);
    filterToggle.textContent = active ? `Filters (${active})` : "Filters";
  }

  function render() {
    visibleEvents = sortEvents(filterEvents(allEvents, state, distanceScale), state.sort);
    resultCount.textContent = `${visibleEvents.length} of ${allEvents.length} upcoming races`;
    liveRegion.textContent = `Showing ${visibleEvents.length} of ${allEvents.length} events`;
    renderChips();
    renderFeed();
    updateUrl();
  }

  function clearAll() {
    state = defaultFilters(distanceScale);
    syncControls();
    render();
    setSheetOpen(false);
  }

  function onDistanceInput(which: "min" | "max") {
    let minIdx = Number(distanceSlider.minInput.value);
    let maxIdx = Number(distanceSlider.maxInput.value);
    if (which === "min" && minIdx > maxIdx) maxIdx = minIdx;
    if (which === "max" && maxIdx < minIdx) minIdx = maxIdx;
    const dMin = indexToDistance(minIdx, distanceScale);
    const dMax = indexToDistance(maxIdx, distanceScale);
    state = { ...state, dMin, dMax };
    distanceSlider.sync(dMin, dMax);
    render();
  }

  let searchTimer = 0;
  searchInput.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state = { ...state, q: searchInput.value };
      render();
    }, 120);
  });

  sortSelect.addEventListener("change", () => {
    state = { ...state, sort: sortSelect.value as FilterState["sort"] };
    render();
  });

  distanceSlider.minInput.addEventListener("input", () => onDistanceInput("min"));
  distanceSlider.maxInput.addEventListener("input", () => onDistanceInput("max"));

  for (const [select, key] of [
    [feeSelect, "fee"],
    [locationSelect, "location"],
    [tagSelect, "tag"],
    [monthSelect, "month"],
  ] as const) {
    select.addEventListener("change", () => {
      state = { ...state, [key]: select.value };
      render();
    });
  }

  document.getElementById("clear-filters")?.addEventListener("click", clearAll);
  document.getElementById("apply-filters")?.addEventListener("click", () => {
    setSheetOpen(false);
  });
  document.getElementById("close-filters")?.addEventListener("click", () => {
    setSheetOpen(false);
  });
  filterToggle.addEventListener("click", () => {
    setSheetOpen(!filterPanel.classList.contains("is-open"));
  });
  backdrop.addEventListener("click", () => setSheetOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && filterPanel.classList.contains("is-open")) {
      setSheetOpen(false);
    }
  });

  copyButton.addEventListener("click", async () => {
    const text = buildCopyText(
      visibleEvents,
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }),
    );
    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy list";
      }, 1600);
    } catch {
      copyButton.textContent = "Copy failed";
      window.setTimeout(() => {
        copyButton.textContent = "Copy list";
      }, 1600);
    }
  });

  window.addEventListener("popstate", () => {
    state = parseFiltersFromSearch(window.location.search);
    syncControls();
    render();
  });

  syncControls();
  render();
}
