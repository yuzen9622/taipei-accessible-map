import { useCallback, useEffect } from "react";
import { getBusRealtimeNearbyStop } from "@/lib/api/transit";

import useMapStore from "@/stores/useMapStore";
import { isBusTransitDetail, type RouteTransitDetail } from "@/types/transit";

export default function useTransitDetail() {
  const { selectRoute, setStepTransitDetails, clearStepTransitDetails } =
    useMapStore();

  const getTransitData = useCallback(
    async (detail: RouteTransitDetail) => {
      if (isBusTransitDetail(detail)) {
        const data = await getBusRealtimeNearbyStop({
          arrival_stop: detail.arrivalStopName,
          departure_stop: detail.departureStopName,
          route_name: detail.lineName,
          arrival_lat: detail.arrivalLat,
          arrival_lng: detail.arrivalLng,
        });
        if (data.data) {
          detail.nearbyStop = data.data[0];
        }
      }

      setStepTransitDetails(detail);
    },
    [setStepTransitDetails]
  );

  useEffect(() => {
    if (!selectRoute?.route) return;
    const steps = selectRoute.route.legs[0]?.steps ?? [];
    const details: RouteTransitDetail[] = [];
    clearStepTransitDetails();
    steps.forEach((step, stepIndex) => {
      if (step.travel_mode !== google.maps.TravelMode.TRANSIT || !step.transit)
        return;

      const { line, arrival_stop, departure_stop, headsign } = step.transit;
      const { lat: arrivalLat, lng: arrivalLng } =
        arrival_stop.location.toJSON();

      if (line.vehicle?.type === google.maps.VehicleType.HIGH_SPEED_TRAIN) {
        details.push({
          stepIndex: `${selectRoute.index} ${stepIndex}`,
          type: line?.vehicle?.type ?? google.maps.VehicleType.BUS,
          lineName: line?.short_name || line?.name || "",
          headsign: headsign || "",
          departureStopName: departure_stop.name,
          arrivalStopName: arrival_stop.name,
          arrivalLat,
          arrivalLng,
          carNumber: step.transit?.trip_short_name,
        } as RouteTransitDetail);
      } else if (line.vehicle?.type === google.maps.VehicleType.BUS) {
        details.push({
          stepIndex: `${selectRoute.index} ${stepIndex}`,
          type: line?.vehicle?.type ?? google.maps.VehicleType.BUS,
          lineName: line?.short_name || line?.name || "",
          headsign: headsign || "",
          departureStopName: departure_stop.name,
          arrivalStopName: arrival_stop.name,
          arrivalLat,
          arrivalLng,
        } as RouteTransitDetail);
      } else if (
        line.vehicle?.type ===
        ("LONG_DISTANCE_TRAIN" as google.maps.VehicleType)
      ) {
        details.push({
          stepIndex: `${selectRoute.index} ${stepIndex}`,
          type: line?.vehicle?.type ?? google.maps.VehicleType.BUS,
          lineName: line?.short_name || line?.name || "",
          headsign: headsign || "",
          departureStopName: departure_stop.name,
          arrivalStopName: arrival_stop.name,
          arrivalLat,
          arrivalLng,
          carNumber: step.transit?.trip_short_name,
        } as RouteTransitDetail);
      }
    });

    // 逐步排程：每個 step 相隔 3 秒
    const timers: number[] = [];
    let cancelled = false;

    details.forEach((detail, idx) => {
      getTransitData(detail);
      const id = window.setInterval(() => {
        if (!cancelled) {
          getTransitData(detail);
        }
      }, idx * 3 + 60000);
      timers.push(id);
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [selectRoute, getTransitData, clearStepTransitDetails]);
}
