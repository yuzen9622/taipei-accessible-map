import { useEffect, useState } from "react";

import { useMapsLibrary } from "@vis.gl/react-google-maps";

export default function usePlaceSuggestions(input: string) {
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [loading, setLoading] = useState(false);

  const placeLib = useMapsLibrary("places");

  useEffect(() => {
    if (!placeLib) return;
    const { AutocompleteSuggestion } = placeLib;
    if (!input) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const request = {
      input,
      region: "tw",
    };

    setLoading(true);
    const handler = setTimeout(() => {
      AutocompleteSuggestion.fetchAutocompleteSuggestions(request).then(
        (res) => {
          setSuggestions(res.suggestions);
          setLoading(false);
        }
      );
    }, 500);

    return () => clearTimeout(handler);
  }, [input, placeLib]);

  return { suggestions, loading };
}
