"use client";

import {
  Bus,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import {
  getBusArrival,
  getBusRoute,
  searchBusRoutes,
} from "@/lib/api/transit";
import type {
  BusArrivalItem,
  BusRouteData,
  BusSearchRouteItem,
} from "@/lib/api/transit";
import useStatusStore from "@/stores/useStatusStore";
import { Badge } from "../ui/badge";

function ArrivalCard({ item }: { item: BusArrivalItem }) {
  const isArriving =
    item.estimateMinutes <= 1 && item.statusLabel !== "尚未發車";
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

type RouteStop = BusRouteData["directions"][number]["stops"][number];

function StopList({
  stops,
  directionLabel,
  onSelectStop,
}: {
  stops: RouteStop[];
  directionLabel: string;
  onSelectStop: (name: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium mb-2">
        {directionLabel}
      </p>
      {stops.map((stop) => (
        <button
          key={`${stop.seq}-${stop.name}`}
          type="button"
          onClick={() => onSelectStop(stop.name)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
        >
          <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="text-sm truncate">{stop.name}</span>
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
            #{stop.seq}
          </span>
        </button>
      ))}
    </div>
  );
}

function RouteSearchResults({
  routes,
  onSelect,
}: {
  routes: BusSearchRouteItem[];
  onSelect: (route: BusSearchRouteItem) => void;
}) {
  return (
    <div className="space-y-1.5">
      {routes.map((route) => (
        <button
          key={`${route.routeName}-${route.city}`}
          type="button"
          onClick={() => onSelect(route)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{route.routeName}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {route.city}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {route.departure} → {route.destination}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}

type ViewState =
  | { type: "idle" }
  | { type: "routeResults"; routes: BusSearchRouteItem[] }
  | { type: "stopList"; routeData: BusRouteData; selectedCity: string }
  | { type: "arrivals"; arrivals: BusArrivalItem[] }
  | { type: "empty" }
  | { type: "error"; message: string };

export default function BusPanel({ onClose }: { onClose: () => void }) {
  const { t } = useAppTranslation();
  const [routeName, setRouteName] = useState("");
  const [stopName, setStopName] = useState("");
  const [direction, setDirection] = useState<0 | 1>(0);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewState>({ type: "idle" });
  const [selectedRoute, setSelectedRoute] = useState<string>("");

  const canSearch = routeName.trim() || stopName.trim();

  const fetchArrivals = useCallback(
    async (route: string, stop: string, city: string, dir: 0 | 1) => {
      setLoading(true);
      try {
        useStatusStore.getState().startAction("query_bus");
        const res = await getBusArrival(route, stop, city, dir);
        if (res.ok && res.data && (res.data.arrivals?.length ?? 0) > 0) {
          setView({ type: "arrivals", arrivals: res.data.arrivals });
          useStatusStore.getState().succeedAction("query_bus");
        } else {
          setView({ type: "empty" });
          useStatusStore.getState().failAction("查無公車到站資料");
        }
      } catch {
        setView({ type: "error", message: t("networkError") });
        useStatusStore.getState().failAction("查詢公車時網路異常");
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    const route = routeName.trim();
    const stop = stopName.trim();

    setLoading(true);
    setView({ type: "idle" });

    // Both fields filled: direct arrival query (search-routes first for city)
    if (route && stop) {
      try {
        useStatusStore.getState().startAction("query_bus");
        const searchRes = await searchBusRoutes(route);
        const city =
          searchRes.ok && searchRes.data?.routes?.[0]?.city
            ? searchRes.data.routes[0].city
            : "台北";
        await fetchArrivals(route, stop, city, direction);
      } catch {
        setView({ type: "error", message: t("networkError") });
        useStatusStore.getState().failAction("查詢公車時網路異常");
        setLoading(false);
      }
      return;
    }

    // Route-only: search for matching routes
    if (route && !stop) {
      try {
        useStatusStore.getState().startAction("query_bus");
        const res = await searchBusRoutes(route);
        if (res.ok && res.data?.routes?.length) {
          if (res.data.routes.length === 1) {
            // Single match → go straight to stops
            const match = res.data.routes[0];
            setSelectedRoute(match.routeName);
            const routeRes = await getBusRoute(
              match.routeName,
              match.city
            );
            if (routeRes.ok && routeRes.data) {
              setView({
                type: "stopList",
                routeData: routeRes.data,
                selectedCity: match.city,
              });
              useStatusStore.getState().succeedAction("query_bus");
            } else {
              setView({ type: "empty" });
              useStatusStore.getState().failAction("查無公車路線資料");
            }
          } else {
            // Multiple matches → let user pick
            setView({ type: "routeResults", routes: res.data.routes });
            useStatusStore.getState().succeedAction("query_bus");
          }
        } else {
          setView({ type: "empty" });
          useStatusStore.getState().failAction("查無公車路線資料");
        }
      } catch {
        setView({ type: "error", message: t("networkError") });
        useStatusStore.getState().failAction("查詢公車時網路異常");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Stop-only: not supported by backend
    if (!route && stop) {
      setView({ type: "error", message: t("busNeedRoute") });
      setLoading(false);
    }
  }, [routeName, stopName, direction, canSearch, fetchArrivals, t]);

  const handleSelectRoute = useCallback(
    async (route: BusSearchRouteItem) => {
      setLoading(true);
      setSelectedRoute(route.routeName);
      setRouteName(route.routeName);
      try {
        const res = await getBusRoute(route.routeName, route.city);
        if (res.ok && res.data) {
          setView({
            type: "stopList",
            routeData: res.data,
            selectedCity: route.city,
          });
        } else {
          setView({ type: "empty" });
        }
      } catch {
        setView({ type: "error", message: t("networkError") });
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const handleSelectStop = useCallback(
    (selectedStop: string) => {
      setStopName(selectedStop);
      const city =
        view.type === "stopList" ? view.selectedCity : "台北";
      void fetchArrivals(
        selectedRoute || routeName.trim(),
        selectedStop,
        city,
        direction
      );
    },
    [selectedRoute, routeName, direction, fetchArrivals, view]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleSearch();
  };

  const directionStops =
    view.type === "stopList"
      ? view.routeData.directions.find((d) => d.direction === direction)
      : null;

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
          <div
            className="flex rounded-lg bg-muted/60 border border-border/30 p-0.5 text-xs"
            role="radiogroup"
            aria-label={t("outbound")}
          >
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
      ) : view.type === "error" ? (
        <div className="text-center py-8 space-y-2">
          <Bus className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{view.message}</p>
        </div>
      ) : view.type === "routeResults" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {t("busRouteMatches", { count: view.routes.length })}
          </p>
          <RouteSearchResults
            routes={view.routes}
            onSelect={handleSelectRoute}
          />
        </div>
      ) : view.type === "stopList" && directionStops ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {t("busSelectStop", { route: selectedRoute || routeName.trim() })}
          </p>
          <StopList
            stops={directionStops.stops}
            directionLabel={directionStops.directionLabel}
            onSelectStop={handleSelectStop}
          />
        </div>
      ) : view.type === "arrivals" ? (
        <div className="space-y-2" role="list" aria-label={t("busInfo")}>
          <p className="text-xs text-muted-foreground font-medium">
            {t("busRouteResults", {
              route: selectedRoute || routeName.trim(),
            })}
          </p>
          {view.arrivals.map((item, idx) => (
            <ArrivalCard
              key={`${item.stopName}-${item.direction}-${idx}`}
              item={item}
            />
          ))}
        </div>
      ) : view.type === "empty" ? (
        <div className="text-center py-8 space-y-2">
          <Bus className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noBusData")}</p>
        </div>
      ) : null}
    </div>
  );
}
