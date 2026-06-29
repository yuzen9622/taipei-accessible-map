import { useCallback } from "react";
import useMapStore from "@/stores/useMapStore";
import type { AiResultMarker } from "@/types";

/**
 * 開啟 AI 工具結果的詳情：飛到該點、開對應面板、收合聊天視窗。
 * 聊天卡片與地圖標記共用，避免重複邏輯。
 */
export default function useOpenAiResult() {
  const {
    map,
    setInfoShow,
    setSearchPlace,
    setSheetMode,
    setSelectA11yPlace,
    setChatOpen,
  } = useMapStore();

  const openAiResult = useCallback(
    (r: AiResultMarker) => {
      if (map) {
        map.flyTo({ center: [r.position.lng, r.position.lat], zoom: 18 });
      }

      if (r.target.panel === "place") {
        const { place } = r.target;
        setInfoShow({ isOpen: true, place, kind: "place" });
        setSearchPlace({ kind: "place", place, position: r.position });
        setSheetMode("place");
      } else {
        const { marker } = r.target;
        // setSelectA11yPlace 會在點到同一筆時 toggle off，先清掉確保開啟
        setSelectA11yPlace(null);
        setSelectA11yPlace(marker);
        setSheetMode("station");
      }

      setChatOpen(false);
    },
    [
      map,
      setInfoShow,
      setSearchPlace,
      setSheetMode,
      setSelectA11yPlace,
      setChatOpen,
    ],
  );

  return { openAiResult };
}
