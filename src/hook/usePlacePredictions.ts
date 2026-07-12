import { useEffect, useState } from "react";
import { formatNominatimPlace } from "@/lib/utils";
import useAuthStore from "@/stores/useAuthStore";
import type { NominatimPlace } from "@/types";

export default function usePlaceSuggestions(input: string) {
  const [suggestions, setSuggestions] = useState<NominatimPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const { userConfig } = useAuthStore();

  useEffect(() => {
    if (!input) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const lang = userConfig.language === "zh-TW" ? "zh" : "en";
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&countrycodes=tw&limit=5&accept-language=${lang}&addressdetails=1`,
        );
        const data: NominatimPlace[] = await res.json();
        const formatted = data.map((item) =>
          formatNominatimPlace(item, userConfig.language),
        );
        setSuggestions(formatted);
      } catch {
        setSuggestions([]);
      }
      setLoading(false);
    }, 500);
    return () => clearTimeout(handler);
  }, [input, userConfig.language]);


  return { suggestions, loading };
}
