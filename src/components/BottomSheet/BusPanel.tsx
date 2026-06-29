"use client";

import { Bus, ChevronLeft, Loader2, Search, X } from "lucide-react";
import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { useAppTranslation } from "@/i18n/client";
import {
  getBusRouteDetail,
  type RouteDetailDirection,
  type RouteDetailStop,
} from "@/lib/api/transit";
import { Badge } from "../ui/badge";
import useBusSearch, { type BusSearchMode } from "@/hook/useBusSearch";
import type { BusSearchResult } from "@/types/transit";
import { Command, CommandGroup, CommandItem, CommandList } from "../ui/command";

const CityNameMap: Record<string, string> = {
  Taipei: "台北市",
  NewTaipei: "新北市",
  Taoyuan: "桃園市",
  Taichung: "台中市",
  Tainan: "台南市",
  Kaohsiung: "高雄市",
  Keelung: "基隆市",
  Hsinchu: "新竹市",
  HsinchuCounty: "新竹縣",
  MiaoliCounty: "苗栗縣",
  ChanghuaCounty: "彰化縣",
  NantouCounty: "南投縣",
  YunlinCounty: "雲林縣",
  ChiayiCounty: "嘉義縣",
  Chiayi: "嘉義市",
  PingtungCounty: "屏東縣",
  YilanCounty: "宜蘭縣",
  HualienCounty: "花蓮縣",
  TaitungCounty: "台東縣",
  KinmenCounty: "金門縣",
  PenghuCounty: "澎湖縣",
  LienchiangCounty: "連江縣",
};

function RouteStopCard({ stop }: { stop: RouteDetailStop }) {
  const hasEstimate =
    stop.estimateMinutes !== null && stop.estimateMinutes >= 0;
  const isArrivingSoon = hasEstimate && stop.estimateMinutes! < 3;

  let badgeText = stop.statusLabel || "尚未發車";
  let badgeColor = "text-muted-foreground bg-muted/60";

  if (hasEstimate) {
    if (isArrivingSoon) {
      badgeText = stop.estimateMinutes === 0 ? "進站中" : "即將到站";
      badgeColor =
        "text-red-600 bg-red-500/10 font-bold border border-red-500/20 shadow-sm";
    } else {
      badgeText = `${stop.estimateMinutes} 分鐘`;
      badgeColor = "text-emerald-600 bg-emerald-500/10";
    }
  }

  return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border/30">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold truncate flex-1">{stop.name}</p>
        <Badge variant="secondary" className={`text-xs shrink-0 ${badgeColor}`}>
          {badgeText}
        </Badge>
      </div>
    </div>
  );
}

export default function BusPanel({
  onClose,
  hideHeader,
}: {
  onClose: () => void;
  hideHeader?: boolean;
}) {
  const { t } = useAppTranslation();
  const [mode, setMode] = useState<BusSearchMode>("route");
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, loading: searchLoading } = useBusSearch(keyword, mode);

  const groupedResults = useMemo(() => {
    if (mode !== "route" || !results.length) return {};
    return results.reduce(
      (acc, curr) => {
        const city = CityNameMap[curr.city] || curr.city;
        if (!acc[city]) acc[city] = [];
        acc[city].push(curr);
        return acc;
      },
      {} as Record<string, BusSearchResult[]>,
    );
  }, [results, mode]);

  const [selectedRoute, setSelectedRoute] = useState<BusSearchResult | null>(
    null,
  );
  const [direction, setDirection] = useState<0 | 1 | null>(null);
  const [routeDetails, setRouteDetails] = useState<RouteDetailDirection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const REFRESH_INTERVAL = 30;
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const fetchRouteDetail = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!selectedRoute) return;
      if (!isBackgroundRefresh) setLoading(true);
      setError(null);
      try {
        const res = await getBusRouteDetail(
          selectedRoute.routeName,
          selectedRoute.city,
        );
        if (res.ok && res.data?.directions) {
          setRouteDetails(res.data.directions);
          if (!isBackgroundRefresh) {
            setDirection(0);
          }
          if (res.data.directions.length === 0) {
            setError(t("noBusData"));
          }
        } else {
          if (!isBackgroundRefresh) setRouteDetails([]);
          setError((res as { message?: string }).message || t("noBusData"));
        }
      } catch (err) {
        if (!isBackgroundRefresh) setRouteDetails([]);
        setError(err instanceof Error ? err.message : t("networkError"));
      } finally {
        if (!isBackgroundRefresh) setLoading(false);
        setCountdown(REFRESH_INTERVAL);
      }
    },
    [selectedRoute, t],
  );

  useEffect(() => {
    if (selectedRoute) {
      void fetchRouteDetail();
    }
  }, [selectedRoute, fetchRouteDetail]);

  useEffect(() => {
    if (!selectedRoute) return;

    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          void fetchRouteDetail(true);
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [selectedRoute, fetchRouteDetail]);

  const handleRouteSelect = (route: BusSearchResult) => {
    setSelectedRoute(route);
    setOpen(false);
    setKeyword("");
    setDirection(null);
    setRouteDetails([]);
    setError(null);
    setCountdown(REFRESH_INTERVAL);
  };

  const resetSelection = () => {
    setSelectedRoute(null);
    setDirection(null);
    setRouteDetails([]);
    setError(null);
    setTimeout(() => {
      inputRef.current?.focus();
      setOpen(true);
    }, 100);
  };

  const currentDirectionDetails = routeDetails.find(
    (d) => d.direction === direction,
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {!hideHeader && (
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
      )}

      {selectedRoute ? (
        <div className="flex flex-col flex-1 min-h-0 space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center gap-2">
            <button
              onClick={resetSelection}
              className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {selectedRoute.routeName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {CityNameMap[selectedRoute.city] || selectedRoute.city}
              </p>
            </div>
          </div>

          {direction !== null && routeDetails.length > 0 && (
            <div className="space-y-3">
              <div
                className="flex rounded-lg bg-muted/60 border border-border/30 p-0.5 text-sm"
                role="radiogroup"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={direction === 0}
                  onClick={() => setDirection(0)}
                  className={`flex-1 px-3 py-1.5 rounded-md transition-all duration-200 truncate ${
                    direction === 0
                      ? "bg-background shadow-sm text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  往 {selectedRoute.destination}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={direction === 1}
                  onClick={() => setDirection(1)}
                  className={`flex-1 px-3 py-1.5 rounded-md transition-all duration-200 truncate ${
                    direction === 1
                      ? "bg-background shadow-sm text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  往 {selectedRoute.departure}
                </button>
              </div>

              {/* Progress bar countdown */}
              {!loading && !error && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/80 transition-all duration-1000 ease-linear rounded-full"
                      style={{
                        width: `${(countdown / REFRESH_INTERVAL) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap w-8 text-right font-medium">
                    {countdown}s
                  </span>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-2">
              <Bus className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : currentDirectionDetails?.stops ? (
            <div
              className="space-y-2 flex-1 overflow-y-auto pr-2 pb-4"
              role="list"
            >
              {currentDirectionDetails.stops.map((stop, idx) => (
                <RouteStopCard key={`${stop.seq}-${idx}`} stop={stop} />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex rounded-lg bg-muted/60 border border-border/30 p-0.5 text-xs">
            <button
              onClick={() => setMode("route")}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mode === "route"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground"
              }`}
            >
              找路線
            </button>
            <button
              onClick={() => setMode("stop")}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mode === "stop"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground"
              }`}
            >
              找站牌
            </button>
          </div>

          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 100)}
                placeholder={
                  mode === "route"
                    ? t("routeName") || "請輸入公車路線"
                    : t("stopName") || "請輸入站牌名稱"
                }
                className="w-full h-10 pl-9 pr-10 rounded-xl bg-muted/60 border border-border/30 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {open && keyword.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card rounded-xl border shadow-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                <Command className="w-full bg-transparent">
                  <CommandList onMouseDown={(e) => e.preventDefault()}>
                    {mode === "route" ? (
                      Object.keys(groupedResults).length > 0 ? (
                        Object.entries(groupedResults).map(([city, routes]) => (
                          <CommandGroup
                            key={city}
                            heading={city}
                            className="px-1"
                          >
                            {routes.map((r, i) => (
                              <CommandItem
                                key={`${r.city}-${r.routeName}-${i}`}
                                onSelect={() => handleRouteSelect(r)}
                                className="flex flex-col items-start px-3 py-2 cursor-pointer"
                              >
                                <span className="font-semibold text-sm">
                                  {r.routeName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {r.departure} - {r.destination}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))
                      ) : !searchLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          找不到相關路線
                        </div>
                      ) : null
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        站牌搜尋功能建置中...
                      </div>
                    )}
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
