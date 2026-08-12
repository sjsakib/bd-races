const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

export const TZ = 'Asia/Dhaka';
export const REFRESH_LIMIT = 10;
export const THREE_WEEKS_DAYS = 21;
export const ID_RE = /facebook\.com\/events\/(\d+)/i;

export function ymdFromParts(year, month, day) {
  return year * 10000 + month * 100 + day;
}

export function todayYmd(asOf = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(asOf);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return ymdFromParts(year, month, day);
}

function parseMonthToken(token) {
  return MONTHS[token.toLowerCase().replace(/\./g, '')] ?? null;
}

/** Parse event date string to YYYYMMDD (start date for ranges). */
export function parseEventStartYmd(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;

  let working = dateString.trim().replace(/\s+/g, ' ');
  if (!working) return null;

  const dashNormalized = working.replace(/[–—−]/g, '-');

  const crossMonth = dashNormalized.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s*-\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
  );
  if (crossMonth) {
    const day = Number(crossMonth[1]);
    const month = parseMonthToken(crossMonth[2]);
    const year = Number(crossMonth[5]);
    if (!month || day < 1 || day > 31) return null;
    return ymdFromParts(year, month, day);
  }

  const sameMonthRange = dashNormalized.match(
    /^(\d{1,2})-(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
  );
  if (sameMonthRange) {
    const day = Number(sameMonthRange[1]);
    const month = parseMonthToken(sameMonthRange[3]);
    const year = Number(sameMonthRange[4]);
    if (!month || day < 1 || day > 31) return null;
    return ymdFromParts(year, month, day);
  }

  const single = working.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (single) {
    const day = Number(single[1]);
    const month = parseMonthToken(single[2]);
    const year = Number(single[3]);
    if (!month || day < 1 || day > 31) return null;
    return ymdFromParts(year, month, day);
  }

  const iso = working.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return ymdFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  return null;
}

function ymdToDate(ymd) {
  const year = Math.floor(ymd / 10000);
  const month = Math.floor((ymd % 10000) / 100);
  const day = ymd % 100;
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysToYmd(ymd, days) {
  const date = ymdToDate(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return ymdFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/** True if the event falls within the next three weeks (registration likely closed). */
export function isWithinThreeWeeks(eventYmd, today = todayYmd()) {
  const cutoff = addDaysToYmd(today, THREE_WEEKS_DAYS);
  return eventYmd >= today && eventYmd <= cutoff;
}

export function extractIds(text) {
  const ids = new Set();
  for (const m of text.matchAll(new RegExp(ID_RE, 'gi'))) {
    ids.add(m[1]);
  }
  return ids;
}

/** Map fbLink event ID → earliest known start date (YYYYMMDD). */
export function eventDatesById(events) {
  const dates = new Map();
  for (const evt of events) {
    const link = evt.fbLink || '';
    const m = link.match(ID_RE);
    if (!m) continue;
    const ymd = parseEventStartYmd(evt.date);
    if (!ymd) continue;
    const prev = dates.get(m[1]);
    if (prev === undefined || ymd < prev) dates.set(m[1], ymd);
  }
  return dates;
}

/** Select which event IDs to scrape based on pasted/collected links. */
export function selectEventLinks(pastedIds, events) {
  const knownIds = new Set();
  for (const evt of events) {
    const m = (evt.fbLink || '').match(ID_RE);
    if (m) knownIds.add(m[1]);
  }

  const datesById = eventDatesById(events);
  const today = todayYmd();

  const needsScrape = [];
  const needsExtraction = [];
  const needsUpdate = [];
  const skippedWithinThreeWeeks = [];
  const skippedRefreshLimit = [];
  const skippedNoDate = [];

  for (const id of [...pastedIds].sort()) {
    if (!knownIds.has(id)) {
      needsScrape.push(id);
      needsExtraction.push(id);
    }
  }

  const refreshCandidates = [];
  for (const id of [...pastedIds].sort()) {
    if (!knownIds.has(id)) continue;

    const eventYmd = datesById.get(id);
    if (!eventYmd) {
      skippedNoDate.push(id);
      continue;
    }
    if (isWithinThreeWeeks(eventYmd, today)) {
      skippedWithinThreeWeeks.push(id);
      continue;
    }
    if (eventYmd < today) continue;

    refreshCandidates.push({ id, eventYmd });
  }

  refreshCandidates.sort((a, b) => a.eventYmd - b.eventYmd);
  const toRefresh = refreshCandidates.slice(0, REFRESH_LIMIT);
  const overLimit = refreshCandidates.slice(REFRESH_LIMIT);

  for (const { id } of toRefresh) {
    needsScrape.push(id);
    needsUpdate.push(id);
  }
  for (const { id } of overLimit) {
    skippedRefreshLimit.push(id);
  }

  return {
    summary: {
      pastedCount: pastedIds.size,
      needsScrapeCount: needsScrape.length,
      newCount: needsExtraction.length,
      refreshCount: needsUpdate.length,
      skippedWithinThreeWeeksCount: skippedWithinThreeWeeks.length,
      skippedRefreshLimitCount: skippedRefreshLimit.length,
      skippedNoDateCount: skippedNoDate.length,
    },
    needsScrape,
    needsExtraction,
    needsUpdate,
    skippedWithinThreeWeeks,
    skippedRefreshLimit,
    skippedNoDate,
    links: needsScrape.map((id) => `https://www.facebook.com/events/${id}/`),
  };
}
