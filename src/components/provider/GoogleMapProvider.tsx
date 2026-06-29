"use client";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
