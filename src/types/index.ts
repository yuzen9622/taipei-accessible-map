export enum A11yEnum {
  ELEVATOR = "電梯",
  RAMP = "波道",
}

export type Marker = {
  id: number;
  position: google.maps.LatLngLiteral;
  content?: { title: string; desc: string };
  type: "pin";
  zIndex: number;
  a11yType: A11yEnum;
};

export type PlaceDetail = {
  place: google.maps.places.Place;
  position: google.maps.LatLngLiteral;
};

export type InfoShow = {
  isOpen: boolean;
  place: google.maps.places.Place | null;
};

export type metroA11yData = {
  _id: number;
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
