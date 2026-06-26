"use client";

import {
  Bus,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getBusArrival } from "@/lib/api/transit";
import type { EstimatedTimeOfArrival } from "@/types/route";
import { Badge } from "../ui/badge";

function stopStatusText(status: number, t: (k: string) => string): string {
  switch (status) {
    case 1:
      return t("notDeparted");
    case 2:
      return t("trafficStop");
    case 3:
      return t("lastBusPassed");
    case 4:
      return t("noService");
    default:
      return t("noData");
  }
}

function ArrivalCard({ item, t }: { item: EstimatedTimeOfArrival; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const estimateText = (() => {
    if (item.EstimateTime === null) return stopStatusText(item.StopStatus, t);
    if (item.EstimateTime <= 60) return t("arriving");
    const minutes = Math.ceil(item.EstimateTime / 60);
    return t("minutesAway", { minutes });
  })();

  const isArriving = item.EstimateTime !== null && item.EstimateTime <= 60;
  const isNormal = item.EstimateTime !== null && item.EstimateTime > 60;

  return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border/30 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {item.StopName.Zh_tw}
          </p>
          {item.RouteName && (
            <p className="text-xs text-muted-foreground truncate">
              {item.RouteName.Zh_tw}
            </p>
          )}
        </div>
        <Badge
          variant="secondary"
          className={`text-xs shrink-0 ${
            isArriving
              ? "text-emerald-600 bg-emerald-500/10"
              : isNormal
                ? "text-emerald-600 bg-emerald-500/10"
                : "text-muted-foreground bg-muted/60"
          }`}
        >
          {estimateText}
        </Badge>
      </div>

      {item.PlateNumb && (
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-1.5 py-0"
          >
            {item.PlateNumb}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function BusPanel({ onClose }: { onClose: () => void }) {
  const { t } = useAppTranslation();
  const [routeName, setRouteName] = useState("");
  const [stopName, setStopName] = useState("");
  const [direction, setDirection] = useState<0 | 1>(0);
  const [data, setData] = useState<EstimatedTimeOfArrival[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const canSearch = routeName.trim() || stopName.trim();

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await getBusArrival(
        routeName.trim() || undefined,
        stopName.trim() || undefined,
        direction
      );
      if (res.ok && res.data) {
        setData(res.data);
      } else {
        setData([]);
        setError(t("noBusData"));
      }
    } catch {
      setData([]);
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }, [routeName, stopName, direction, canSearch, t]);

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

      {/* Search hint */}
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

        {/* Direction toggle + search button */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-muted/60 border border-border/30 p-0.5 text-xs" role="radiogroup" aria-label={t("outbound")}>
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
          {routeName.trim() && !stopName.trim() && (
            <p className="text-xs text-muted-foreground font-medium">
              {t("busRouteResults", { route: routeName.trim() })}
            </p>
          )}
          {stopName.trim() && !routeName.trim() && (
            <p className="text-xs text-muted-foreground font-medium">
              {t("busStopResults", { stop: stopName.trim() })}
            </p>
          )}
          {data.map((item) => (
            <ArrivalCard
              key={`${item.StopUID}-${item.Direction}`}
              item={item}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
