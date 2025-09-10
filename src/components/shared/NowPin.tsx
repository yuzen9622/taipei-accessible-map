import useMapStore from "@/stores/useMapStore";
import { AdvancedMarker } from "@vis.gl/react-google-maps";

export default function NowPin() {
  const { userLocation } = useMapStore();
  if (!userLocation) return null;

  return (
    <AdvancedMarker position={userLocation}>
      {/* 外圓：透明藍色 */}
      <div className="relative flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-blue-500/30 animate-ping absolute" />
        {/* 內圓：實心藍點 */}
        <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />
      </div>
    </AdvancedMarker>
  );
}
