"use client";

import {
  Camera,
  Cloud,
  Droplets,
  MapPin,
  Navigation,
  RefreshCw,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppTranslation } from "@/i18n/client";
import { getEnvironmentInfo } from "@/lib/api/a11y";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { EnvironmentData } from "@/types/route";

type EnvTarget = "current" | "destination";

export default function EnvironmentPanel({
  onClose,
  hideHeader,
}: {
  onClose: () => void;
  hideHeader?: boolean;
}) {
  const { t } = useAppTranslation();
  const { hasUserLocation, destPosition, destinationName } = useMapStore(
    useShallow((s) => ({
      hasUserLocation: !!s.userLocation,
      destPosition: s.destination?.position ?? null,
      destinationName: s.destinationName,
    })),
  );
  // Destination-first: once the user has picked a destination, "will it rain
  // where I'm going" matters more than "where I am right now".
  const [target, setTarget] = useState<EnvTarget>(
    destPosition ? "destination" : "current",
  );
  const [data, setData] = useState<EnvironmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // One cached result per target so toggling back doesn't refetch.
  const cacheRef = useRef<Partial<Record<EnvTarget, EnvironmentData>>>({});

  // If the destination is cleared while we're showing it, fall back.
  useEffect(() => {
    if (!destPosition && target === "destination") setTarget("current");
  }, [destPosition, target]);

  // A new destination invalidates its cached snapshot — otherwise switching
  // the route target from A to B would keep showing A's environment.
  // biome-ignore lint/correctness/useExhaustiveDependencies(destPosition): destPosition is the invalidation trigger; the body only clears the cache
  useEffect(() => {
    cacheRef.current.destination = undefined;
  }, [destPosition]);

  const fetchEnvironment = useCallback(
    async (force = false) => {
      const loc =
        target === "destination"
          ? destPosition
          : useMapStore.getState().userLocation;
      if (!loc) {
        setLoading(false);
        setData(null);
        setError(t("noLocation"));
        return;
      }
      const cached = cacheRef.current[target];
      if (cached && !force) {
        setData(cached);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);

      const timeout = setTimeout(() => {
        setLoading(false);
        setError(t("requestTimeout"));
      }, 10000);

      try {
        const res = await getEnvironmentInfo(loc.lat, loc.lng);
        clearTimeout(timeout);
        if (res.ok && res.data) {
          cacheRef.current[target] = res.data;
          setData(res.data);
        } else {
          setError(t("noData"));
        }
      } catch {
        clearTimeout(timeout);
        setError(t("networkError"));
      } finally {
        setLoading(false);
      }
    },
    [target, destPosition, t],
  );

  // Refetch when the target toggles or the first GPS fix arrives (cache makes
  // repeat runs free).
  useEffect(() => {
    // Querying the current location needs a GPS fix first; keep the spinner
    // until it arrives (matches the previous behaviour).
    if (target === "current" && !hasUserLocation) return;
    fetchEnvironment();
  }, [fetchEnvironment, hasUserLocation, target]);

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Cloud className="h-4.5 w-4.5 text-sky-500" />
            {t("environment")}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fetchEnvironment(true)}
              disabled={loading}
              className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted"
              aria-label={t("refresh", "重新整理")}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Where to check: destination-aware segmented toggle. Big touch
          targets for elderly / low-dexterity users. */}
      {destPosition && (
        <div
          role="tablist"
          aria-label={t("envTargetLabel")}
          className="flex rounded-full bg-muted/60 p-1 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={target === "current"}
            onClick={() => setTarget("current")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors min-w-0",
              target === "current"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Navigation className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("envCurrentLocation")}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={target === "destination"}
            onClick={() => setTarget("destination")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors min-w-0",
              target === "destination"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
            <span className="truncate">
              {destinationName || t("envDestination")}
            </span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8 space-y-2">
          <Cloud className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => fetchEnvironment(true)}
            className="text-xs text-primary hover:underline"
          >
            {t("retry")}
          </button>
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("noData")}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Weather */}
          {data.weather.status === "ok" && (
            <div className="rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/5 p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Cloud className="h-4 w-4 text-sky-500" />
                {t("weather")}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {data.weather.temperature != null && (
                  <div className="text-center">
                    <Thermometer className="h-5 w-5 mx-auto text-red-400 mb-1" />
                    <p className="text-lg font-bold">
                      {data.weather.temperature}°
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("temperature")}
                    </p>
                  </div>
                )}
                {data.weather.precipitationProbability != null && (
                  <div className="text-center">
                    <Droplets className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                    <p className="text-lg font-bold">
                      {data.weather.precipitationProbability}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("precipitation")}
                    </p>
                  </div>
                )}
                {data.weather.windSpeed != null && (
                  <div className="text-center">
                    <Wind className="h-5 w-5 mx-auto text-teal-400 mb-1" />
                    <p className="text-lg font-bold">
                      {data.weather.windSpeed}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("wind")}</p>
                  </div>
                )}
              </div>
              {data.weather.condition && (
                <p className="text-xs text-center text-muted-foreground">
                  {data.weather.condition}
                </p>
              )}
            </div>
          )}

          {/* Air Quality */}
          {data.airQuality.status === "ok" && (
            <div className="rounded-xl bg-muted/40 p-4">
              <h3 className="text-sm font-semibold mb-1">{t("airQuality")}</h3>
              <p className="text-sm">{data.airQuality.description}</p>
              {data.airQuality.quality && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {data.airQuality.quality}
                </span>
              )}
            </div>
          )}

          {/* Cameras */}
          {data.cameras?.status === "ok" &&
            data.cameras.items &&
            data.cameras.items.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Camera className="h-4 w-4" />
                  {t("cameras")}
                </h3>
                <div className="space-y-2">
                  {data.cameras.items.slice(0, 3).map((cam) => (
                    <a
                      key={`${cam.name}-${cam.distance}`}
                      href={cam.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-sm"
                    >
                      <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{cam.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {cam.distance}m
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
