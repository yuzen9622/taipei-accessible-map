import { useState, useEffect } from "react";
import { searchBusRoutes } from "@/lib/api/transit";
import type { BusSearchResult } from "@/types/transit";

export type BusSearchMode = "route" | "stop";

export default function useBusSearch(keyword: string, mode: BusSearchMode) {
  const [results, setResults] = useState<BusSearchResult[]>([]);
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
          // Placeholder for stop search until API is ready
          // We return empty for now, or you could hit a mock API
          setResults([]);
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
