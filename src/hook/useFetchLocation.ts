import { useEffect, useRef, useState } from "react";
import { haversineMeters } from "@/lib/geo";
import type { LatLng } from "@/types";

/**
 * 位移門檻（公尺）：低於此距離的 GPS 更新不重新 fetch。
 * high-accuracy watchPosition 約每 1~3 秒回一次 fix，站著不動也會抖動
 * 幾公尺；低於門檻的移動對「附近停車/設施」這類結果沒有意義，
 * 擋掉即可避免每個 fix 都打一次 API。
 */
export const REFETCH_DISTANCE_THRESHOLD_M = 100;

/**
 * 純邏輯：距上次 fetch 位置是否已移動超過 thresholdM。
 * - last 為 null（尚未查過／面板重掛載）→ 視為需重查（回 true）。
 * - 位移 ≥ thresholdM → true（重查）。
 * - 位移 < thresholdM（GPS 小抖動）→ false（不重查）。
 */
export function hasMovedBeyond(
  last: LatLng | null,
  current: LatLng,
  thresholdM: number = REFETCH_DISTANCE_THRESHOLD_M,
): boolean {
  if (!last) return true;
  return haversineMeters(last, current) >= thresholdM;
}

/**
 * 距離門檻 gate：回傳「目前應 fetch 的位置」。
 * 只有距上次 fetch 基準點位移 ≥ thresholdM 時才更新回傳值，
 * 因此面板的 fetch effect 若以回傳值為依賴，GPS 小抖動不會重跑 effect、
 * 也不會中斷進行中的請求；位移夠大才真正重新查詢。
 *
 * 用法：
 *   const fetchLoc = useFetchLocation(userLocation);
 *   useEffect(() => { if (!fetchLoc) return; api(fetchLoc); }, [fetchLoc]);
 */
export function useFetchLocation(
  userLocation: LatLng | null,
  thresholdM: number = REFETCH_DISTANCE_THRESHOLD_M,
): LatLng | null {
  const [fetchLoc, setFetchLoc] = useState<LatLng | null>(userLocation);
  const lastFetchRef = useRef<LatLng | null>(userLocation);

  useEffect(() => {
    if (!userLocation) return;
    if (!hasMovedBeyond(lastFetchRef.current, userLocation, thresholdM)) return;
    lastFetchRef.current = userLocation;
    setFetchLoc(userLocation);
  }, [userLocation, thresholdM]);

  return fetchLoc;
}
