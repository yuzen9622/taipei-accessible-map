"use client";

import {
  Car,
  CircleParking,
  ExternalLink,
  Loader2,
  MapPin,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getNearbyParking } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import type { DisabledParking } from "@/types/route";
import { Badge } from "../ui/badge";

function ParkingCard({
  item,
  onNavigate,
}: {
  item: DisabledParking;
  onNavigate: (item: DisabledParking) => void;
}) {
  const { t } = useAppTranslation();

  return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border/30 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{item.placeName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {item.district}
          </p>
        </div>
        {item.isMarked && (
          <Badge
            variant="secondary"
            className="text-xs shrink-0 text-indigo-600 bg-indigo-500/10"
          >
            {t("marked")}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Car className="h-3 w-3 shrink-0" />
        <span>{t("spots", { count: item.quantity })}</span>
      </div>

      {item.chargeType && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>
            {t("chargeType")}: {item.chargeType}
          </span>
        </div>
      )}

      {item.spaceLabel && (
        <p className="text-xs text-muted-foreground truncate">
          {item.spaceLabel}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onNavigate(item)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {t("viewOnMap")}
        </button>
      </div>
    </div>
  );
}

export default function ParkingPanel({ onClose, hideHeader }: { onClose: () => void; hideHeader?: boolean }) {
  const { t } = useAppTranslation();
  const { userLocation, map } = useMapStore();
  const [data, setData] = useState<DisabledParking[]>([]);
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

    getNearbyParking(userLocation.lat, userLocation.lng)
      .then((res) => {
        if (res.ok && res.data) {
          setData(res.data);
        } else {
          setError(t("noData"));
        }
      })
      .catch(() => {
        setError(t("networkError"));
      })
      .finally(() => setLoading(false));
  }, [userLocation, t]);

  const handleNavigate = (item: DisabledParking) => {
    if (!map) return;
    map.flyTo({ center: [item.longitude, item.latitude], zoom: 17 });
  };

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <CircleParking className="h-4.5 w-4.5 text-indigo-600" />
            {t("parking")}
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
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-8 space-y-2">
          <Car className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Car className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {t("noNearbyParking")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("foundNearbyParking", { count: data.length })}
          </p>
          {data.map((item) => (
            <ParkingCard
              key={item._id}
              item={item}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
