export type LatLng = { lat: number; lng: number };

export type NominatimPlace = {
  place_id: number;
  osm_id?: number;
  osm_type?: string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  category?: string;
  address?: Record<string, string>;
};

export enum A11yEnum {
  ELEVATOR = "電梯",
  RAMP = "斜坡",
  RESTROOM = "廁所",
  NONE = "無",
}

export type Marker = {
  id: number | string;
  position: LatLng;
  content?: { title: string; desc: string };
  type: "pin";
  zIndex: number;
  a11yType: A11yEnum;
};

// --- PlaceDetail: discriminated union ---
type PlaceType = {
  kind: "place";
  place: NominatimPlace;
};

type CoordinateType = {
  kind: "coordinate";
  address: string;
};

type Base = {
  position: LatLng;
};

export type PlaceDetail = (PlaceType | CoordinateType) & Base;

// --- InfoShow ---
export type InfoShow =
  | (PlaceType & { isOpen: boolean })
  | (CoordinateType & { isOpen: boolean; position?: LatLng })
  | { isOpen: boolean; kind: null };

export type metroA11yData = {
  _id: string;
  項次: number;
  _importdata: { date: string; timezone: string; timezone_type: number };
  出入口編號: string;
  "出入口電梯/無障礙坡道名稱": string;
  經度: string;
  緯度: string;
};

export type metroA11yAPI = {
  result: {
    count: number;
    limit: number;
    offset: number;
    results: metroA11yData[];
  };
};

export interface IBathroom {
  _id: string;
  contury: string;
  areacode: string;
  village: string;
  number: string;
  name: string;
  address: string;
  administration: string;
  latitude: number;
  longitude: number;
  grade: string;
  type2: string;
  type: string;
  exec: string;
  diaper: string;
}
