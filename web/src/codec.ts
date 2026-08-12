import type { EventRecord } from "./types";

const MAGIC = 0x42444556; // "BDEV"
const VERSION = 1;
const NULL_U16 = 0xffff;
const RECORD_SIZE = 28;

class StringTable {
  private readonly list: string[] = [];
  private readonly index = new Map<string, number>();

  add(value: string): number {
    const existing = this.index.get(value);
    if (existing !== undefined) return existing;
    const idx = this.list.length;
    this.list.push(value);
    this.index.set(value, idx);
    return idx;
  }

  values(): string[] {
    return this.list;
  }
}

function encodeU16(value: number | null): number {
  if (value === null || value === undefined) return NULL_U16;
  if (!Number.isInteger(value) || value < 0 || value > 65534) {
    throw new Error(`Value out of uint16 range: ${value}`);
  }
  return value;
}

function decodeU16(value: number): number | null {
  return value === NULL_U16 ? null : value;
}

function writeStringTable(strings: string[]): Uint8Array {
  const encoded = strings.map((s) => new TextEncoder().encode(s));
  const total = encoded.reduce((sum, bytes) => sum + 2 + bytes.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let offset = 0;
  for (const bytes of encoded) {
    if (bytes.length > 65535) {
      throw new Error("String too long for codec");
    }
    view.setUint16(offset, bytes.length, true);
    offset += 2;
    out.set(bytes, offset);
    offset += bytes.length;
  }
  return out;
}

function readStringTable(
  buffer: ArrayBuffer,
  offset: number,
  count: number,
): { strings: string[]; nextOffset: number } {
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  const strings: string[] = [];
  let cursor = offset;
  for (let i = 0; i < count; i += 1) {
    const length = view.getUint16(cursor, true);
    cursor += 2;
    const slice = new Uint8Array(buffer, cursor, length);
    strings.push(decoder.decode(slice));
    cursor += length;
  }
  return { strings, nextOffset: cursor };
}

export function encodeEvents(
  events: EventRecord[],
  buildYmd: number,
): Uint8Array {
  const table = new StringTable();
  // Reserve empty string at index 0 for absent optional strings
  table.add("");

  const records = events.map((event) => {
    const distanceTenths =
      event.distance === null ? null : Math.round(event.distance * 10);
    if (distanceTenths !== null && distanceTenths > 65534) {
      throw new Error(`Distance too large: ${event.distance}`);
    }

    return {
      dateYmd: event.dateYmd,
      nameIdx: table.add(event.name),
      dateDisplayIdx: table.add(event.dateDisplay),
      locationIdx: table.add(event.location),
      cityIdx: table.add(event.city),
      tagsIdx: table.add(event.tags.join(", ")),
      websiteIdx: table.add(event.website ?? ""),
      fbLinkIdx: table.add(event.fbLink ?? ""),
      fbEventIdIdx: table.add(event.fbEventId ?? ""),
      distanceTenths,
      fee: event.fee,
      earlyBirdFee: event.earlyBirdFee,
      responseCount: event.responseCount,
    };
  });

  const strings = table.values();
  const stringBytes = writeStringTable(strings);
  const headerSize = 16;
  const body = new Uint8Array(
    headerSize + stringBytes.length + records.length * RECORD_SIZE,
  );
  const view = new DataView(body.buffer);

  view.setUint32(0, MAGIC, false); // big-endian magic ASCII
  view.setUint8(4, VERSION);
  view.setUint8(5, 0); // flags
  view.setUint16(6, records.length, true);
  view.setUint16(8, strings.length, true);
  view.setUint32(10, buildYmd, true);
  view.setUint16(14, 0, true); // reserved

  body.set(stringBytes, headerSize);

  let offset = headerSize + stringBytes.length;
  for (const record of records) {
    view.setUint32(offset, record.dateYmd, true);
    view.setUint16(offset + 4, record.nameIdx, true);
    view.setUint16(offset + 6, record.dateDisplayIdx, true);
    view.setUint16(offset + 8, record.locationIdx, true);
    view.setUint16(offset + 10, record.cityIdx, true);
    view.setUint16(offset + 12, record.tagsIdx, true);
    view.setUint16(offset + 14, record.websiteIdx, true);
    view.setUint16(offset + 16, record.fbLinkIdx, true);
    view.setUint16(offset + 18, record.fbEventIdIdx, true);
    view.setUint16(offset + 20, encodeU16(record.distanceTenths), true);
    view.setUint16(offset + 22, encodeU16(record.fee), true);
    view.setUint16(offset + 24, encodeU16(record.earlyBirdFee), true);
    view.setUint16(offset + 26, encodeU16(record.responseCount), true);
    offset += RECORD_SIZE;
  }

  return body;
}

export function decodeEvents(buffer: ArrayBuffer | Uint8Array): {
  events: EventRecord[];
  buildYmd: number;
} {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const view = new DataView(ab);

  if (bytes.byteLength < 16) {
    throw new Error("Binary payload too small");
  }

  const magic = view.getUint32(0, false);
  if (magic !== MAGIC) {
    throw new Error("Invalid binary magic");
  }
  const version = view.getUint8(4);
  if (version !== VERSION) {
    throw new Error(`Unsupported binary version: ${version}`);
  }

  const eventCount = view.getUint16(6, true);
  const stringCount = view.getUint16(8, true);
  const buildYmd = view.getUint32(10, true);

  const { strings, nextOffset } = readStringTable(ab, 16, stringCount);
  const expectedEnd = nextOffset + eventCount * RECORD_SIZE;
  if (expectedEnd !== bytes.byteLength) {
    throw new Error("Binary payload size mismatch");
  }

  const events: EventRecord[] = [];
  let offset = nextOffset;
  for (let i = 0; i < eventCount; i += 1) {
    const dateYmd = view.getUint32(offset, true);
    const name = strings[view.getUint16(offset + 4, true)] ?? "";
    const dateDisplay = strings[view.getUint16(offset + 6, true)] ?? "";
    const location = strings[view.getUint16(offset + 8, true)] ?? "";
    const city = strings[view.getUint16(offset + 10, true)] ?? "";
    const tagsRaw = strings[view.getUint16(offset + 12, true)] ?? "";
    const websiteRaw = strings[view.getUint16(offset + 14, true)] ?? "";
    const fbLinkRaw = strings[view.getUint16(offset + 16, true)] ?? "";
    const fbEventIdRaw = strings[view.getUint16(offset + 18, true)] ?? "";
    const distanceTenths = decodeU16(view.getUint16(offset + 20, true));
    const fee = decodeU16(view.getUint16(offset + 22, true));
    const earlyBirdFee = decodeU16(view.getUint16(offset + 24, true));
    const responseCount = decodeU16(view.getUint16(offset + 26, true));

    const fbEventId = fbEventIdRaw || null;
    events.push({
      id: fbEventId ? `${fbEventId}-${distanceTenths ?? "x"}-${i}` : `event-${i}`,
      name,
      dateDisplay,
      dateYmd,
      distance: distanceTenths === null ? null : distanceTenths / 10,
      location,
      city,
      fee,
      earlyBirdFee,
      website: websiteRaw || null,
      tags: tagsRaw
        ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      responseCount,
      fbLink: fbLinkRaw || null,
      fbEventId,
    });

    offset += RECORD_SIZE;
  }

  return { events, buildYmd };
}

export function encodeEventsBase64(events: EventRecord[], buildYmd: number): string {
  const bytes = encodeEvents(events, buildYmd);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeEventsBase64(b64: string): {
  events: EventRecord[];
  buildYmd: number;
} {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return decodeEvents(bytes);
}
