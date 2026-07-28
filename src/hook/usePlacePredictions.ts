import { useCallback, useEffect, useRef, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getPlaceAutocomplete } from "@/lib/api/placeSearch";
import { toApiLang } from "@/lib/place/lang";
import { createSearchSessionToken } from "@/lib/place/searchSession";
import useMapStore from "@/stores/useMapStore";
import type { AutocompleteItem } from "@/types/place";

export default function usePlacePredictions(input: string) {
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { i18n } = useAppTranslation("translation");
  const lang = toApiLang(i18n.language);
  const userLocation = useMapStore((s) => s.userLocation);
  const sessionTokenRef = useRef<string | null>(null);
  if (sessionTokenRef.current === null) {
    sessionTokenRef.current = createSearchSessionToken();
  }
  const [sessionToken, setSessionToken] = useState(sessionTokenRef.current);

  const resetSession = useCallback(() => {
    const nextToken = createSearchSessionToken();
    sessionTokenRef.current = nextToken;
    setSessionToken(nextToken);
  }, []);

  useEffect(() => {
    const query = input.trim();
    if (!query) {
      setSuggestions([]);
      setLoading(false);
      resetSession();
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await getPlaceAutocomplete(
          {
            q: query,
            sessiontoken: sessionTokenRef.current ?? undefined,
            lat: userLocation?.lat,
            lng: userLocation?.lng,
            limit: 8,
            lang,
          },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setSuggestions(res.ok && res.data ? res.data : []);
        }
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [input, lang, resetSession, userLocation?.lat, userLocation?.lng]);

  return { suggestions, loading, sessionToken, resetSession };
}
