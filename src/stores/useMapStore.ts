import type { InfoShow, PlaceDetail } from "@/types";
import { create } from "zustand";

import type { Route } from "@/types/route.t";

interface MapState {
  map: google.maps.Map | null;
  userLocation: google.maps.LatLngLiteral | null;
  origin: PlaceDetail | null;
  destination: PlaceDetail | null;
  infoShow: InfoShow;
  routeInfoShow: boolean;
  searchPlace: PlaceDetail | null;
  computeRoute: Route | null;
  routePolyline: google.maps.Polyline | null;
}
interface MapAction {
  setMap: (map: google.maps.Map) => void;
  setUserLocation: (location: google.maps.LatLngLiteral | null) => void;
  setOrigin: (origin: PlaceDetail | null) => void;
  setDestination: (destination: PlaceDetail | null) => void;
  setInfoShow: (infoShow: InfoShow) => void;
  setSearchPlace: (place: PlaceDetail | null) => void;
  setComputeRoute: (route: Route | null) => void;
  setRoutePolyline: (polyline: google.maps.Polyline | null) => void;
  setRouteInfoShow: (show: boolean) => void;
}

type MapStore = MapState & MapAction;

const useMapStore = create<MapStore>((set, get) => ({
  map: null,
  setMap: (map) => set({ map }),
  userLocation: null,
  setUserLocation: (userLocation) => set({ userLocation }),
  origin: null,
  setOrigin: (origin) => set({ origin }),
  destination: null,
  setDestination: (destination) => set({ destination }),
  routeInfoShow: false,
  setRouteInfoShow: (show) => set({ routeInfoShow: show }),
  infoShow: { isOpen: false, kind: null },
  setInfoShow: (infoShow) =>
    set({ infoShow: { ...get().infoShow, ...infoShow } }),
  searchPlace: null,
  setSearchPlace: (place) => set({ searchPlace: place }),
  computeRoute: null,
  setComputeRoute: (route) => set({ computeRoute: route }),
  routePolyline: null,
  setRoutePolyline: (polyline) => set({ routePolyline: polyline }),
}));

export default useMapStore;
