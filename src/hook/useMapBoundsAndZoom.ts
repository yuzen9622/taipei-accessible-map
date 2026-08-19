"use client";

import type maplibregl from "maplibre-gl";
import { useEffect, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";

export function useMapBoundsAndZoom(
  map: maplibregl.Map | MapRef | null | undefined,
) {
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );
  const [zoom, setZoom] = useState<number>(15);

  useEffect(() => {
    if (!map) return;
    const updateBounds = () => {
      const b = map.getBounds();
      if (b) {
        setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
        setZoom(map.getZoom());
      }
    };
    updateBounds();
    map.on("move", updateBounds);
    map.on("zoom", updateBounds);
    return () => {
      map.off("move", updateBounds);
      map.off("zoom", updateBounds);
    };
  }, [map]);

  return { bounds, zoom };
}
