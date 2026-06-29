import { Marker } from "react-map-gl/maplibre";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";

export default function NowPin() {
  const userLocation = useMapStore((s) => s.userLocation);
  // Selector subscription: only NowPin re-renders on heading ticks.
  const userHeading = useNavStore((s) => s.userHeading);
  if (!userLocation) return null;

  const hasHeading = userHeading != null;

  return (
    <Marker
      longitude={userLocation.lng}
      latitude={userLocation.lat}
      anchor="center"
      // Map-aligned rotation: the up-pointing cone tracks the true ground
      // heading regardless of how far the map camera has rotated.
      rotation={hasHeading ? userHeading : 0}
      rotationAlignment="map"
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: 28, height: 28 }}
      >
        {/* 外圓：透明藍色脈動 */}
        <div className="w-6 h-6 rounded-full bg-blue-500/30 animate-ping absolute" />
        {/* 方向錐：導航時顯示，朝行進方向 */}
        {hasHeading && (
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderBottom: "9px solid #2563eb",
            }}
          />
        )}
        {/* 內圓：實心藍點 */}
        <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow relative z-10" />
      </div>
    </Marker>
  );
}
