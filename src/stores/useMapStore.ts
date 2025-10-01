import { create } from "zustand";
import type { InfoShow, Marker, PlaceDetail } from "@/types";
import { A11yEnum } from "@/types/index";

import type { Route } from "@/types/route.t";

interface MapState {
  map: google.maps.Map | null;
  userLocation: google.maps.LatLngLiteral | null;
  origin: PlaceDetail | null;
  destination: PlaceDetail | null;
  infoShow: InfoShow;
  routeInfoShow: boolean;
  searchPlace: PlaceDetail | null;
  computeRoutes: google.maps.DirectionsRoute[] | null;
  routePolyline: google.maps.Polyline | null;
  selectRoute: google.maps.DirectionsRoute | null;
  // 新增無障礙設施相關狀態
  selectedA11yTypes: A11yEnum[];
  a11yDrawerOpen: boolean;
  a11yPlaces: Marker[] | null;
  searchHistory: PlaceDetail[];
  savedPlaces: PlaceDetail[];
  timeline: { time: string; event: string }[];
}

interface MapAction {
  setMap: (map: google.maps.Map) => void;
  setUserLocation: (location: google.maps.LatLngLiteral | null) => void;
  setOrigin: (origin: PlaceDetail | null) => void;
  setDestination: (destination: PlaceDetail | null) => void;
  setInfoShow: (infoShow: InfoShow) => void;
  setSearchPlace: (place: PlaceDetail | null) => void;
  setComputeRoutes: (route: google.maps.DirectionsRoute[] | null) => void;
  setRoutePolyline: (polyline: google.maps.Polyline | null) => void;
  setRouteInfoShow: (show: boolean) => void;
  setRouteSelect: (route: google.maps.DirectionsRoute | null) => void;
  // 新增無障礙設施相關動作
  toggleA11yType: (type: A11yEnum) => void;
  setA11yDrawerOpen: (open: boolean) => void;
  setA11yPlaces: (places: Marker[] | null) => void;
  initSearchHistory: (history: PlaceDetail[]) => void;
  addSearchHistory: (searchTerm: PlaceDetail) => void;
  clearSearchHistory: () => void;
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
  // 新增無障礙設施相關實作
  selectedA11yTypes: [],
  toggleA11yType: (type: A11yEnum) => {
    const { selectedA11yTypes } = get();
    if (type === A11yEnum.NONE) {
      set({
        selectedA11yTypes: [],
        a11yDrawerOpen: false,
      });
      return;
    }
    const newTypes = selectedA11yTypes.includes(type)
      ? selectedA11yTypes.filter((t) => t !== type)
      : [...selectedA11yTypes, type];

    set({
      selectedA11yTypes: newTypes,
      a11yDrawerOpen: newTypes.length > 0,
    });
  },
  a11yDrawerOpen: false,
  setA11yDrawerOpen: (open) => set({ a11yDrawerOpen: open }),
  a11yPlaces: null,
  setA11yPlaces: (places) => set({ a11yPlaces: places }),
  searchHistory: [],
  initSearchHistory: (history) => set({ searchHistory: history }),
  addSearchHistory: (searchTerm: PlaceDetail) => {
    const { searchHistory } = get();

    if (
      searchTerm.kind === "place" &&
      searchHistory.find(
        (item) => item.kind === "place" && item.place.id === searchTerm.place.id
      )
    ) {
      return;
    }

    const newHistory = [searchTerm, ...searchHistory.slice(0, 9)];
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
    set({ searchHistory: newHistory });
  },
  clearSearchHistory: () => set({ searchHistory: [] }),
  savedPlaces: [],
  timeline: [],
}));

export default useMapStore;
