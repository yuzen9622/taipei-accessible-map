import { describe, expect, it } from "vitest";
import { migrateLegacyPlaceStorage } from "../adapters";

describe("legacy place storage migration", () => {
  it("re-keys saved categories while preserving coordinate favorites", () => {
    const legacyPlace = {
      kind: "place",
      place: {
        place_id: 42,
        osm_type: "node",
        osm_id: 123,
        lat: "25.033",
        lon: "121.5654",
        display_name: "臺北市信義區信義路五段7號",
        name: "台北 101",
      },
      position: { lat: 25.033, lng: 121.5654 },
    };
    const coordinate = {
      kind: "coordinate",
      address: "地圖點擊位置",
      position: { lat: 25.04, lng: 121.56 },
    };

    const migrated = migrateLegacyPlaceStorage({
      searchHistory: [],
      savedPlaces: [legacyPlace, coordinate],
      savedPlaceCategories: {
        p_42: "favorite",
        "c_25.04_121.56": "food",
      },
    });

    expect(migrated.savedPlaces).toHaveLength(2);
    expect(migrated.savedPlaces[1]).toBe(coordinate);
    expect(migrated.savedPlaceCategories).toEqual({
      "p_osm:node:123": "favorite",
      "c_25.04_121.56": "food",
    });
  });
});
