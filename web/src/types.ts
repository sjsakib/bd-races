export interface RawEvent {
  name: string;
  date: string;
  distance: number | null;
  location: string | null;
  fee: number | null;
  earlyBirdFee: number | null;
  website: string | null;
  tags: string | null;
  responseCount: number | null;
  fbLink: string | null;
}

export interface EventRecord {
  id: string;
  name: string;
  dateDisplay: string;
  dateYmd: number;
  distance: number | null;
  location: string;
  city: string;
  fee: number | null;
  earlyBirdFee: number | null;
  website: string | null;
  tags: string[];
  responseCount: number | null;
  fbLink: string | null;
  fbEventId: string | null;
}

export type SortKey = "date" | "popular" | "fee" | "distance" | "name";

export interface FilterState {
  q: string;
  dMin: number;
  dMax: number;
  fee: string;
  location: string;
  tag: string;
  month: string;
  sort: SortKey;
}

export interface BuildMeta {
  buildYmd: number;
  sourceCount: number;
  pastCount: number;
  futureCount: number;
  byteSize: number;
}
