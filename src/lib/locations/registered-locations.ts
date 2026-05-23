export type RegisteredDeliveryLocation = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  source: "manual" | "fallback";
  aliases?: string[];
};

type LocationSearchCandidate = {
  label: string;
  address: string;
  placeId?: string;
  aliases?: string[];
};

export const defaultDeliveryLocation: RegisteredDeliveryLocation = {
  label: "Bengaluru",
  address: "Bengaluru, Karnataka",
  latitude: 12.9716,
  longitude: 77.5946,
  placeId: "fallback-bengaluru",
  source: "fallback",
  aliases: ["bangalore"],
};

export const registeredDeliveryLocations: RegisteredDeliveryLocation[] = [
  defaultDeliveryLocation,
  {
    label: "Monarch Serenity",
    address: "No 84/2, Monarch Serenity, Thanisandra Main Road, Thanisandra, Bengaluru, Karnataka 560077",
    latitude: 13.0559,
    longitude: 77.6325,
    placeId: "registered-monarch-serenity-thanisandra",
    source: "manual",
    aliases: [
      "monarch serenity apartment",
      "monarch serenity apartments",
      "monarch serenity thanisandra",
      "monarch serenity bengaluru",
    ],
  },
  {
    label: "Reliance Smart, Monarch Serenity",
    address: "GF, Monarch Serenity, Thanisandra Main Road, Thanisandra, Bengaluru, Karnataka 560077",
    latitude: 13.0559,
    longitude: 77.6325,
    placeId: "registered-reliance-smart-monarch-serenity",
    source: "manual",
    aliases: [
      "reliance smart monarch serenity",
      "reliance monarch serenity",
      "monarch serenity reliance",
    ],
  },
  {
    label: "Koramangala",
    address: "Koramangala, Bengaluru, Karnataka",
    latitude: 12.9352,
    longitude: 77.6245,
    placeId: "fallback-koramangala",
    source: "manual",
  },
  {
    label: "Indiranagar",
    address: "Indiranagar, Bengaluru, Karnataka",
    latitude: 12.9719,
    longitude: 77.6412,
    placeId: "fallback-indiranagar",
    source: "manual",
  },
  {
    label: "HSR Layout",
    address: "HSR Layout, Bengaluru, Karnataka",
    latitude: 12.9116,
    longitude: 77.6389,
    placeId: "fallback-hsr",
    source: "manual",
  },
  {
    label: "Whitefield",
    address: "Whitefield, Bengaluru, Karnataka",
    latitude: 12.9698,
    longitude: 77.75,
    placeId: "fallback-whitefield",
    source: "manual",
  },
];

export function normalizeLocationSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchRegisteredDeliveryLocations<T extends LocationSearchCandidate>(
  query: string,
  locations: T[] = registeredDeliveryLocations as unknown as T[],
) {
  const normalized = normalizeLocationSearch(query);
  if (!normalized) return [];

  const terms = normalized.split(" ").filter(Boolean);
  return locations.filter((location) => {
    const searchable = normalizeLocationSearch([
      location.label,
      location.address,
      location.placeId,
      ...(location.aliases ?? []),
    ].join(" "));
    return terms.every((term) => searchable.includes(term));
  });
}
