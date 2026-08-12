import { isoDateFromYmd } from "./date";
import { effectiveFee } from "./filters";
import type { EventRecord } from "./types";

export function formatDistance(distance: number | null): string {
  if (distance === null) return "Distance TBA";
  if (distance === 21.1) return "Half Marathon · 21.1K";
  if (distance === 42.2) return "Marathon · 42.2K";
  if (Number.isInteger(distance)) return `${distance}K`;
  return `${distance}K`;
}

export function formatDistanceShort(distance: number | null): string {
  if (distance === null) return "TBA";
  if (distance === 21.1) return "21.1K";
  if (distance === 42.2) return "42.2K";
  if (Number.isInteger(distance)) return `${distance}K`;
  return `${distance}K`;
}

export function formatFee(fee: number | null, earlyBirdFee: number | null): string {
  if (fee === null && earlyBirdFee === null) return "Fee TBA";
  if (fee === 0 || (fee === null && earlyBirdFee === 0)) return "Free";
  if (earlyBirdFee !== null && fee !== null && earlyBirdFee !== fee) {
    return `৳${earlyBirdFee} early / ৳${fee}`;
  }
  if (fee !== null) return `৳${fee}`;
  return `৳${earlyBirdFee} early`;
}

export function formatPopular(count: number | null): string | null {
  if (count === null || count <= 0) return null;
  if (count >= 1000) {
    const value = count / 1000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}k interested`;
  }
  return `${count} interested`;
}

export function primaryAction(event: EventRecord): {
  href: string;
  label: string;
} | null {
  if (event.website) return { href: event.website, label: "Register" };
  if (event.fbLink) return { href: event.fbLink, label: "Facebook event" };
  return null;
}

export function buildCopyText(events: EventRecord[], generatedOn: string): string {
  let text = `Running Events in Bangladesh (${events.length} events)\n`;
  text += `Generated on: ${generatedOn}\n\n`;

  events.forEach((event, index) => {
    text += `${index + 1}. ${event.name}\n`;
    text += `   Date: ${event.dateDisplay || "TBA"}\n`;
    text += `   Distance: ${event.distance ? `${event.distance}K` : "TBA"}\n`;
    text += `   Location: ${event.location || "TBA"}\n`;
    text += `   Fee: ${formatFee(event.fee, event.earlyBirdFee)}\n`;
    if (event.tags.length) text += `   Type: ${event.tags.join(", ")}\n`;
    if (event.responseCount) text += `   Interested: ${event.responseCount}\n`;
    if (event.website) text += `   Website: ${event.website}\n`;
    if (event.fbLink) text += `   Facebook: ${event.fbLink}\n`;
    text += "\n";
  });

  text += `Total Events: ${events.length}`;
  return text;
}

export function eventJsonLd(events: EventRecord[], pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Upcoming races in Bangladesh",
    numberOfItems: events.length,
    itemListElement: events.slice(0, 50).map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SportsEvent",
        name: event.name,
        startDate: isoDateFromYmd(event.dateYmd),
        location: {
          "@type": "Place",
          name: event.location,
          address: event.location,
        },
        url: event.website || event.fbLink || pageUrl,
        offers:
          effectiveFee(event) === null
            ? undefined
            : {
                "@type": "Offer",
                price: effectiveFee(event),
                priceCurrency: "BDT",
                url: event.website || event.fbLink || pageUrl,
              },
      },
    })),
  };
}
