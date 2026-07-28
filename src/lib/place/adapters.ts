import type { NominatimPlace, PlaceDetail } from "@/types";
import type { PlaceResult } from "@/types/place";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLatLng(value: unknown): value is { lat: number; lng: number } {
  return (
    isRecord(value) &&
    typeof value.lat === "number" &&
    Number.isFinite(value.lat) &&
    typeof value.lng === "number" &&
    Number.isFinite(value.lng)
  );
}

function isLegacyNominatimPlace(value: unknown): value is NominatimPlace {
  return (
    isRecord(value) &&
    typeof value.lat === "string" &&
    typeof value.lon === "string" &&
    typeof value.display_name === "string"
  );
}

function placeDetailKey(place: PlaceDetail): string | null {
  if (place.kind === "place") return `p_${place.place.id}`;
  return isLatLng(place.position)
    ? `c_${place.position.lat}_${place.position.lng}`
    : null;
}

function legacyPlaceDetailKey(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  if (raw.kind === "place" && isRecord(raw.place)) {
    const placeId = raw.place.place_id;
    if (typeof placeId === "string" || typeof placeId === "number") {
      return `p_${placeId}`;
    }
    return null;
  }
  if (raw.kind === "coordinate" && isLatLng(raw.position)) {
    return `c_${raw.position.lat}_${raw.position.lng}`;
  }
  return null;
}

export function nominatimToPlaceResult(p: NominatimPlace): PlaceResult {
  const hasOsmReference = Boolean(p.osm_type) && p.osm_id !== undefined;
  const osmType = p.osm_type ?? "";
  const osmId = p.osm_id === undefined ? "" : String(p.osm_id);
  const address = p.address ?? {};

  return {
    id: hasOsmReference ? `osm:${osmType}:${osmId}` : `coord:${p.lat},${p.lon}`,
    source: "osm",
    name: p.name || p.display_name,
    fullAddress: p.display_name,
    addressComponents: {
      road: address.road ?? null,
      district: address.suburb ?? address.neighbourhood ?? null,
      city: address.city ?? address.town ?? address.county ?? null,
      postcode: address.postcode ?? null,
    },
    location: {
      type: "Point",
      coordinates: [Number(p.lon), Number(p.lat)],
    },
    placeClass: p.class ?? p.category ?? null,
    placeType: p.type ?? null,
    typeLabel: null,
    distanceMeters: null,
    rating: null,
    accessibility: {
      status: "unknown",
      wheelchair: null,
      nearbyFacilityCount: 0,
      source: "none",
    },
    nearbyFacilities: { toilets: [], metro: [] },
    reviewKey: hasOsmReference
      ? { placeId: `${osmType}/${osmId}`, placeType: "osm" }
      : null,
    externalLinks: {
      osm: hasOsmReference
        ? `https://www.openstreetmap.org/${osmType}/${osmId}`
        : null,
      google: null,
    },
    attribution: "© OpenStreetMap contributors",
  };
}

export function legacyPlaceDetailToPlaceResult(
  raw: unknown,
): PlaceDetail | null {
  if (!isRecord(raw)) return null;

  // Coordinate entries have no nested place object and are already compatible.
  if (raw.kind === "coordinate") return raw as PlaceDetail;

  if (
    raw.kind !== "place" ||
    !isLegacyNominatimPlace(raw.place) ||
    !isLatLng(raw.position)
  ) {
    return null;
  }

  return {
    kind: "place",
    place: nominatimToPlaceResult(raw.place),
    position: raw.position,
  };
}

export function migrateLegacyPlaceStorage({
  searchHistory,
  savedPlaces,
  savedPlaceCategories,
}: {
  searchHistory: unknown;
  savedPlaces: unknown;
  savedPlaceCategories: unknown;
}): {
  searchHistory: PlaceDetail[];
  savedPlaces: PlaceDetail[];
  savedPlaceCategories: Record<string, string>;
} {
  const migrateList = (entries: unknown): PlaceDetail[] =>
    Array.isArray(entries)
      ? entries
          .map(legacyPlaceDetailToPlaceResult)
          .filter((entry): entry is PlaceDetail => entry !== null)
      : [];

  const migratedHistory = migrateList(searchHistory);
  const categoryMap = isRecord(savedPlaceCategories)
    ? savedPlaceCategories
    : {};
  const migratedSavedPlaces: PlaceDetail[] = [];
  const migratedCategories: Record<string, string> = {};

  if (Array.isArray(savedPlaces)) {
    for (const raw of savedPlaces) {
      const oldKey = legacyPlaceDetailKey(raw);
      const migrated = legacyPlaceDetailToPlaceResult(raw);
      if (!migrated) continue;

      migratedSavedPlaces.push(migrated);
      const newKey = placeDetailKey(migrated);
      const category = oldKey ? categoryMap[oldKey] : undefined;
      if (newKey && typeof category === "string") {
        migratedCategories[newKey] = category;
      }
    }
  }

  return {
    searchHistory: migratedHistory,
    savedPlaces: migratedSavedPlaces,
    savedPlaceCategories: migratedCategories,
  };
}
