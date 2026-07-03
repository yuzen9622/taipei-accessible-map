"use client";
import type maplibregl from "maplibre-gl";
import { create } from "zustand";
import type {
  AiResultMarker,
  InfoShow,
  LatLng,
  Marker,
  PlaceDetail,
} from "@/types";
import { A11yEnum } from "@/types/index";
import type { AccessibleRoute, LiveBus } from "@/types/route";

export type SheetMode =
  | "home"
  | "place"
  | "plan"
  | "route"
  | "a11y"
  | "navigation"
  | "station";
export type RailPanel =
  | "none"
  | "search"
  | "route"
  | "a11y"
  | "bus"
  | "parking"
  | "environment"
  | "hazard"
  | "welfare"
  | "saved";

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
  selectedA11yTypes: Set<A11yEnum>;
  a11yDrawerOpen: boolean;
  selectA11yPlace: Marker | null;
  a11yPlaces: Marker[] | null;
  searchHistory: PlaceDetail[];
  savedPlaces: PlaceDetail[];
  savedPlaceKeys: Set<string>;
  originName: string;
  destinationName: string;
  sheetMode: SheetMode;
  isNavigating: boolean;
  is3D: boolean;
  sidebarCollapsed: boolean;
  activeRailPanel: RailPanel;
  chatOpen: boolean;
  aiResultMarkers: AiResultMarker[];
  liveBusPositions: LiveBus[];
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
    }> | null,
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
  initSavedPlaces: (places: PlaceDetail[]) => void;
  addSavedPlace: (place: PlaceDetail) => void;
  removeSavedPlace: (place: PlaceDetail) => void;
  isSavedPlace: (place: PlaceDetail) => boolean;
  closeRouteDrawer: () => void;
  setSheetMode: (mode: SheetMode) => void;
  setIsNavigating: (v: boolean) => void;
  setIs3D: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setActiveRailPanel: (panel: RailPanel) => void;
  setChatOpen: (v: boolean) => void;
  setAiResultMarkers: (markers: AiResultMarker[]) => void;
  setLiveBusPositions: (positions: LiveBus[]) => void;
}

type MapStore = MapState & MapAction;

function placeKey(p: PlaceDetail): string {
  return p.kind === "place"
    ? `p_${p.place.place_id}`
    : `c_${p.position.lat}_${p.position.lng}`;
}

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
  selectedA11yTypes: new Set<A11yEnum>(),
  toggleA11yType: (type: A11yEnum) => {
    const { selectedA11yTypes } = get();
    if (type === A11yEnum.NONE) {
      set({ selectedA11yTypes: new Set(), a11yDrawerOpen: false });
      return;
    }
    const next = new Set(selectedA11yTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    set({ selectedA11yTypes: next, a11yDrawerOpen: next.size > 0 });
  },
  a11yDrawerOpen: false,
  setA11yDrawerOpen: (open) => set({ a11yDrawerOpen: open }),
  a11yPlaces: null,
  setA11yPlaces: (places) => set({ a11yPlaces: places }),
  searchHistory: [],
  initSearchHistory: (history) => {
    const validHistory = history.filter(item => {
      const name = item.kind === "place" ? item.place.name || item.place.display_name : item.address;
      return Boolean(name && name.trim());
    });
    const seen = new Set<string>();
    const dedupedHistory = validHistory.filter(item => {
      const name = item.kind === "place" ? item.place.name || item.place.display_name : item.address;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
    set({ searchHistory: dedupedHistory });
  },
  addSearchHistory: (searchTerm: PlaceDetail) => {
    const name = searchTerm.kind === "place" ? searchTerm.place.name || searchTerm.place.display_name : searchTerm.address;
    if (!name || !name.trim()) return;
    const { searchHistory } = get();
    const deduped = searchHistory.filter((item) => {
      const itemName = item.kind === "place" ? item.place.name || item.place.display_name : item.address;
      return itemName !== name;
    });
    const newHistory = [searchTerm, ...deduped.slice(0, 9)];
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
    set({ searchHistory: newHistory });
  },
  clearSearchHistory: () => set({ searchHistory: [] }),
  savedPlaces: [],
  savedPlaceKeys: new Set<string>(),
  initSavedPlaces: (places) => {
    const validPlaces = places.filter(item => {
      const name = item.kind === "place" ? item.place.name || item.place.display_name : item.address;
      return Boolean(name && name.trim());
    });
    set({ savedPlaces: validPlaces, savedPlaceKeys: new Set(validPlaces.map(placeKey)) });
  },
  addSavedPlace: (place) => {
    const name = place.kind === "place" ? place.place.name || place.place.display_name : place.address;
    if (!name || !name.trim()) return;
    const { savedPlaces, savedPlaceKeys } = get();
    const key = placeKey(place);
    if (savedPlaceKeys.has(key)) return;
    const updated = [place, ...savedPlaces];
    const nextKeys = new Set(savedPlaceKeys);
    nextKeys.add(key);
    localStorage.setItem("savedPlaces", JSON.stringify(updated));
    set({ savedPlaces: updated, savedPlaceKeys: nextKeys });
  },
  removeSavedPlace: (place) => {
    const { savedPlaces, savedPlaceKeys } = get();
    const key = placeKey(place);
    if (!savedPlaceKeys.has(key)) return;
    const updated = savedPlaces.filter((p) => placeKey(p) !== key);
    const nextKeys = new Set(savedPlaceKeys);
    nextKeys.delete(key);
    localStorage.setItem("savedPlaces", JSON.stringify(updated));
    set({ savedPlaces: updated, savedPlaceKeys: nextKeys });
  },
  isSavedPlace: (place) => {
    return get().savedPlaceKeys.has(placeKey(place));
  },
  routeA11y: [],
  setRouteA11y: (a11y) => {
    const deduped = Array.from(
      new Map(a11y.map((m) => [m.id, m])).values(),
    ) as Marker[];
    set({ routeA11y: deduped });
  },
  addRouteA11y: (a11y) => set({ routeA11y: [...get().routeA11y, ...a11y] }),
  originName: "",
  setOriginName: (name) => set({ originName: name }),
  destinationName: "",
  setDestinationName: (name) => set({ destinationName: name }),
  sheetMode: "home",
  setSheetMode: (mode) => set({ sheetMode: mode }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  activeRailPanel: "search" as RailPanel,
  setActiveRailPanel: (panel) => set({ activeRailPanel: panel }),
  chatOpen: false,
  setChatOpen: (v) => set({ chatOpen: v }),
  aiResultMarkers: [],
  setAiResultMarkers: (markers) => set({ aiResultMarkers: markers }),
  liveBusPositions: [],
  setLiveBusPositions: (positions) => set({ liveBusPositions: positions }),
  isNavigating: false,
  setIsNavigating: (v) => {
    const { map, userLocation } = get();
    if (v) {
      set({ isNavigating: true, sheetMode: "navigation", is3D: true });
      if (map) {
        map.easeTo({
          pitch: 60,
          zoom: 18,
          center: userLocation
            ? [userLocation.lng, userLocation.lat]
            : undefined,
          duration: 1000,
        });
      }
    } else {
      set({ isNavigating: false, sheetMode: "route", is3D: false });
      if (map) {
        map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
      }
    }
  },
  is3D: false,
  setIs3D: (v) => {
    set({ is3D: v });
    const { map, isNavigating } = get();
    // While navigating the camera loop applies pitch/bearing every tick;
    // easing here would fight it, so only drive the camera outside navigation.
    // 2D means a flat, north-up plane — reset bearing along with pitch.
    if (map && !isNavigating) {
      if (v) map.easeTo({ pitch: 60, duration: 600 });
      else map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
  },
  closeRouteDrawer: () => {
    const { destination } = get();
    const hasDestination =
      destination &&
      (destination.kind === "place" || destination.kind === "coordinate");
    set({
      routeInfoShow: false,
      selectRoute: null,
      computeRoutes: null,
      routeA11y: [],
      liveBusPositions: [],
      destination: null,
      origin: null,
      originName: "",
      destinationName: "",
      sheetMode: hasDestination ? "place" : "home",
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
          : null,
    });
  },
}));

export default useMapStore;
