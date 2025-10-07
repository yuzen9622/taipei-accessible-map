import { useCallback, useEffect } from "react";
import MetroA11yPin from "@/components/MetroA11yPin";
import { getAllA11yPlaces } from "@/lib/api/a11y";
import { formatA11y } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { Marker, metroA11yData } from "@/types";

export default function AccessibilityPin() {
  const { selectedA11yTypes, a11yPlaces, setA11yPlaces, routeA11y } =
    useMapStore();

  const fetchMarketA11yPlace = useCallback(async () => {
    try {
      const res = await getAllA11yPlaces();

      const places = res.data as metroA11yData[];
      const formatData: Marker[] = formatA11y(places);

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
      {routeA11y.map((place) => (
        <MetroA11yPin key={place.id} place={place} />
      ))}
    </>
  );
}
