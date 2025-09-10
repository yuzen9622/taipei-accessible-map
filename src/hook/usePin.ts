import { useCallback } from "react";

import useMapStore from "@/stores/useMapStore";

export default function usePin() {
  const { map } = useMapStore();
  const handlePinClick = useCallback(
    (position: google.maps.LatLngLiteral) => {
      if (!map) return;
      map.panBy(20, 20);
      map.panTo(position);
      map.setZoom(18);
    },
    [map]
  );
  return { handlePinClick };
}
