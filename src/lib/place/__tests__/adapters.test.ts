import { describe, expect, it } from "vitest";
import {
  legacyPlaceDetailToPlaceResult,
  nominatimToPlaceResult,
} from "../adapters";

const nominatimPlace = {
  place_id: 42,
  osm_type: "node",
  osm_id: 123,
  lat: "25.033",
  lon: "121.5654",
  display_name: "臺北市信義區信義路五段7號",
  name: "台北 101",
  class: "tourism",
  type: "attraction",
  address: {
    road: "信義路五段",
    suburb: "信義區",
    city: "臺北市",
    postcode: "110",
  },
};

describe("place adapters", () => {
  it("converts Nominatim ids, review keys, and [lng, lat] coordinates", () => {
    const result = nominatimToPlaceResult(nominatimPlace);

    expect(result.id).toBe("osm:node:123");
    expect(result.reviewKey).toEqual({ placeId: "node/123", placeType: "osm" });
    expect(result.location.coordinates).toEqual([121.5654, 25.033]);
    expect(result.addressComponents).toEqual({
      road: "信義路五段",
      district: "信義區",
      city: "臺北市",
      postcode: "110",
    });
  });

  it("uses a coordinate id and no review key without OSM metadata", () => {
    const result = nominatimToPlaceResult({
      ...nominatimPlace,
      osm_type: undefined,
      osm_id: undefined,
    });

    expect(result.id).toBe("coord:25.033,121.5654");
    expect(result.reviewKey).toBeNull();
  });

  it("migrates legacy place entries, passes coordinate entries through, and drops invalid places", () => {
    const legacyPlace = {
      kind: "place",
      place: nominatimPlace,
      position: { lat: 25.033, lng: 121.5654 },
    };
    const coordinate = {
      kind: "coordinate",
      address: "地圖點擊位置",
      position: { lat: 25.04, lng: 121.56 },
    };

    expect(legacyPlaceDetailToPlaceResult(legacyPlace)).toMatchObject({
      kind: "place",
      place: { id: "osm:node:123" },
      position: legacyPlace.position,
    });
    expect(legacyPlaceDetailToPlaceResult(coordinate)).toBe(coordinate);
    expect(
      legacyPlaceDetailToPlaceResult({
        kind: "place",
        place: { name: "incomplete" },
        position: { lat: 25.033, lng: 121.5654 },
      }),
    ).toBeNull();
  });
});
