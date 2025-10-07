import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import useMapStore from "@/stores/useMapStore";

type PolylineCustomProps = {
  encodedPath?: string;
};

export type PolylineProps = google.maps.PolylineOptions & PolylineCustomProps;

export default function Polyline({
  encodedPath,
  ...polylineOptions
}: PolylineProps) {
  const { map } = useMapStore();
  const geometryLibrary = useMapsLibrary("geometry");
  const mapsLibrary = useMapsLibrary("maps");
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);
  polyline?.setOptions(polylineOptions);

  useEffect(() => {
    if (!mapsLibrary) return;

    setPolyline(new mapsLibrary.Polyline());
  }, [mapsLibrary]);
  useEffect(() => {
    if (!encodedPath || !geometryLibrary || !polyline) return;

    polyline.setPath(geometryLibrary.encoding.decodePath(encodedPath));
  }, [polyline, encodedPath, geometryLibrary]);

  useEffect(() => {
    if (!map || !polyline) return;

    console.log("adding polyline to map");
    polyline.setMap(map);

    return () => polyline.setMap(null);
  }, [map, polyline]);

  return <div></div>;
}
