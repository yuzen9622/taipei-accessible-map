"use client";

import { Camera, Cloud, Droplets, Thermometer, Wind, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getEnvironmentInfo } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import type { EnvironmentData } from "@/types/route";

export default function EnvironmentPanel({
  onClose,
  hideHeader,
}: {
  onClose: () => void;
  hideHeader?: boolean;
}) {
  const { t } = useAppTranslation();
  const { userLocation } = useMapStore();
  const [data, setData] = useState<EnvironmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLocation) {
      setLoading(false);
      setError(t("noLocation"));
      return;
    }
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      setLoading(false);
      setError(t("requestTimeout"));
    }, 10000);

    getEnvironmentInfo(userLocation.lat, userLocation.lng)
      .then((res) => {
        clearTimeout(timeout);
        if (res.ok && res.data) {
          setData(res.data);
        } else {
          setError(t("noData"));
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        setError(t("networkError"));
      })
      .finally(() => setLoading(false));

    return () => clearTimeout(timeout);
  }, [userLocation, t]);

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Cloud className="h-4.5 w-4.5 text-sky-500" />
            {t("environment")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
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
            onClick={() => {
              setLoading(true);
              setError(null);
              if (userLocation) {
                getEnvironmentInfo(userLocation.lat, userLocation.lng)
                  .then((res) => {
                    if (res.ok && res.data) setData(res.data);
                    else setError(t("noData"));
                  })
                  .catch(() => setError(t("networkError")))
                  .finally(() => setLoading(false));
              }
            }}
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
                  {data.cameras.items.slice(0, 3).map((cam, i) => (
                    <a
                      key={i}
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
