import { LngLatBounds } from "maplibre-gl";
import { useEffect } from "react";
import { extendBounds, fitRouteBounds } from "@/lib/mapCamera";
import useMapStore from "@/stores/useMapStore";

/**
 * AI 查詢結果「不」在地圖上畫紅色標記，避免和搜尋紅圖釘（SearchPin）重複堆疊。
 * 點擊聊天卡片時由 useOpenAiResult 負責飛到該點、開地點詳情並顯示搜尋紅圖釘。
 * 這裡只負責結果改變時自動縮放到涵蓋所有結果（含無障礙設施，框到該區後由既有圖層呈現）。
 */
export default function AIResultWrapper() {
  const { aiResultMarkers, map } = useMapStore();

  useEffect(() => {
    if (!map || aiResultMarkers.length === 0) return;

    if (aiResultMarkers.length === 1) {
      const { position } = aiResultMarkers[0];
      map.flyTo({ center: [position.lng, position.lat], zoom: 17 });
      return;
    }

    const bounds = new LngLatBounds();
    for (const m of aiResultMarkers) {
      extendBounds(bounds, m.position.lng, m.position.lat);
    }
    fitRouteBounds(map, bounds);
  }, [aiResultMarkers, map]);

  return null;
}
