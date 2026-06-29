import { useCallback } from "react";
import { toast } from "sonner";
import type { LatLng } from "@/types";
import useMapStore from "@/stores/useMapStore";

export default function usePin() {
  const { map } = useMapStore();
  const handlePinClick = useCallback(
    (position: LatLng | null) => {
      if (!map) return;
      if (!position) {
        toast.error("無法辨識位置");
        return;
      }
      map.flyTo({ center: [position.lng, position.lat], zoom: 18 });
    },
    [map],
  );
  return { handlePinClick };
}
