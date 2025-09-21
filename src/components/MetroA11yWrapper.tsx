import { useCallback, useEffect, useState } from "react";
import MetroA11yPin from "@/components/MetroA11yPin";
import type { Marker, metroA11yAPI } from "@/types";
import { A11yEnum } from "@/types/index";

export default function AccessibilityPin() {
  const [accessibilityPlaces, setAccessibilityPlaces] = useState<
    Marker[] | null
  >(null);

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
      console.log(formatData);
      setAccessibilityPlaces(formatData);
    } catch (error) {
      console.log(error);
    }
  }, []);
  useEffect(() => {
    fetchMarketA11yPlace();
  }, [fetchMarketA11yPlace]);
  return (
    <>
      {accessibilityPlaces?.map((place) => (
        <MetroA11yPin key={place.id} place={place} />
      ))}
    </>
  );
}
