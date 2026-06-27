"use client";
import { create } from "zustand";

export type StatusState = "idle" | "loading" | "success" | "error";

export type StatusAction =
  | "load_a11y"
  | "query_bus"
  | "search_place"
  | "plan_route"
  | "load_preferences"
  | "upload_hazard"
  | "cache_facilities"
  | "get_location"
  | "toggle_pin"
  | "load_map_layer";

const LOADING_TEXT: Record<StatusAction, string> = {
  load_a11y: "正在整理附近輪椅可通行地點",
  query_bus: "正在查詢公車是否有無障礙坡道",
  search_place: "正在尋找你想去的地點",
  plan_route: "正在規劃一條少階梯的通行路線",
  load_preferences: "載入你的專屬出行偏好",
  upload_hazard: "送出你回報的通行障礙資訊",
  cache_facilities: "儲存附近地點方便你下次快速查詢",
  get_location: "正在取得你現在的位置",
  toggle_pin: "調整介面顯示方式",
  load_map_layer: "整理街道通行資訊",
};

const LOADING_TEXT_EN: Record<StatusAction, string> = {
  load_a11y: "Organizing nearby wheelchair-accessible spots",
  query_bus: "Checking bus accessibility ramps",
  search_place: "Finding the place you want to go",
  plan_route: "Planning a step-free route",
  load_preferences: "Loading your travel preferences",
  upload_hazard: "Submitting your reported barrier",
  cache_facilities: "Saving nearby places for faster access",
  get_location: "Getting your current location",
  toggle_pin: "Adjusting display layout",
  load_map_layer: "Preparing street accessibility info",
};

const SUCCESS_TEXT: Partial<Record<StatusAction, string>> = {
  load_a11y: "附近無障礙地點已整理完成",
  plan_route: "適合輪椅的路線規劃好了",
  upload_hazard: "你的回報已經送出",
  search_place: "已找到地點資訊",
  query_bus: "公車到站資訊已更新",
  get_location: "已取得你的位置",
  load_preferences: "出行偏好已載入",
  cache_facilities: "附近地點已儲存",
  load_map_layer: "街道資訊已準備完成",
  toggle_pin: "介面已調整",
};

const SUCCESS_TEXT_EN: Partial<Record<StatusAction, string>> = {
  load_a11y: "Nearby accessible spots ready",
  plan_route: "Wheelchair-friendly route planned",
  upload_hazard: "Your report has been submitted",
  search_place: "Place info found",
  query_bus: "Bus arrival info updated",
  get_location: "Location acquired",
  load_preferences: "Preferences loaded",
  cache_facilities: "Nearby places saved",
  load_map_layer: "Street info ready",
  toggle_pin: "Layout adjusted",
};

interface StatusStore {
  state: StatusState;
  action: StatusAction | null;
  message: string;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  startAction: (action: StatusAction) => void;
  succeedAction: (action?: StatusAction) => void;
  failAction: (friendlyMessage?: string) => void;
  reset: () => void;
}

const IDLE_TEXT = "準備好可以查詢無障礙路線";
const IDLE_TEXT_EN = "Ready to search accessible routes";

let successTimer: ReturnType<typeof setTimeout> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (successTimer) { clearTimeout(successTimer); successTimer = null; }
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
}

export function getLoadingText(action: StatusAction, locale = "zh-TW"): string {
  return locale === "en" ? LOADING_TEXT_EN[action] : LOADING_TEXT[action];
}

export function getSuccessText(action: StatusAction, locale = "zh-TW"): string {
  const map = locale === "en" ? SUCCESS_TEXT_EN : SUCCESS_TEXT;
  return map[action] || (locale === "en" ? "Done" : "完成");
}

export function getIdleText(locale = "zh-TW"): string {
  return locale === "en" ? IDLE_TEXT_EN : IDLE_TEXT;
}

const useStatusStore = create<StatusStore>((set, get) => ({
  state: "idle",
  action: null,
  message: IDLE_TEXT,
  enabled: true,
  setEnabled: (v) => {
    set({ enabled: v });
    localStorage.setItem("statusBarEnabled", JSON.stringify(v));
  },
  startAction: (action) => {
    if (!get().enabled) return;
    clearTimers();
    const startTime = Date.now();
    debounceTimer = setTimeout(() => {
      if (Date.now() - startTime >= 280) {
        set({ state: "loading", action, message: LOADING_TEXT[action] });
      }
    }, 300);
    set({ action });
  },
  succeedAction: (action) => {
    if (!get().enabled) return;
    clearTimers();
    const a = action || get().action;
    if (!a) { set({ state: "idle", action: null, message: IDLE_TEXT }); return; }
    const msg = SUCCESS_TEXT[a] || "完成";
    set({ state: "success", action: a, message: msg });
    successTimer = setTimeout(() => {
      set({ state: "idle", action: null, message: IDLE_TEXT });
    }, 2000);
  },
  failAction: (friendlyMessage) => {
    if (!get().enabled) return;
    clearTimers();
    set({
      state: "error",
      message: friendlyMessage || "操作遇到問題，請稍後再試",
    });
    successTimer = setTimeout(() => {
      set({ state: "idle", action: null, message: IDLE_TEXT });
    }, 4000);
  },
  reset: () => {
    clearTimers();
    set({ state: "idle", action: null, message: IDLE_TEXT });
  },
}));

export default useStatusStore;
