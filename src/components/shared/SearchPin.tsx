import { Marker } from "react-map-gl/maplibre";
import { MapPin } from "lucide-react";
import { useCallback } from "react";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";

export default function SearchPin({
  destination,
}: {
  destination: PlaceDetail;
}) {
  const { map, setInfoShow } = useMapStore();
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

  if (!destination) return null;

  return (
    <Marker
      longitude={destination.position.lng}
      latitude={destination.position.lat}
      anchor="bottom"
      onClick={handleMarker}
    >
      <MapPin className="h-8 w-8 text-red-500 fill-red-500 drop-shadow-lg" />
    </Marker>
  );
}
