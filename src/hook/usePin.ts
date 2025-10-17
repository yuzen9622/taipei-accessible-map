import { useCallback } from "react";
import { toast } from "sonner";
import useMapStore from "@/stores/useMapStore";

export default function usePin() {
  const { map } = useMapStore();
  const handlePinClick = useCallback(
    (position: google.maps.LatLngLiteral | null) => {
      if (!map) return;
      if (!position) {
        toast.error("無法辨識位置");
        return;
      }
      map.panBy(20, 20);
      map.panTo(position);
      map.setZoom(18);
    },
    [map]
  );
  return { handlePinClick };
}
