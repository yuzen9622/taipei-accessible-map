import { MapPin } from "lucide-react";
import { LngLatBounds } from "maplibre-gl";
import { useEffect } from "react";
import { Marker } from "react-map-gl/maplibre";
import useOpenAiResult from "@/hook/useOpenAiResult";
import useMapStore from "@/stores/useMapStore";

export default function AIResultWrapper() {
  const { aiResultMarkers, map } = useMapStore();
  const { openAiResult } = useOpenAiResult();

  // 結果改變時自動縮放到涵蓋所有結果（含無障礙設施，框到該區後由既有圖層呈現）
  useEffect(() => {
    if (!map || aiResultMarkers.length === 0) return;

    if (aiResultMarkers.length === 1) {
      const { position } = aiResultMarkers[0];
      map.flyTo({ center: [position.lng, position.lat], zoom: 17 });
      return;
    }

    const bounds = new LngLatBounds();
    for (const m of aiResultMarkers) {
      bounds.extend([m.position.lng, m.position.lat]);
    }
    map.fitBounds(bounds, {
      padding: { top: 80, bottom: 200, left: 60, right: 60 },
      maxZoom: 17,
    });
  }, [aiResultMarkers, map]);

  // 只畫地點搜尋（紅色）標記；無障礙設施已由既有圖層呈現，不重複畫
  const placeMarkers = aiResultMarkers.filter(
    (r) => r.target.panel === "place",
  );

  if (placeMarkers.length === 0) return null;

  return (
    <>
      {placeMarkers.map((r) => (
        <Marker
          key={r.id}
          longitude={r.position.lng}
          latitude={r.position.lat}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            openAiResult(r);
          }}
        >
          <div
            title={r.title}
            className="text-red-500 drop-shadow-lg cursor-pointer transition-transform hover:scale-110"
          >
            <MapPin className="h-7 w-7 fill-red-500" />
          </div>
        </Marker>
      ))}
    </>
  );
}
