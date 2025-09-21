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
  computeRoutes: Route[] | null;
  routePolyline: google.maps.Polyline | null;
  selectRoute: Route | null;
  searchHistory: string[];
  savedPlaces: string[];
  timeline: string[];
}

interface MapAction {
  setMap: (map: google.maps.Map) => void;
  setUserLocation: (location: google.maps.LatLngLiteral | null) => void;
  setOrigin: (origin: PlaceDetail | null) => void;
  setDestination: (destination: PlaceDetail | null) => void;
  setInfoShow: (infoShow: InfoShow) => void;
  setSearchPlace: (place: PlaceDetail | null) => void;
  setComputeRoutes: (route: Route[] | null) => void;
  setRoutePolyline: (polyline: google.maps.Polyline | null) => void;
  setRouteInfoShow: (show: boolean) => void;
  setRouteSelect: (route: Route | null) => void;
  setSearchHistory: (history: string[]) => void;
  addSearchHistory: (item: string) => void; // 新增
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
  computeRoutes: null,
  setComputeRoutes: (route) => set({ computeRoutes: route }),
  routePolyline: null,
  setRoutePolyline: (polyline) => set({ routePolyline: polyline }),
  selectRoute: null,
  setRouteSelect: (route) => set({ selectRoute: route }),
  searchHistory: [],
  savedPlaces: ["家", "公司"],
  timeline: [],
  setSearchHistory: (history) => set({ searchHistory: history }),
  addSearchHistory: (item) =>
    set({
      searchHistory: [...get().searchHistory.filter(i => i !== item), item],
    }),
}));

export default useMapStore;
