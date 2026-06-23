"use client";
import { Layer, Source } from "react-map-gl/maplibre";
import type { LineLayerSpecification } from "maplibre-gl";

type PolylineProps = {
  id: string;
  path: { lat: number; lng: number }[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  zIndex?: number;
  dashArray?: number[];
};

export default function Polyline({
  id,
  path,
  strokeColor = "#000",
  strokeOpacity = 1,
  strokeWeight = 4,
  dashArray,
}: PolylineProps) {
  if (!path.length) return null;

  const geojson: GeoJSON.Feature = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: path.map((p) => [p.lng, p.lat]),
    },
  };

  const paint: LineLayerSpecification["paint"] = {
    "line-color": strokeColor,
    "line-opacity": strokeOpacity,
    "line-width": strokeWeight,
  };
  if (dashArray) paint["line-dasharray"] = dashArray;

  return (
    <Source id={id} type="geojson" data={geojson}>
      <Layer id={`${id}-line`} type="line" paint={paint} />
    </Source>
  );
}
