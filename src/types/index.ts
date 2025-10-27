export enum A11yEnum {
  ELEVATOR = "電梯",
  RAMP = "斜坡",
  RESTROOM = "廁所",
  NONE = "無",
}

export type Marker = {
  id: number | string;
  position: google.maps.LatLngLiteral;
  content?: { title: string; desc: string };
  type: "pin";
  zIndex: number;
  a11yType: A11yEnum;
};
// --- 基底只給 PlaceDetail 用 ---
type Base = {
  position: google.maps.LatLngLiteral;
};

// --- 兩個實際類型 ---
type PlaceType = {
  kind: "place";
  place: google.maps.places.Place;
};

type GeocoderType = {
  kind: "geocoder";
  place: google.maps.GeocoderResult;
};

type A11yGeocoderType = {
  kind: "a11yGeocoder";
  place: google.maps.GeocoderResult;
  a11y: Marker;
};

// --- Detail 需要帶座標 ---
export type PlaceDetail = (PlaceType | GeocoderType | A11yGeocoderType) & Base;

// --- InfoShow 只需要控制開關，不要 Base ---
export type InfoShow =
  | (PlaceType & { isOpen: boolean })
  | (GeocoderType & { isOpen: boolean })
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

export type Navigation = {
  isNavigating: boolean;
  isCurrentLocation: boolean;
  steps: { title: string; steps: google.maps.DirectionsStep[] }[];
  currentStepIndex: number;
  detailStepIndex: number;
  totalSteps: number;
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
