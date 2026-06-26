"use client";

import {
  Bus,
  Clock,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getBusArrival } from "@/lib/api/transit";
import type { BusArrivalItem } from "@/lib/api/transit";
import { Badge } from "../ui/badge";

function ArrivalCard({ item }: { item: BusArrivalItem }) {
  const isArriving = item.estimateMinutes <= 1 && item.statusLabel !== "尚未發車";
  const isNormal = item.estimateMinutes > 1;

  const displayText = (() => {
    if (item.estimateMinutes === 0 && item.statusLabel) return item.statusLabel;
    if (item.estimateMinutes <= 1) return item.statusLabel || "進站中";
    return `${item.estimateMinutes} 分鐘`;
  })();

  return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border/30 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{item.stopName}</p>
          <p className="text-xs text-muted-foreground">{item.directionLabel}</p>
        </div>
        <Badge
          variant="secondary"
          className={`text-xs shrink-0 ${
            isArriving
              ? "text-amber-600 bg-amber-500/10"
              : isNormal
                ? "text-emerald-600 bg-emerald-500/10"
                : "text-muted-foreground bg-muted/60"
          }`}
        >
          <Clock className="h-3 w-3 mr-1" />
          {displayText}
        </Badge>
      </div>
      {item.plateNumb && (
        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
          {item.plateNumb}
        </Badge>
      )}
    </div>
  );
}

export default function BusPanel({ onClose }: { onClose: () => void }) {
  const { t } = useAppTranslation();
  const [routeName, setRouteName] = useState("");
  const [stopName, setStopName] = useState("");
  const [direction, setDirection] = useState<0 | 1>(0);
  const [arrivals, setArrivals] = useState<BusArrivalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const canSearch = routeName.trim() && stopName.trim();

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await getBusArrival(
        routeName.trim(),
        stopName.trim(),
        "台北",
        direction
      );
      if (res.ok && res.data) {
        setArrivals(res.data.arrivals ?? []);
      } else {
        setArrivals([]);
        setError(t("noBusData"));
      }
    } catch {
      setArrivals([]);
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

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : error ? (
        <div className="text-center py-8 space-y-2">
          <Bus className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : searched && arrivals.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Bus className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noBusData")}</p>
        </div>
      ) : arrivals.length > 0 ? (
        <div className="space-y-2" role="list" aria-label={t("busInfo")}>
          <p className="text-xs text-muted-foreground font-medium">
            {t("busRouteResults", { route: routeName.trim() })}
          </p>
          {arrivals.map((item, idx) => (
            <ArrivalCard
              key={`${item.stopName}-${item.direction}-${idx}`}
              item={item}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
