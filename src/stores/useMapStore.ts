import type { InfoShow, PlaceDetail } from "@/types";
import { create } from "zustand";

interface MapState {
  map: google.maps.Map | null;
  userLocation: google.maps.LatLngLiteral | null;
  origin: PlaceDetail | null;
  destination: PlaceDetail | null;
  infoShow: InfoShow;
  searchPlace: PlaceDetail | null;
}
interface MapAction {
  setMap: (map: google.maps.Map) => void;
  setUserLocation: (location: google.maps.LatLngLiteral | null) => void;
  setOrigin: (origin: PlaceDetail | null) => void;
  setDestination: (destination: PlaceDetail | null) => void;
  setInfoShow: (infoShow: InfoShow) => void;
  setSearchPlace: (place: PlaceDetail | null) => void;
}

type MapStore = MapState & MapAction;

const useMapStore = create<MapStore>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
  userLocation: null,
  setUserLocation: (userLocation) => set({ userLocation }),
  origin: null,
  setOrigin: (origin) => set({ origin }),
  destination: null,
  setDestination: (destination) => set({ destination }),
  infoShow: { isOpen: false, kind: null },
  setInfoShow: (infoShow) => set({ infoShow }),
  searchPlace: null,
  setSearchPlace: (place) => set({ searchPlace: place }),
}));

export default useMapStore;
