// enums & base types
export enum RouteTravelMode {
  TRAVEL_MODE_UNSPECIFIED = "TRAVEL_MODE_UNSPECIFIED",
  DRIVE = "DRIVE",
  WALK = "WALK",
  BICYCLE = "BICYCLE",
  TRANSIT = "TRANSIT",
  TWO_WHEELER = "TWO_WHEELER",
}

export enum Maneuver {
  MANEUVER_UNSPECIFIED = "MANEUVER_UNSPECIFIED",
  TURN_SLIGHT_LEFT = "TURN_SLIGHT_LEFT",
  TURN_SHARP_LEFT = "TURN_SHARP_LEFT",
  UTURN_LEFT = "UTURN_LEFT",
  TURN_LEFT = "TURN_LEFT",
  TURN_SLIGHT_RIGHT = "TURN_SLIGHT_RIGHT",
  TURN_SHARP_RIGHT = "TURN_SHARP_RIGHT",
  UTURN_RIGHT = "UTURN_RIGHT",
  TURN_RIGHT = "TURN_RIGHT",
  STRAIGHT = "STRAIGHT",
  RAMP_LEFT = "RAMP_LEFT",
  RAMP_RIGHT = "RAMP_RIGHT",
  MERGE = "MERGE",
  FORK_LEFT = "FORK_LEFT",
  FORK_RIGHT = "FORK_RIGHT",
  FERRY = "FERRY",
  FERRY_TRAIN = "FERRY_TRAIN",
  ROUNDABOUT_LEFT = "ROUNDABOUT_LEFT",
  ROUNDABOUT_RIGHT = "ROUNDABOUT_RIGHT",
  DEPART = "DEPART",
  NAME_CHANGE = "NAME_CHANGE",
}

// localized text
export type LocalizedText = {
  text: string;
  languageCode: string;
};

// Geolocation
export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Location = {
  latLng: LatLng;
};

// Duration string format “123.5s”
export type DurationString = string;

// Transit-vehicle type enum etc omitted here for brevity unless you need transit

// Main types

export type Route = {
  routeLabels?: RouteLabel[];
  legs: RouteLeg[];
  distanceMeters: number;
  duration: DurationString;
  staticDuration: DurationString;
  polyline: Polyline;
  description: string;
  warnings?: string[];
  viewport: Viewport;
  travelAdvisory?: RouteTravelAdvisory;
  optimizedIntermediateWaypointIndex?: number[];
  localizedValues?: RouteLocalizedValues;
  routeToken?: string;
  polylineDetails?: PolylineDetails;
};

export enum RouteLabel {
  ROUTE_LABEL_UNSPECIFIED = "ROUTE_LABEL_UNSPECIFIED",
  DEFAULT_ROUTE = "DEFAULT_ROUTE",
  DEFAULT_ROUTE_ALTERNATE = "DEFAULT_ROUTE_ALTERNATE",
  FUEL_EFFICIENT = "FUEL_EFFICIENT",
  SHORTER_DISTANCE = "SHORTER_DISTANCE",
}

// RouteLeg

export type RouteLeg = {
  distanceMeters: number;
  duration: DurationString;
  staticDuration: DurationString;
  polyline: Polyline;
  startLocation: Location;
  endLocation: Location;
  steps: RouteLegStep[];
  travelAdvisory?: RouteLegTravelAdvisory;
  localizedValues?: RouteLegLocalizedValues;
  stepsOverview?: StepsOverview; // only for TRANSIT
};

// RouteLegStep

export type RouteLegStep = {
  distanceMeters?: number;
  staticDuration?: DurationString;
  polyline: Polyline;
  startLocation: Location;
  endLocation: Location;
  navigationInstruction: NavigationInstruction;
  travelAdvisory?: RouteLegStepTravelAdvisory;
  localizedValues?: RouteLegStepLocalizedValues;
  transitDetails?: RouteLegStepTransitDetails;
  travelMode: RouteTravelMode;
};

// NavigationInstruction

export type NavigationInstruction = {
  maneuver: Maneuver;
  instructions: string;
};

// RouteLegStepTravelAdvisory

export type RouteLegStepTravelAdvisory = {
  speedReadingIntervals?: SpeedReadingInterval[];
};

// SpeedReadingInterval

export type SpeedReadingInterval = {
  startPolylinePointIndex: number;
  endPolylinePointIndex: number;
  // other fields if exist; often speed / traffic density info
};

// RouteLegStepLocalizedValues

export type RouteLegStepLocalizedValues = {
  distance?: LocalizedText;
  staticDuration?: LocalizedText;
};

// Transit related types

export type RouteLegStepTransitDetails = {
  stopDetails: TransitStopDetails;
  localizedValues?: TransitDetailsLocalizedValues;
  headsign?: string;
  headway?: DurationString;
  transitLine?: TransitLine;
  stopCount?: number;
  tripShortText?: string;
};

export type TransitStopDetails = {
  arrivalStop: TransitStop;
  arrivalTime: string; // timestamp RFC3339
  departureStop: TransitStop;
  departureTime: string;
};

export type TransitStop = {
  name: string;
  location: Location;
};

export type TransitLine = {
  agencies?: TransitAgency[];
  name?: string;
  uri?: string;
  color?: string;
  iconUri?: string;
  nameShort?: string;
  textColor?: string;
  vehicle?: TransitVehicle;
};

export type TransitAgency = {
  name: string;
  phoneNumber?: string;
  uri?: string;
};

export enum TransitVehicleType {
  TRANSIT_VEHICLE_TYPE_UNSPECIFIED = "TRANSIT_VEHICLE_TYPE_UNSPECIFIED",
  BUS = "BUS",
  CABLE_CAR = "CABLE_CAR",
  COMMUTER_TRAIN = "COMMUTER_TRAIN",
  FERRY = "FERRY",
  FUNICULAR = "FUNICULAR",
  GONDOLA_LIFT = "GONDOLA_LIFT",
  HEAVY_RAIL = "HEAVY_RAIL",
  HIGH_SPEED_TRAIN = "HIGH_SPEED_TRAIN",
  INTERCITY_BUS = "INTERCITY_BUS",
  LONG_DISTANCE_TRAIN = "LONG_DISTANCE_TRAIN",
  METRO_RAIL = "METRO_RAIL",
  MONORAIL = "MONORAIL",
  OTHER = "OTHER",
}

export type TransitVehicle = {
  name?: LocalizedText;
  type: TransitVehicleType;
  iconUri?: string;
  localIconUri?: string;
};

// Localized stuff for transit

export type TransitDetailsLocalizedValues = {
  arrivalTime?: LocalizedTime;
  departureTime?: LocalizedTime;
};

export type LocalizedTime = {
  time: LocalizedText;
  timeZone: string;
};

// Other supporting types:

export type Viewport = {
  low: LatLng;
  high: LatLng;
};

export type Polyline = {
  // union type: either encodedPolyline OR geoJsonLinestring
  encodedPolyline?: string;
  geoJsonLinestring?: any; // you can type more precisely if using GeoJSON
};

export type RouteTravelAdvisory = {
  tollInfo?: TollInfo;
  speedReadingIntervals?: SpeedReadingInterval[];
};

export type RouteLocalizedValues = {
  distance?: LocalizedText;
  duration?: LocalizedText;
  staticDuration?: LocalizedText;
  transitFare?: LocalizedText;
};

export type PolylineDetails = {
  flyoverInfo?: FlyoverInfo[];
  narrowRoadInfo?: NarrowRoadInfo[];
};

export type FlyoverInfo = {
  flyoverPresence: RoadFeatureState;
  polylinePointIndex: PolylinePointIndex;
};

export type NarrowRoadInfo = {
  narrowRoadPresence: RoadFeatureState;
  polylinePointIndex: PolylinePointIndex;
};

export enum RoadFeatureState {
  ROAD_FEATURE_STATE_UNSPECIFIED = "ROAD_FEATURE_STATE_UNSPECIFIED",
  EXISTS = "EXISTS",
  DOES_NOT_EXIST = "DOES_NOT_EXIST",
}

export type PolylinePointIndex = {
  startIndex: number;
  endIndex: number;
};

// RouteLegTravelAdvisory

export type RouteLegTravelAdvisory = {
  tollInfo?: TollInfo;
  speedReadingIntervals?: SpeedReadingInterval[];
};

export type RouteLegLocalizedValues = {
  distance?: LocalizedText;
  duration?: LocalizedText;
  staticDuration?: LocalizedText;
};

// StepsOverview & MultiModalSegment

export type StepsOverview = {
  multiModalSegments?: MultiModalSegment[];
};

export type MultiModalSegment = {
  navigationInstruction: NavigationInstruction;
  travelMode: RouteTravelMode;
  stepStartIndex: number;
  stepEndIndex: number;
};

// TollInfo

export type TollInfo = {
  estimatedPrice?: Money[];
};

export type Money = {
  currencyCode: string;
  // integer or decimal string? per spec it's object Money
  units: number;
  nanos: number;
};

// The top-level ComputeRoutes response

export type ComputeRoutesResponse = {
  routes: Route[];
  fallbackInfo?: FallbackInfo;
  geocodingResults?: GeocodingResults;
};

export type FallbackInfo = {
  routingMode?: string;
  reason?: string;
};

export type GeocodedWaypoint = {
  geocoderStatus: Status;
  type?: string[];
  partialMatch?: boolean;
  placeId: string;
  intermediateWaypointRequestIndex?: number;
};

export type GeocodingResults = {
  origin?: GeocodedWaypoint;
  destination?: GeocodedWaypoint;
  intermediates?: GeocodedWaypoint[];
};

export enum Status {
  // include relevant statuses, e.g. OK, ZERO_RESULTS, etc.
  OK = "OK",
  // ...
}
export type RoutesResponse = ComputeRoutesResponse;
