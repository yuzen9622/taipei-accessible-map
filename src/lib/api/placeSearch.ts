import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import type { AutocompleteItem, PlaceResult } from "@/types/place";
import type { ApiResponse } from "@/types/response";

const BASE = `${END_POINT}/api/v1/a11y/search`;

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
