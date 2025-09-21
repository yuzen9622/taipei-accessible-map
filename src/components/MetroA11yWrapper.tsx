import { useCallback, useEffect } from "react";
import MetroA11yPin from "@/components/MetroA11yPin";
import useMapStore from "@/stores/useMapStore";
import type { Marker, metroA11yAPI } from "@/types";
import { A11yEnum } from "@/types/index";

export default function AccessibilityPin() {
  const { selectedA11yTypes, a11yPlaces, setA11yPlaces } = useMapStore();

  const fetchMarketA11yPlace = useCallback(async () => {
    try {
      const res = await fetch("/api/a11y/metro");
      const data: metroA11yAPI = await res.json();
      const places = data.result.results;
      const formatData: Marker[] = places.map((place) => {
        const { _id, 經度, 緯度 } = place;
        const a11yType = place["出入口電梯/無障礙坡道名稱"].includes("電梯")
          ? A11yEnum.ELEVATOR
          : A11yEnum.RAMP;

        return {
          id: _id,
          position: { lat: parseFloat(緯度), lng: parseFloat(經度) },
          type: "pin",
          content: {
            title: place["出入口電梯/無障礙坡道名稱"],
            desc: place["出入口編號"],
          },
          zIndex: 1,
          a11yType,
        };
      });

      setA11yPlaces(formatData);
    } catch (error) {
      console.log(error);
    }
  }, [setA11yPlaces]);

  useEffect(() => {
    fetchMarketA11yPlace();
  }, [fetchMarketA11yPlace]);

  // 根據選擇的類型過濾要顯示的標籤
  const filteredPlaces =
    a11yPlaces?.filter((place) => selectedA11yTypes.includes(place.a11yType)) ||
    [];

  return (
    <>
      {filteredPlaces.map((place) => (
        <MetroA11yPin key={place.id} place={place} />
      ))}
    </>
  );
}
