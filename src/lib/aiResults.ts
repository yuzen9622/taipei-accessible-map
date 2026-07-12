import {
  A11yEnum,
  type AiResultMarker,
  type IBathroom,
  type LatLng,
  type Marker,
  type metroA11yData,
  type NominatimPlace,
} from "@/types";
import { formatBathroom, formatMetroA11y } from "./utils";

// biome-ignore lint/suspicious/noExplicitAny: 後端工具回傳形狀不固定，這裡刻意用 any 做防禦式存取
type AnyRec = Record<string, any>;

/**
 * 防禦式座標偵測：依序嘗試多種常見欄位命名，回傳 LatLng 或 null。
 * 座標數值僅供地圖定位/開詳情使用，不會渲染給使用者看。
 */
export function getLatLng(item: AnyRec | null | undefined): LatLng | null {
  if (!item || typeof item !== "object") return null;

  const toNum = (v: unknown): number | null => {
    if (typeof v === "number") return Number.isNaN(v) ? null : v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };
  const pair = (lat: unknown, lng: unknown): LatLng | null => {
    const la = toNum(lat);
    const ln = toNum(lng);
    return la !== null && ln !== null ? { lat: la, lng: ln } : null;
  };
  // GeoJSON 座標陣列為 [lng, lat]
  const coords = (c: unknown): LatLng | null =>
    Array.isArray(c) && c.length >= 2 ? pair(c[1], c[0]) : null;

  return (
    pair(item.geometry?.location?.lat, item.geometry?.location?.lng) ??
    pair(
      item.geometry?.location?.latitude,
      item.geometry?.location?.longitude,
    ) ??
    pair(item.location?.lat, item.location?.lng) ??
    pair(item.location?.latitude, item.location?.longitude) ??
    pair(item.position?.lat, item.position?.lng) ??
    pair(item.position?.latitude, item.position?.longitude) ??
    pair(item.lat, item.lng) ??
    pair(item.latitude, item.longitude) ??
    pair(item.lat, item.lon) ??
    pair(item.緯度, item.經度) ??
    pair(item.PositionLat, item.PositionLon) ??
    pair(item.StopPosition?.PositionLat, item.StopPosition?.PositionLon) ??
    pair(item.BusPosition?.PositionLat, item.BusPosition?.PositionLon) ??
    coords(item.location?.coordinates) ??
    coords(item.reportedLocation?.coordinates) ??
    coords(item.geometry?.coordinates) ??
    coords(item.coordinates) ??
    null
  );
}

function isOk(res: AnyRec | null | undefined): res is AnyRec {
  if (!res || typeof res !== "object") return false;
  if (res.ok === false) return false;
  if (res.status && res.status !== "OK") return false;
  return true;
}

function dedupe(markers: AiResultMarker[]): AiResultMarker[] {
  const seen = new Map<string, AiResultMarker>();
  for (const m of markers) if (!seen.has(m.id)) seen.set(m.id, m);
  return Array.from(seen.values());
}

/** findGooglePlaces 結果 → 可點標記（開 PlaceContent）。 */
export function googlePlacesToMarkers(res: unknown): AiResultMarker[] {
  const r = res as AnyRec;
  if (!isOk(r) || !Array.isArray(r.places)) return [];

  const markers: AiResultMarker[] = [];
  r.places.forEach((place: AnyRec, i: number) => {
    const pos = getLatLng(place);
    if (!pos) return;
    const name: string = place.name || place.formatted_address || "地點";
    // 合成 NominatimPlace；PlaceContent 只需 lat/lon/name/display_name，
    // 缺 osm_id 時會自動略過 OSM 詳情查詢。
    const synthetic = {
      place_id: place.place_id ?? `g_${i}`,
      lat: String(pos.lat),
      lon: String(pos.lng),
      display_name: place.formatted_address || name,
      name,
      type: place.types?.[0] ?? place.type,
      address: place.address,
    } as unknown as NominatimPlace;

    markers.push({
      id: `g_${place.place_id ?? i}`,
      position: pos,
      title: name,
      desc: place.formatted_address,
      target: { panel: "place", place: synthetic },
    });
  });

  return dedupe(markers);
}

/** findA11yPlaces 結果 → 可點標記（開 StationDetailContent，依座標載入周邊設施）。 */
export function a11yPlacesToMarkers(res: unknown): AiResultMarker[] {
  const r = res as AnyRec;
  if (!isOk(r)) return [];
  const places = (r.places || {}) as AnyRec;
  const nearbyBathroom = (places.nearbyBathroom ?? []) as AnyRec[];
  const nearbyOsm = (places.nearbyOsm ?? []) as AnyRec[];
  const nearbyMetroA11y = (places.nearbyMetroA11y ?? []) as AnyRec[];
  const nearbyParking = (places.nearbyParking ?? []) as AnyRec[];

  const markers: AiResultMarker[] = [];
  const pushFromMarker = (m: Marker) => {
    if (Number.isNaN(m.position.lat) || Number.isNaN(m.position.lng)) return;
    markers.push({
      id: String(m.id),
      position: m.position,
      title: m.content?.title || "無障礙設施",
      desc: m.content?.desc,
      target: { panel: "station", marker: m },
    });
  };

  // 已知形狀 → 重用既有 formatter（formatter 內部會過濾無座標項目）
  const metroItems = nearbyMetroA11y.filter(
    (m) => m?.["出入口電梯/無障礙坡道名稱"],
  );
  formatMetroA11y(metroItems as metroA11yData[]).forEach(pushFromMarker);

  const bathItems = nearbyBathroom.filter((b) => b?.name);
  formatBathroom(bathItems as IBathroom[]).forEach(pushFromMarker);

  // 未知形狀（osm / parking）→ 防禦式建 Marker
  [...nearbyOsm, ...nearbyParking].forEach((item, i) => {
    const pos = getLatLng(item);
    if (!pos) return;
    const title: string =
      item.name || item.placeName || item.tags?.name || "無障礙設施";
    const marker: Marker = {
      id: item.id ?? item._id ?? item.osmId ?? `a_${i}`,
      position: pos,
      type: "pin",
      content: {
        title,
        desc:
          item.address ||
          item.spaceLabel ||
          item.tags?.amenity ||
          item.type ||
          "",
      },
      zIndex: 1,
      a11yType: A11yEnum.NONE,
    };
    pushFromMarker(marker);
  });

  return dedupe(markers);
}
