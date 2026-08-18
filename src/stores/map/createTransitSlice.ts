"use client";
import type { MapSliceCreator, TransitSlice } from "./types";

export const createTransitSlice: MapSliceCreator<TransitSlice> = (set) => ({
  liveBusPositions: [],
  setLiveBusPositions: (positions) => set({ liveBusPositions: positions }),
});
