import { describe, expect, it } from "vitest";
import {
  hasMovedBeyond,
  REFETCH_DISTANCE_THRESHOLD_M,
} from "@/hook/useFetchLocation";
import type { LatLng } from "@/types";

const BASE_LAT = 25.05;
const BASE_LNG = 121.5;
const base: LatLng = { lat: BASE_LAT, lng: BASE_LNG };

/** 1 度緯度 ≈ 111,195m；往北移動 meters 公尺的點。 */
const north = (meters: number): LatLng => ({
  lat: BASE_LAT + meters / 111195,
  lng: BASE_LNG,
});

describe("hasMovedBeyond", () => {
  it("returns true when there is no baseline (first fetch / panel remount)", () => {
    expect(hasMovedBeyond(null, base)).toBe(true);
  });

  it("returns false for identical location", () => {
    expect(hasMovedBeyond(base, base)).toBe(false);
  });

  it("returns false for small GPS jitter under the threshold", () => {
    // 50m < 100m — standing-still jitter must NOT trigger a refetch.
    expect(hasMovedBeyond(base, north(50))).toBe(false);
    expect(hasMovedBeyond(base, north(99))).toBe(false);
  });

  it("returns true once movement reaches the threshold", () => {
    // 101m ≥ 100m — real movement must trigger a refetch.
    expect(hasMovedBeyond(base, north(101))).toBe(true);
  });

  it("honors a custom threshold", () => {
    expect(hasMovedBeyond(base, north(200), 500)).toBe(false);
    expect(hasMovedBeyond(base, north(600), 500)).toBe(true);
  });

  it("exposes a sane default threshold", () => {
    expect(REFETCH_DISTANCE_THRESHOLD_M).toBeGreaterThanOrEqual(50);
    expect(REFETCH_DISTANCE_THRESHOLD_M).toBeLessThanOrEqual(100);
  });
});
