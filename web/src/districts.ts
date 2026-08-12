/** Canonical English names for Bangladesh's 64 districts. */
export const DISTRICTS = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
  "Chapai Nawabganj",
  "Jhalokati",
] as const;

export type DistrictName = (typeof DISTRICTS)[number];

const DIVISIONS = new Set([
  "barishal division",
  "chattogram division",
  "chittagong division",
  "dhaka division",
  "khulna division",
  "mymensingh division",
  "rajshahi division",
  "rangpur division",
  "sylhet division",
]);

/** Locality / upazila / legacy spellings → district. Keys are normalized (lowercase, no diacritics). */
const ALIASES: Record<string, DistrictName> = {
  // Dhaka metro & upazilas in Dhaka district
  purbachal: "Dhaka",
  uttara: "Dhaka",
  dhanmondi: "Dhaka",
  hatirjheel: "Dhaka",
  diabari: "Dhaka",
  kanchan: "Dhaka",
  kanchana: "Dhaka",
  aftabnagar: "Dhaka",
  agargaon: "Dhaka",
  banani: "Dhaka",
  gulshan: "Dhaka",
  mirpur: "Dhaka",
  mohammadpur: "Dhaka",
  badda: "Dhaka",
  khilgaon: "Dhaka",
  bashundhara: "Dhaka",
  rampura: "Dhaka",
  tejgaon: "Dhaka",
  farmgate: "Dhaka",
  "jahurul islam city": "Dhaka",
  "sher e bangla nagar": "Dhaka",
  "sher-e-bangla nagar": "Dhaka",
  "dhanmondi cricket academy": "Dhaka",
  "300 feet highway": "Dhaka",
  jolshiri: "Dhaka",

  // Narayanganj
  sonargaon: "Narayanganj",
  "panam city": "Narayanganj",

  // Narsingdi
  "narsingdi sadar": "Narsingdi",
  raipura: "Narsingdi",

  // Gazipur
  kaliakair: "Gazipur",
  palashtali: "Gazipur",
  kapasia: "Gazipur",
  sreepur: "Gazipur",
  "bangla bazar": "Gazipur",

  // Chattogram
  chittagong: "Chattogram",
  chattogram: "Chattogram",
  satkania: "Chattogram",
  lohagara: "Chattogram",
  chunati: "Chattogram",
  patenga: "Chattogram",
  agrabad: "Chattogram",
  crb: "Chattogram",
  pahartali: "Chattogram",
  "ishak mia sarak": "Chattogram",

  // Cox's Bazar
  "cox's bazar": "Cox's Bazar",
  "coxs bazar": "Cox's Bazar",
  inani: "Cox's Bazar",
  laboni: "Cox's Bazar",
  teknaf: "Cox's Bazar",
  ukhiya: "Cox's Bazar",

  // Bandarban
  "bandarban sadar": "Bandarban",
  alikadam: "Bandarban",
  "ali kadam": "Bandarban",
  thanchi: "Bandarban",
  ruma: "Bandarban",
  rowangchhari: "Bandarban",
  "rajar math": "Bandarban",

  // Hill tract neighbours
  sajek: "Rangamati",
  khagrachari: "Khagrachhari",
  khagrachhari: "Khagrachhari",
  rangamati: "Rangamati",

  // Sylhet division
  sylhet: "Sylhet",
  "sylhet city": "Sylhet",
  fenchuganj: "Sylhet",
  shahjalal: "Sylhet",
  doldoli: "Sylhet",

  // Moulvibazar
  moulvibazar: "Moulvibazar",
  "moulvibazar sadar": "Moulvibazar",
  kamalganj: "Moulvibazar",
  sreemangal: "Moulvibazar",
  shamshernagar: "Moulvibazar",
  "shamsher nagar": "Moulvibazar",
  jugibil: "Moulvibazar",
  rajkandi: "Moulvibazar",

  // Sunamganj
  sunamganj: "Sunamganj",
  "sunamganj shadar": "Sunamganj",

  // Other districts in current data
  brahmanbaria: "Brahmanbaria",
  "shimrail kandi": "Brahmanbaria",
  rajshahi: "Rajshahi",
  "rajshahi university": "Rajshahi",
  jashore: "Jashore",
  "jashore city": "Jashore",
  khulna: "Khulna",
  dighalia: "Khulna",
  digalia: "Khulna",
  dighali: "Khulna",
  "খুলনা": "Khulna",
  "দিঘলিয়া": "Khulna",
  "দিঘলিয়া": "Khulna",
  comilla: "Cumilla",
  cumilla: "Cumilla",
  manikganj: "Manikganj",
  sherpur: "Sherpur",
  nilphamari: "Nilphamari",
  saidpur: "Nilphamari",
  borguna: "Barguna",
  barguna: "Barguna",
  kakchira: "Barguna",
};

const DISTRICT_LOOKUP = new Map<string, DistrictName>(
  DISTRICTS.map((district) => [normalizeKey(district), district]),
);

const ALIAS_ENTRIES = Object.entries(ALIASES).sort(
  (a, b) => b[0].length - a[0].length,
);

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPostalCodes(value: string): string {
  return value.replace(/\d{3,}/g, " ").replace(/\s+/g, " ").trim();
}

function matchPart(part: string): DistrictName | null {
  const cleaned = stripPostalCodes(normalizeKey(part));
  if (!cleaned || DIVISIONS.has(cleaned)) return null;

  if (DISTRICT_LOOKUP.has(cleaned)) {
    return DISTRICT_LOOKUP.get(cleaned)!;
  }

  for (const [alias, district] of ALIAS_ENTRIES) {
    if (cleaned === alias || cleaned.includes(alias)) {
      return district;
    }
  }

  for (const district of DISTRICTS) {
    const key = normalizeKey(district);
    if (cleaned === key || cleaned.endsWith(` ${key}`)) {
      return district;
    }
  }

  return null;
}

/** Map a free-form venue string to one of Bangladesh's 64 districts. */
export function extractDistrict(location: string): string {
  if (!location || location === "Location TBA") return "Unknown";
  if (/online/i.test(location)) return "Online";

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  let district: DistrictName | null = null;
  for (const part of parts) {
    const match = matchPart(part);
    if (match) district = match;
  }

  if (!district) {
    const full = stripPostalCodes(normalizeKey(location));
    for (const [alias, name] of ALIAS_ENTRIES) {
      if (full.includes(alias)) district = name;
    }
    for (const name of DISTRICTS) {
      const key = normalizeKey(name);
      if (full.includes(key)) district = name;
    }
  }

  return district ?? "Unknown";
}
