import { describe, expect, it } from "vitest";
import {
  carParkTypeLabel,
  chargeTypesLabels,
  parkingItemLngLat,
} from "@/components/BottomSheet/ParkingPanel";
import type { ParkingNearbyItem } from "@/types/route";

const t = (key: string) => `T:${key}`;

describe("carParkTypeLabel", () => {
  it("maps TDX car park type codes to labels", () => {
    expect(carParkTypeLabel(t, 1)).toBe("T:parkingTypeSurface");
    expect(carParkTypeLabel(t, 2)).toBe("T:parkingTypeMultiStory");
    expect(carParkTypeLabel(t, 3)).toBe("T:parkingTypeUnderground");
    expect(carParkTypeLabel(t, 4)).toBe("T:parkingTypeTower");
    expect(carParkTypeLabel(t, 5)).toBe("T:parkingTypeMechanical");
  });

  it("returns null for unknown/absent types", () => {
    expect(carParkTypeLabel(t, 6)).toBeNull();
    expect(carParkTypeLabel(t, undefined)).toBeNull();
  });
});

describe("chargeTypesLabels", () => {
  it("maps TDX charge codes to labels", () => {
    expect(chargeTypesLabels(t, [1, 2, 3, 4])).toEqual([
      { code: 1, label: "T:chargeTypeHourly" },
      { code: 2, label: "T:chargeTypePerEntry" },
      { code: 3, label: "T:chargeTypeMonthly" },
      { code: 4, label: "T:chargeTypeFree" },
    ]);
  });

  it("skips unknown codes (e.g. TDX 255 sentinel) instead of showing noise", () => {
    expect(chargeTypesLabels(t, [255])).toEqual([]);
    expect(chargeTypesLabels(t, [1, 99])).toEqual([
      { code: 1, label: "T:chargeTypeHourly" },
    ]);
  });

  it("returns [] for absent charge info", () => {
    expect(chargeTypesLabels(t, undefined)).toEqual([]);
    expect(chargeTypesLabels(t, [])).toEqual([]);
  });
});

describe("parkingItemLngLat", () => {
  const lot: ParkingNearbyItem = {
    type: "lot",
    _id: "lot-1",
    carParkId: "07P1C0100A",
    name: "城市車旅",
    city: "臺中市",
    position: { type: "Point", coordinates: [120.64201, 24.13365] },
    importedAt: "2026-08-14T12:02:20.235Z",
  };

  const space: ParkingNearbyItem = {
    type: "disabled",
    _id: "sp-1",
    city: "新北市",
    district: "八里區",
    quantity: 1,
    placeName: "商港八路",
    isMarked: true,
    latitude: 25.15043,
    longitude: 121.4102,
    location: {
      type: "Point",
      coordinates: [121.4102, 25.15043],
    },
    importedAt: "2026-08-14T12:02:20.235Z",
  };

  it("reads GeoJSON position.coordinates for lots (lng, lat order)", () => {
    expect(parkingItemLngLat(lot)).toEqual({ lng: 120.64201, lat: 24.13365 });
  });

  it("reads latitude/longitude for space items", () => {
    expect(parkingItemLngLat(space)).toEqual({ lng: 121.4102, lat: 25.15043 });
  });

  it("returns null for non-finite coordinates", () => {
    const bad = {
      ...lot,
      position: {
        type: "Point" as const,
        coordinates: [Number.NaN, 24.13365] as [number, number],
      },
    };
    expect(parkingItemLngLat(bad)).toBeNull();
  });
});
