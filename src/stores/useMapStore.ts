"use client";
import { create } from "zustand";
import type { InfoShow, Marker, Navigation, PlaceDetail } from "@/types";
import { A11yEnum } from "@/types/index";
import type { RouteTransitDetail } from "@/types/transit";

interface MapState {
  map: google.maps.Map | null;
  userLocation: google.maps.LatLngLiteral | null;
  travelMode: google.maps.TravelMode;
  origin: PlaceDetail | null;
  destination: PlaceDetail | null;
  infoShow: InfoShow;
  routeInfoShow: boolean;
  searchPlace: PlaceDetail | null;
  computeRoutes: google.maps.DirectionsRoute[] | null;
  routePolyline: google.maps.Polyline | null;
  selectRoute: { index: number; route: google.maps.DirectionsRoute } | null;
  routeA11y: Marker[];
  // 新增無障礙設施相關狀態
  selectedA11yTypes: A11yEnum[];
  a11yDrawerOpen: boolean;
  a11yPlaces: Marker[] | null;
  searchHistory: PlaceDetail[];
  savedPlaces: PlaceDetail[];
  timeline: { time: string; event: string }[];
  navigationDrawerOpen: boolean;
  navigation: Navigation;
  stepTransitDetails: RouteTransitDetail[];
}

interface MapAction {
  setMap: (map: google.maps.Map) => void;
  setUserLocation: (location: google.maps.LatLngLiteral | null) => void;
  setOrigin: (origin: PlaceDetail | null) => void;
  setDestination: (destination: PlaceDetail | null) => void;
  setInfoShow: (infoShow: Partial<InfoShow>) => void;
  setSearchPlace: (place: PlaceDetail | null) => void;
  setTravelMode: (mode: google.maps.TravelMode) => void;
  setComputeRoutes: (route: google.maps.DirectionsRoute[] | null) => void;
  setRoutePolyline: (polyline: google.maps.Polyline | null) => void;
  setRouteInfoShow: (show: boolean) => void;
  setRouteSelect: (
    route: { index: number; route: google.maps.DirectionsRoute } | null
  ) => void;
  // 新增無障礙設施相關動作
  toggleA11yType: (type: A11yEnum) => void;
  setA11yDrawerOpen: (open: boolean) => void;
  setA11yPlaces: (places: Marker[] | null) => void;
  initSearchHistory: (history: PlaceDetail[]) => void;
  addSearchHistory: (searchTerm: PlaceDetail) => void;
  clearSearchHistory: () => void;
  setNavigationDrawerOpen: (open: boolean) => void;
  setNavigation: (navigation: Partial<Navigation>) => void;
  setRouteA11y: (a11y: Marker[]) => void;
  addRouteA11y: (a11y: Marker[]) => void;
  setStepTransitDetails: (details: RouteTransitDetail) => void;
  removeStepTransitDetail: (stepIndex: string) => void;
  closeRouteDrawer: () => void;
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
    set({ infoShow: { ...get().infoShow, ...infoShow } as InfoShow }),

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

    const newTerm = searchHistory.filter((item) => {
      if (item.kind === "place" && searchTerm.kind === "place") {
        return item.place.id !== searchTerm.place.id;
      }
      return true;
    });

    const newHistory = [searchTerm, ...newTerm.slice(0, 9)];
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
    set({ searchHistory: newHistory });
  },
  clearSearchHistory: () => set({ searchHistory: [] }),
  savedPlaces: [],
  timeline: [],
  navigationDrawerOpen: false,
  setNavigationDrawerOpen: (open) => set({ navigationDrawerOpen: open }),
  navigation: {
    isNavigating: false,
    steps: [],
    currentStepIndex: 0,
    detailStepIndex: 0,
    totalSteps: 0,
    isCurrentLocation: false,
  },
  setNavigation: (navigation) =>
    set({ navigation: { ...get().navigation, ...navigation } as Navigation }),
  routeA11y: [],
  setRouteA11y: (a11y) => set({ routeA11y: a11y }),
  addRouteA11y: (a11y) => set({ routeA11y: [...get().routeA11y, ...a11y] }),
  stepTransitDetails: [],
  setStepTransitDetails: (details) =>
    set({ stepTransitDetails: [...get().stepTransitDetails, details] }),
  removeStepTransitDetail: (stepIndex) => {
    const { stepTransitDetails } = get();
    const newDetails = stepTransitDetails.filter(
      (_) => _.stepIndex !== stepIndex
    );

    set({ stepTransitDetails: newDetails });
  },
  closeRouteDrawer: () => {
    const { destination } = get();
    set({
      routeInfoShow: false,
      selectRoute: null,
      computeRoutes: null,
      stepTransitDetails: [],
      routeA11y: [],
      destination: null,
      origin: null,
      infoShow:
        destination && destination.kind === "place"
          ? { isOpen: true, place: destination.place, kind: "place" }
          : { isOpen: false, kind: null },
      travelMode: "TRANSIT" as google.maps.TravelMode,
    });
  },
  travelMode: "TRANSIT" as google.maps.TravelMode,
  setTravelMode: (mode) => set({ travelMode: mode }),
}));

export default useMapStore;
