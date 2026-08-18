import { END_POINT } from "@/lib/config";
import { ApiError, fetchRequest } from "@/lib/fetch";
import { formatNominatimPlace } from "@/lib/utils";
import type { NominatimPlace } from "@/types";
import type { AutocompleteItem, PlaceResult } from "@/types/place";
import type { ApiResponse } from "@/types/response";

const BASE = `${END_POINT}/api/v1/a11y/search`;

export interface ReverseGeocodeParams {
  lat: number;
  lng: number;
  lang?: string;
  zoom?: number;
  addressdetails?: number;
}

export interface ReverseGeocodeOptions {
  zoom?: number;
  addressdetails?: number;
  signal?: AbortSignal;
}

interface ReverseCacheEntry {
  place: NominatimPlace;
  timestamp: number;
}

const REVERSE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REVERSE_CACHE_MAX_ENTRIES = 200;
const reverseGeocodeCache = new Map<string, ReverseCacheEntry>();

export function clearReverseGeocodeCache() {
  reverseGeocodeCache.clear();
}

/**
 * Reverse geocode latitude/longitude coordinates to OSM Nominatim place details.
 * Encapsulates in-memory caching, custom headers, structured error handling,
 * and OSM format normalization via formatNominatimPlace.
 */
export async function reverseGeocode(
  latOrParams: number | ReverseGeocodeParams,
  lngOrSignal?: number | AbortSignal | ReverseGeocodeOptions,
  langParam?: string,
  optionsParam?: ReverseGeocodeOptions,
): Promise<NominatimPlace | null> {
  let lat: number;
  let lng: number;
  let lang = "zh-TW";
  let zoom = 18;
  let addressdetails = 1;
  let signal: AbortSignal | undefined;

  if (typeof latOrParams === "object" && latOrParams !== null) {
    lat = latOrParams.lat;
    lng = latOrParams.lng;
    if (latOrParams.lang) lang = latOrParams.lang;
    if (latOrParams.zoom !== undefined) zoom = latOrParams.zoom;
    if (latOrParams.addressdetails !== undefined)
      addressdetails = latOrParams.addressdetails;

    if (lngOrSignal instanceof AbortSignal) {
      signal = lngOrSignal;
    } else if (typeof lngOrSignal === "object" && lngOrSignal !== null) {
      const opts = lngOrSignal as ReverseGeocodeOptions;
      signal = opts.signal;
      if (opts.zoom !== undefined) {
        zoom = opts.zoom;
      }
      if (opts.addressdetails !== undefined) {
        addressdetails = opts.addressdetails;
      }
    }
  } else {
    lat = latOrParams;
    lng = lngOrSignal as number;
    if (langParam) lang = langParam;
    if (optionsParam?.zoom !== undefined) zoom = optionsParam.zoom;
    if (optionsParam?.addressdetails !== undefined)
      addressdetails = optionsParam.addressdetails;
    signal = optionsParam?.signal;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)},${lang},${zoom},${addressdetails}`;
  const now = Date.now();
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached && now - cached.timestamp < REVERSE_CACHE_TTL_MS) {
    return structuredClone(cached.place);
  }

  const query = new URLSearchParams({
    format: "json",
    lat: String(lat),
    lon: String(lng),
    "accept-language": lang,
    zoom: String(zoom),
    addressdetails: String(addressdetails),
  });

  const url = `https://nominatim.openstreetmap.org/reverse?${query.toString()}`;

  const headers: Record<string, string> = {
    "Accept-Language": lang,
  };

  try {
    headers["User-Agent"] =
      "TaipeiAccessibleMap/1.0 (https://taipei-accessible-map.org)";
  } catch {
    // Ignore restricted header errors if any
  }

  const res = await fetch(url, {
    method: "GET",
    headers,
    signal,
  });

  if (!res.ok) {
    throw new ApiError(
      `Reverse geocoding failed with status ${res.status}`,
      res.status,
    );
  }

  const data = (await res.json()) as
    | (NominatimPlace & { error?: string })
    | null;
  if (!data || data.error) {
    return null;
  }

  const formatted = formatNominatimPlace(data, lang);
  if (!formatted) {
    return null;
  }

  if (reverseGeocodeCache.size >= REVERSE_CACHE_MAX_ENTRIES) {
    const oldestKey = reverseGeocodeCache.keys().next().value;
    if (oldestKey) reverseGeocodeCache.delete(oldestKey);
  }

  reverseGeocodeCache.set(cacheKey, {
    place: structuredClone(formatted),
    timestamp: now,
  });

  return formatted;
}

export async function getPlaceAutocomplete(
  params: {
    q: string;
    sessiontoken?: string;
    lat?: number;
    lng?: number;
    sources?: string;
    limit?: number;
    lang?: string;
  },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ q: params.q });
  if (params.sessiontoken) query.set("sessiontoken", params.sessiontoken);
  if (params.lat !== undefined) query.set("lat", String(params.lat));
  if (params.lng !== undefined) query.set("lng", String(params.lng));
  if (params.sources) query.set("sources", params.sources);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.lang) query.set("lang", params.lang);

  const response = await fetchRequest(
    `${BASE}/autocomplete?${query.toString()}`,
    signal ? { signal } : undefined,
  );
  return response as ApiResponse<AutocompleteItem[]>;
}

export async function getPlaceDetails(
  id: string,
  params: {
    sessiontoken?: string;
    lat?: number;
    lng?: number;
    lang?: string;
  },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (params.sessiontoken) query.set("sessiontoken", params.sessiontoken);
  if (params.lat !== undefined) query.set("lat", String(params.lat));
  if (params.lng !== undefined) query.set("lng", String(params.lng));
  if (params.lang) query.set("lang", params.lang);

  const response = await fetchRequest(
    `${BASE}/details/${encodeURIComponent(id)}?${query.toString()}`,
    signal ? { signal } : undefined,
  );
  return response as ApiResponse<PlaceResult>;
}
