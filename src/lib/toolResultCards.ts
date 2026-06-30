import type { AiResultMarker, LatLng } from "@/types";
import {
  a11yPlacesToMarkers,
  getLatLng,
  googlePlacesToMarkers,
} from "./aiResults";

// biome-ignore lint/suspicious/noExplicitAny: 後端工具回傳形狀不固定，這裡刻意用 any 做防禦式存取
type AnyRec = Record<string, any>;

export type ToolCardIcon =
  | "search"
  | "a11y"
  | "parking"
  | "bus"
  | "air"
  | "env"
  | "hazard"
  | "nav";

export type ToolResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  position?: LatLng | null;
  // 有 target → 開既有詳情面板；否則有 position → 飛到該點
  target?: AiResultMarker["target"];
};

export type ToolResultGroup = {
  heading: string;
  icon: ToolCardIcon;
  items: ToolResultItem[];
  /** 顯示在標題下的摘要文字（建議、天氣描述等） */
  note?: string;
};

const MAX_ITEMS = 30;

// --- 列舉 → 中文標籤（對照 src/types/route.ts 的後端型別） ---
const A11Y_CATEGORY_LABEL: Record<string, string> = {
  wheelchair_accessible: "輪椅可通行",
  kerb_cut: "緣石斜坡",
  ramp: "無障礙坡道",
  elevator: "電梯",
  toilet: "無障礙廁所",
};

const HAZARD_TYPE_LABEL: Record<string, string> = {
  obstacle: "障礙物",
  construction: "施工",
  data_error: "資料錯誤",
};

const HAZARD_STATUS_LABEL: Record<string, string> = {
  pending: "待確認",
  verified: "已確認",
  rejected: "已否決",
  expired: "已過期",
};

function isOk(res: AnyRec | null | undefined): res is AnyRec {
  if (!res || typeof res !== "object") return false;
  if (res.ok === false) return false;
  if (res.status && res.status !== "OK") return false;
  return true;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function asArray(v: unknown): AnyRec[] {
  return Array.isArray(v) ? (v as AnyRec[]) : [];
}

/** 雙語名稱（TDX BilingualName）或純字串都能取出中文 */
function localName(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (v && typeof v === "object") {
    const o = v as AnyRec;
    return str(o.Zh_tw) || str(o.zh_tw) || str(o.En);
  }
  return undefined;
}

function isAffirmative(v: unknown): boolean {
  return ["1", "true", "是", "y", "yes"].includes(
    String(v ?? "")
      .trim()
      .toLowerCase(),
  );
}

/** TDX EstimateTime 為秒，轉成易讀文字 */
function fmtEtaSeconds(sec: unknown): string | undefined {
  if (typeof sec !== "number" || !Number.isFinite(sec)) return undefined;
  if (sec <= 0) return "進站中";
  if (sec < 60) return "即將進站";
  return `約 ${Math.round(sec / 60)} 分`;
}

function markersToItems(markers: AiResultMarker[]): ToolResultItem[] {
  return markers.map((m) => ({
    id: m.id,
    title: m.title,
    subtitle: m.desc,
    position: m.position,
    target: m.target,
  }));
}

/** 把含座標的陣列轉成可點飛行的卡片 */
function locationItems(
  items: AnyRec[],
  opts: {
    prefix: string;
    title: (it: AnyRec) => string | undefined;
    subtitle?: (it: AnyRec) => string | undefined;
    badge?: (it: AnyRec) => string | undefined;
    requirePosition?: boolean;
  },
): ToolResultItem[] {
  const out: ToolResultItem[] = [];
  items.slice(0, MAX_ITEMS).forEach((it, i) => {
    const position = getLatLng(it);
    if (opts.requirePosition && !position) return;
    out.push({
      id: `${opts.prefix}_${it.id ?? it._id ?? it.osmId ?? i}`,
      title: opts.title(it) || "項目",
      subtitle: opts.subtitle?.(it),
      badge: opts.badge?.(it),
      position,
    });
  });
  return out;
}

/**
 * 把任一工具的結果正規化成統一的卡片群組；無法渲染時回 null。
 */
export function getToolResultGroup(
  name: string,
  result: unknown,
): ToolResultGroup | null {
  const res = (result ?? {}) as AnyRec;
  if (!isOk(res)) return null;

  switch (name) {
    case "findGooglePlaces": {
      const items = markersToItems(googlePlacesToMarkers(result));
      return items.length
        ? { heading: "周邊地點", icon: "search", items }
        : null;
    }

    case "findA11yPlaces": {
      const items = markersToItems(a11yPlacesToMarkers(result));
      return items.length
        ? { heading: "無障礙設施", icon: "a11y", items }
        : null;
    }

    // SlimOsmA11y[]: { osmId, name?, category(enum), wheelchair?, location: GeoPoint }
    case "getA11yFacilityDetails": {
      const items = locationItems(asArray(res.facilities), {
        prefix: "a11yfac",
        title: (f) =>
          str(f.name) || A11Y_CATEGORY_LABEL[f.category] || str(f.category),
        subtitle: (f) =>
          [
            A11Y_CATEGORY_LABEL[f.category] || str(f.category),
            f.wheelchair === "yes"
              ? "輪椅可通行"
              : f.wheelchair === "limited"
                ? "部分無障礙"
                : undefined,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
      });
      return items.length
        ? { heading: "無障礙設施詳情", icon: "a11y", items }
        : null;
    }

    // DisabledParking[]: { placeName, quantity, latitude, longitude, city, district, spaceLabel, chargeType }
    case "findNearbyParking": {
      const items = locationItems(asArray(res.parkingSpots), {
        prefix: "parking",
        title: (p) => str(p.placeName) || str(p.name) || "身障停車位",
        subtitle: (p) =>
          [str(p.district) || str(p.city), str(p.spaceLabel)]
            .filter(Boolean)
            .join(" · ") || str(p.chargeType),
        badge: (p) => {
          const q = str(p.quantity ?? p.availableSpaces);
          return q != null ? `${q} 位` : undefined;
        },
        requirePosition: true,
      });
      const total = str(res.total);
      return items.length
        ? {
            heading: "身障停車位",
            icon: "parking",
            items,
            note: total ? `附近共 ${total} 處` : undefined,
          }
        : null;
    }

    // HazardReport[]: { hazardType, reportedLocation.coordinates, description, status, aiAnalysis.summary }
    case "getNearbyHazards": {
      const reports = asArray(res.data?.reports ?? res.reports ?? res.data);
      const items = locationItems(reports, {
        prefix: "hazard",
        title: (r) =>
          HAZARD_TYPE_LABEL[r.hazardType] ||
          str(r.hazardType) ||
          str(r.type) ||
          "路況回報",
        subtitle: (r) =>
          str(r.description) ||
          str(r.aiAnalysis?.summary) ||
          HAZARD_STATUS_LABEL[r.status] ||
          str(r.status),
        requirePosition: true,
      });
      return items.length
        ? { heading: "附近路況與障礙物", icon: "hazard", items }
        : null;
    }

    // LiveBus[]: { plateNumb, routeName, directionLabel, lat, lng, isLowFloor, hasLiftOrRamp, statusLabel, stopsAway }
    case "trackBuses": {
      const items = locationItems(asArray(res.buses), {
        prefix: "bus",
        title: (b) => str(b.plateNumb) || str(b.routeName) || "公車",
        subtitle: (b) =>
          [
            str(b.routeName),
            str(b.directionLabel),
            b.stopsAway != null ? `還有 ${b.stopsAway} 站` : str(b.statusLabel),
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
        badge: (b) =>
          isAffirmative(b.isLowFloor) || isAffirmative(b.hasLiftOrRamp)
            ? "低地板"
            : undefined,
        requirePosition: true,
      });
      const count = str(res.count);
      const low = str(res.lowFloorCount);
      const note = [
        count != null ? `共 ${count} 班` : null,
        low != null ? `低地板 ${low} 班` : null,
      ]
        .filter(Boolean)
        .join("，");
      return items.length
        ? {
            heading: "公車即時動態",
            icon: "bus",
            items,
            note: note || undefined,
          }
        : null;
    }

    // directions[].stops（TDX 形狀：StopName.Zh_tw、StopPosition、EstimateTime 秒）
    case "getBusRoute":
    case "getBusRouteDetail": {
      const dirs = asArray(res.directions);
      const stops: AnyRec[] = [];
      for (const d of dirs) {
        const dirLabel =
          localName(d.destination ?? d.DestinationStop) || str(d.direction);
        for (const s of asArray(d.stops)) stops.push({ ...s, __dir: dirLabel });
      }
      const items = locationItems(stops, {
        prefix: "stop",
        title: (s) =>
          localName(s.StopName) || str(s.stopName) || str(s.name) || "站牌",
        subtitle: (s) => {
          const etaRaw = s.EstimateTime ?? s.estimateTime ?? s.eta;
          const eta =
            typeof etaRaw === "number" ? fmtEtaSeconds(etaRaw) : str(etaRaw);
          return [str(s.__dir), eta].filter(Boolean).join(" · ") || undefined;
        },
      });
      const routeName = localName(res.routeName) || str(res.routeNo);
      return items.length
        ? {
            heading: routeName ? `公車 ${routeName} 站牌` : "公車站牌",
            icon: "bus",
            items,
          }
        : null;
    }

    case "getBusTimetable": {
      const schedules = asArray(res.schedules);
      const items: ToolResultItem[] = schedules
        .slice(0, MAX_ITEMS)
        .map((s, i) => ({
          id: `sched_${i}`,
          title:
            str(s.time) ||
            str(s.DepartureTime) ||
            str(s.departureTime) ||
            str(s.ArrivalTime) ||
            "班次",
          subtitle:
            [localName(s.destination ?? s.DestinationStop), str(s.note)]
              .filter(Boolean)
              .join(" · ") || undefined,
        }))
        .filter((it) => it.title !== "班次" || it.subtitle);
      const routeName = localName(res.routeName);
      return items.length
        ? {
            heading: routeName ? `公車 ${routeName} 時刻表` : "公車時刻表",
            icon: "bus",
            items,
          }
        : null;
    }

    // getAirQuality 工具：{ pm25, quality, advice, coordinates, city, area }
    case "getAirQuality": {
      const pm25 = str(res.pm25);
      const quality = str(res.quality) || str(res.description);
      const position = getLatLng(res.coordinates ?? res);
      const place = [str(res.city), str(res.area)].filter(Boolean).join(" ");
      if (pm25 == null && quality == null) return null;
      return {
        heading: place ? `空氣品質 · ${place}` : "空氣品質",
        icon: "air",
        note: str(res.advice),
        items: [
          {
            id: "air_0",
            title:
              pm25 != null ? `PM2.5 ${pm25} μg/m³` : (quality ?? "空氣品質"),
            subtitle: pm25 != null ? quality : undefined,
            position,
          },
        ],
      };
    }

    // EnvironmentData: { weather{temperature,condition,...}, airQuality{description,quality}, cameras{items:[{name,url,distance}]} }
    case "getEnvironmentInfo": {
      const items: ToolResultItem[] = [];
      const w = res.weather as AnyRec | undefined;
      if (w && w.status !== "unavailable") {
        const temp = str(w.temperature ?? w.temp);
        const desc = str(w.condition ?? w.description ?? w.weather);
        const title =
          [temp != null ? `${temp}°C` : null, desc].filter(Boolean).join(" ") ||
          "天氣";
        const rain = str(w.precipitationProbability);
        items.push({
          id: "env_weather",
          title,
          subtitle: rain != null ? `降雨機率 ${rain}%` : undefined,
        });
      }
      const aq = res.airQuality as AnyRec | undefined;
      if (aq && aq.status !== "unavailable") {
        const pm25 = str(aq.pm25);
        items.push({
          id: "env_air",
          title:
            pm25 != null
              ? `PM2.5 ${pm25}`
              : `空氣品質 ${str(aq.quality) ?? ""}`.trim(),
          subtitle: str(aq.description),
          position: getLatLng(aq.coordinates ?? aq),
        });
      }
      // cameras.items（EnvironmentData）或 nearbyCctv（工具別名）；多半無座標
      const cams = asArray(res.cameras?.items ?? res.nearbyCctv);
      cams.slice(0, MAX_ITEMS).forEach((c, i) => {
        items.push({
          id: `cctv_${i}`,
          title: str(c.name) || str(c.title) || "即時影像",
          subtitle:
            c.distance != null
              ? `約 ${Math.round(Number(c.distance))} m`
              : str(c.address) || str(c.road),
          position: getLatLng(c),
        });
      });

      return items.length
        ? { heading: "周邊環境資訊", icon: "env", items }
        : null;
    }

    // NavInstruction[]: { text, type, relativeDirection, distanceM, streetName }（無座標）
    case "getNavInstructions": {
      const instructions = asArray(res.instructions);
      const items: ToolResultItem[] = instructions
        .slice(0, MAX_ITEMS)
        .map((step, i) => {
          const dist =
            typeof step.distanceM === "number" && step.distanceM > 0
              ? step.distanceM >= 1000
                ? `${(step.distanceM / 1000).toFixed(1)} km`
                : `${Math.round(step.distanceM)} m`
              : undefined;
          return {
            id: `nav_${i}`,
            title: str(step.text) || str(step.instruction) || `第 ${i + 1} 步`,
            subtitle:
              [str(step.relativeDirection), str(step.streetName), dist]
                .filter(Boolean)
                .join(" · ") || undefined,
          };
        });
      const total = str(res.totalSteps);
      return items.length
        ? {
            heading: "導航指引",
            icon: "nav",
            items,
            note: total ? `共 ${total} 步` : undefined,
          }
        : null;
    }

    default:
      return null;
  }
}
