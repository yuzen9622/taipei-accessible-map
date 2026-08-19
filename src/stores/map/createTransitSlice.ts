"use client";
import type { MapSliceCreator, TransitSlice } from "./types";

export const createTransitSlice: MapSliceCreator<TransitSlice> = (set) => ({
  liveBusPositions: [],
  setLiveBusPositions: (positions) => set({ liveBusPositions: positions }),
  nearbyBusStops: [],
  setNearbyBusStops: (stops) => set({ nearbyBusStops: stops }),
  busRouteStops: [],
  setBusRouteStops: (stops) => set({ busRouteStops: stops }),
  selectedBusStop: null,
  setSelectedBusStop: (stop) => set({ selectedBusStop: stop }),
});
