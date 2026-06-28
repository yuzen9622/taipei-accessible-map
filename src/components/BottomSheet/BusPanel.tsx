"use client";

import {
  Bus,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getBusArrival, type BusArrivalItem } from "@/lib/api/transit";
import { Badge } from "../ui/badge";

const CITIES = [
  { value: "台北", label: "台北" },
  { value: "新北", label: "新北" },
  { value: "桃園", label: "桃園" },
  { value: "台中", label: "台中" },
  { value: "台南", label: "台南" },
  { value: "高雄", label: "高雄" },
];

function ArrivalCard({ item }: { item: BusArrivalItem }) {
  const hasEstimate = item.estimateMinutes !== null;

  return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold truncate flex-1">{item.stopName}</p>
        <Badge
          variant="secondary"
          className={`text-xs shrink-0 ${
            hasEstimate
              ? "text-emerald-600 bg-emerald-500/10"
              : "text-muted-foreground bg-muted/60"
          }`}
        >
          {hasEstimate ? `${item.estimateMinutes} 分鐘` : item.statusLabel}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{item.directionLabel}</p>
    </div>
  );
}

export default function BusPanel({ onClose }: { onClose: () => void }) {
  const { t } = useAppTranslation();
  const [routeName, setRouteName] = useState("");
  const [stopName, setStopName] = useState("");
  const [city, setCity] = useState("台北");
  const [direction, setDirection] = useState<0 | 1>(0);
  const [data, setData] = useState<BusArrivalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const canSearch = routeName.trim().length > 0 && stopName.trim().length > 0;

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await getBusArrival(
        routeName.trim(),
        stopName.trim(),
        direction,
        city
      );
      if (res.ok && res.data?.arrivals) {
        setData(res.data.arrivals);
        if (res.data.arrivals.length === 0) {
          setError(t("noBusData"));
        }
      } else {
        setData([]);
        setError((res as { message?: string }).message || t("noBusData"));
      }
    } catch (err) {
      setData([]);
      const msg = err instanceof Error ? err.message : t("networkError");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [routeName, stopName, direction, city, canSearch, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleSearch();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Bus className="h-4.5 w-4.5 text-emerald-500" />
          {t("busInfo")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted"
          aria-label={t("close")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{t("busSearchHint")}</p>

      {/* Search inputs */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("routeName")}
            aria-label={t("routeName")}
            className="flex-1 h-10 px-3 rounded-lg bg-muted/60 border border-border/30 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <input
            type="text"
            value={stopName}
            onChange={(e) => setStopName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("stopName")}
            aria-label={t("stopName")}
            className="flex-1 h-10 px-3 rounded-lg bg-muted/60 border border-border/30 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        {/* City + Direction + Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-9 px-2 rounded-lg bg-muted/60 border border-border/30 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {CITIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <div className="flex rounded-lg bg-muted/60 border border-border/30 p-0.5 text-xs" role="radiogroup">
            <button
              type="button"
              role="radio"
              aria-checked={direction === 0}
              onClick={() => setDirection(0)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                direction === 0
                  ? "bg-emerald-500/10 text-emerald-600 font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("outbound")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={direction === 1}
              onClick={() => setDirection(1)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                direction === 1
                  ? "bg-emerald-500/10 text-emerald-600 font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("inbound")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={!canSearch || loading}
            className="ml-auto flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm font-medium hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            {t("searchBus")}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : error ? (
        <div className="text-center py-8 space-y-2">
          <Bus className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : searched && data.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Bus className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noBusData")}</p>
        </div>
      ) : data.length > 0 ? (
        <div className="space-y-2" role="list" aria-label={t("busInfo")}>
          {data.map((item, idx) => (
            <ArrivalCard key={`${item.stopName}-${item.direction}-${idx}`} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
