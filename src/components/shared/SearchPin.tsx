import { useCallback, useEffect, useRef } from "react";
import { Marker } from "react-map-gl/maplibre";
import { useShallow } from "zustand/react/shallow";
import {
  MapPinIcon,
  type MapPinIconHandle,
} from "@/components/ui/map-pin-icon";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";

export default function SearchPin({
  destination,
}: {
  destination: PlaceDetail;
}) {
  const { map, setInfoShow } = useMapStore(
    useShallow((s) => ({ map: s.map, setInfoShow: s.setInfoShow })),
  );
  const handleMarker = useCallback(() => {
    if (!map) return;

    map.flyTo({
      center: [destination.position.lng, destination.position.lat],
      zoom: 18,
    });

    if (destination) {
      if (destination.kind === "place") {
        setInfoShow({
          isOpen: true,
          place: destination.place,
          kind: "place",
        });
      } else if (destination.kind === "coordinate") {
        setInfoShow({
          isOpen: true,
          address: destination.address,
          kind: "coordinate",
        });
      }
    }
  }, [map, setInfoShow, destination]);

  const iconRef = useRef<MapPinIconHandle>(null);
  const destLat = destination?.position.lat;
  const destLng = destination?.position.lng;
  useEffect(() => {
    if (destLat !== undefined && destLng !== undefined) {
      iconRef.current?.startAnimation();
    }
  }, [destLat, destLng]);

  if (!destination) return null;

  return (
    <Marker
      longitude={destination.position.lng}
      latitude={destination.position.lat}
      anchor="bottom"
      onClick={handleMarker}
    >
      <MapPinIcon
        ref={iconRef}
        size={32}
        isAnimated={false}
        className="text-red-500 fill-red-500 drop-shadow-lg"
      />
    </Marker>
  );
}
