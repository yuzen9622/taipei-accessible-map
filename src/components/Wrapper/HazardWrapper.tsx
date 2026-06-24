"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import { useAppTranslation } from "@/i18n/client";
import { getNearbyHazardReports } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import type { HazardReport } from "@/types/route";

export default function HazardWrapper() {
  const { t } = useAppTranslation();
  const { userLocation } = useMapStore();
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [selected, setSelected] = useState<HazardReport | null>(null);

  useEffect(() => {
    if (!userLocation) return;
    getNearbyHazardReports(userLocation.lat, userLocation.lng, 1000)
      .then((res) => {
        if (res.ok && res.data?.reports) setHazards(res.data.reports);
      })
      .catch(() => {});
  }, [userLocation]);

  if (hazards.length === 0) return null;

  return (
    <>
      {hazards.map((h) => {
        const [lng, lat] = h.reportedLocation.coordinates;
        return (
          <Marker
            key={h._id}
            longitude={lng}
            latitude={lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(h);
            }}
          >
            <div className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform">
              <AlertTriangle className="h-3.5 w-3.5 text-white" />
            </div>
          </Marker>
        );
      })}

      {selected && (
        <Popup
          longitude={selected.reportedLocation.coordinates[0]}
          latitude={selected.reportedLocation.coordinates[1]}
          anchor="bottom"
          onClose={() => setSelected(null)}
          closeOnClick={false}
          className="[&_.maplibregl-popup-content]:rounded-xl [&_.maplibregl-popup-content]:p-3 [&_.maplibregl-popup-content]:shadow-lg"
        >
          <div className="space-y-1 min-w-[160px]">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              {t(selected.hazardType === "data_error" ? "dataError" : selected.hazardType)}
            </p>
            {selected.description && (
              <p className="text-xs text-muted-foreground">{selected.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {selected.status === "verified" ? t("confirmed") : t("pending")}
              {selected.confirmCount != null && ` · ${selected.confirmCount} ${t("confirmed")}`}
            </p>
          </div>
        </Popup>
      )}
    </>
  );
}
