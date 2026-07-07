import { useEffect, useState } from "react";
import { searchBusRoutes, searchBusStops } from "@/lib/api/transit";
import type { BusSearchResult, BusStopSearchResult } from "@/types/transit";

export type BusSearchMode = "route" | "stop";

export default function useBusSearch(keyword: string, mode: BusSearchMode) {
  const [results, setResults] = useState<
    (BusSearchResult | BusStopSearchResult)[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const handler = setTimeout(async () => {
      try {
        if (mode === "route") {
          const res = await searchBusRoutes(keyword.trim());
          if (res.ok && res.data?.routes) {
            setResults(res.data.routes);
          } else {
            setResults([]);
            setError((res as { message?: string }).message || "No data");
          }
        } else {
          const res = await searchBusStops(keyword.trim());
          if (res.ok && res.data?.stops) {
            setResults(res.data.stops);
          } else {
            setResults([]);
            setError((res as { message?: string }).message || "No data");
          }
        }
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "Error fetching data");
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [keyword, mode]);

  return { results, loading, error };
}
