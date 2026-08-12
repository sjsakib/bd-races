const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const TZ = "Asia/Dhaka";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function ymdFromParts(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}

export function formatYmd(ymd: number): string {
  const year = Math.floor(ymd / 10000);
  const month = Math.floor((ymd % 10000) / 100);
  const day = ymd % 100;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function todayYmd(asOf: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(asOf);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return ymdFromParts(year, month, day);
}

function parseMonthToken(token: string): number | null {
  const key = token.toLowerCase().replace(/\./g, "");
  return MONTHS[key] ?? null;
}

/**
 * Parse a human event date string to a start-date YYYYMMDD integer.
 * Supports:
 * - "17 January 2026", "21 Dec 2025"
 * - "1-14 Nov 2025", "8-9 Jan 2026", "22-26 Sep 2026"
 * - "22 Jan – 4 Feb 2026" (en/em dash ranges → first day)
 */
export function parseEventStartYmd(dateString: string): number | null {
  if (!dateString || typeof dateString !== "string") return null;

  let working = dateString.trim().replace(/\s+/g, " ");
  if (!working) return null;

  // Normalize dashes to a simple separator for range detection
  const dashNormalized = working.replace(/[–—−]/g, "-");

  // Cross-month range: "22 Jan - 4 Feb 2026"
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

  // Same-month numeric range: "1-14 Nov 2025" or "22-23 Jan 2027"
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

  // Single date: "17 January 2026" / "21 Dec 2025"
  const single = working.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (single) {
    const day = Number(single[1]);
    const month = parseMonthToken(single[2]);
    const year = Number(single[3]);
    if (!month || day < 1 || day > 31) return null;
    return ymdFromParts(year, month, day);
  }

  // ISO: YYYY-MM-DD
  const iso = working.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return ymdFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  return null;
}

export function monthKeyFromYmd(ymd: number): string {
  const year = Math.floor(ymd / 10000);
  const month = Math.floor((ymd % 10000) / 100);
  return `${year}-${pad2(month)}`;
}

export function monthLabelFromKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function isoDateFromYmd(ymd: number): string {
  return formatYmd(ymd);
}
