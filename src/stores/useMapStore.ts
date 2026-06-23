"use client";
import { create } from "zustand";
import type { InfoShow, LatLng, Marker, PlaceDetail } from "@/types";
import { A11yEnum } from "@/types/index";
import type { AccessibleRoute } from "@/types/route";
import type maplibregl from "maplibre-gl";

interface MapState {
  map: maplibregl.Map | null;
  userLocation: LatLng | null;
  origin: PlaceDetail | null;
  destination: PlaceDetail | null;
  infoShow: InfoShow;
  routeInfoShow: boolean;
  searchPlace: PlaceDetail | null;
  computeRoutes: AccessibleRoute[] | null;
  selectRoute: {
    index: number;
    route: AccessibleRoute;
  } | null;
  routeA11y: Marker[];
  selectedA11yTypes: A11yEnum[];
  a11yDrawerOpen: boolean;
  selectA11yPlace: Marker | null;
  a11yPlaces: Marker[] | null;
  searchHistory: PlaceDetail[];
  savedPlaces: PlaceDetail[];
  originName: string;
  destinationName: string;
}

interface MapAction {
  setMap: (map: maplibregl.Map) => void;
  setUserLocation: (location: LatLng | null) => void;
  setOrigin: (origin: PlaceDetail | null) => void;
  setDestination: (destination: PlaceDetail | null) => void;
  setInfoShow: (infoShow: Partial<InfoShow>) => void;
  setSearchPlace: (place: PlaceDetail | null) => void;
  setComputeRoutes: (routes: AccessibleRoute[] | null) => void;
  setRouteInfoShow: (show: boolean) => void;
  setSelectA11yPlace: (place: Marker | null) => void;
  setRouteSelect: (
    route: Partial<{
      index: number;
      route: AccessibleRoute;
    }> | null
  ) => void;
  toggleA11yType: (type: A11yEnum) => void;
  setA11yDrawerOpen: (open: boolean) => void;
  setA11yPlaces: (places: Marker[] | null) => void;
  initSearchHistory: (history: PlaceDetail[]) => void;
  addSearchHistory: (searchTerm: PlaceDetail) => void;
  clearSearchHistory: () => void;
  setRouteA11y: (a11y: Marker[]) => void;
  addRouteA11y: (a11y: Marker[]) => void;
  setOriginName: (name: string) => void;
  setDestinationName: (name: string) => void;
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
  selectA11yPlace: null,
  setSelectA11yPlace: (place) => {
    if (place?.id === get().selectA11yPlace?.id) {
      set({ selectA11yPlace: null });
      return;
    }
    set({ selectA11yPlace: place });
  },
  searchPlace: null,
  setSearchPlace: (place) => set({ searchPlace: place }),
  computeRoutes: null,
  setComputeRoutes: (routes) => set({ computeRoutes: routes }),
  selectRoute: null,
  setRouteSelect: (route) => {
    if (!route) {
      set({ selectRoute: null });
      return;
    }
    set({
      selectRoute: {
        ...get().selectRoute,
        ...route,
      } as MapStore["selectRoute"],
    });
  },
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
        return item.place.place_id !== searchTerm.place.place_id;
      }
      return true;
    });

    const newHistory = [searchTerm, ...newTerm.slice(0, 9)];
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
    set({ searchHistory: newHistory });
  },
  clearSearchHistory: () => set({ searchHistory: [] }),
  savedPlaces: [],
  routeA11y: [],
  setRouteA11y: (a11y) => {
    const deduped = Array.from(
      new Map(a11y.map((m) => [m.id, m])).values()
    ) as Marker[];
    set({ routeA11y: deduped });
  },
  addRouteA11y: (a11y) => set({ routeA11y: [...get().routeA11y, ...a11y] }),
  originName: "",
  setOriginName: (name) => set({ originName: name }),
  destinationName: "",
  setDestinationName: (name) => set({ destinationName: name }),
  closeRouteDrawer: () => {
    const { destination } = get();
    set({
      routeInfoShow: false,
      selectRoute: null,
      computeRoutes: null,
      routeA11y: [],
      destination: null,
      origin: null,
      originName: "",
      destinationName: "",
      infoShow:
        destination && destination.kind === "place"
          ? { isOpen: true, place: destination.place, kind: "place" }
          : destination && destination.kind === "coordinate"
            ? { isOpen: true, address: destination.address, kind: "coordinate" }
            : { isOpen: false, kind: null },
      searchPlace:
        destination && destination.kind === "place"
          ? {
              place: destination.place,
              kind: "place",
              position: destination.position,
            }
          : undefined,
    });
  },
}));

export default useMapStore;
