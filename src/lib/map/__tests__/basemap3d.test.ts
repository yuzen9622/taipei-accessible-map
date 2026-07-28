import type maplibregl from "maplibre-gl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyMapDimension,
  BUILDING_3D_ID,
  buildingExtrusionLayer,
  buildingExtrusionPaint,
  FADE_MS,
  skySpec,
} from "../basemap3d";

type StubLayer = {
  id: string;
  type: string;
  source?: string;
  "source-layer"?: string;
  minzoom?: number;
  maxzoom?: number;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
};

/**
 * Minimal stand-in for the bits of the MapLibre API basemap3d touches. It
 * stores writes so the module's own read-back guard (needsApply) sees them,
 * and records the call order so the fade sequence can be asserted.
 */
function stubMap(layers: StubLayer[], opts: { sourceLoaded?: boolean } = {}) {
  const calls: string[] = [];
  const listeners = new Map<string, Set<() => void>>();
  const map = {
    calls,
    layers,
    sky: null as unknown,
    isStyleLoaded: () => true,
    getStyle: () => ({ layers }),
    getLayer: (id: string) => layers.find((l) => l.id === id),
    getSource: (id: string) => ({ id }),
    isSourceLoaded: () => opts.sourceLoaded ?? true,
    getPaintProperty: (id: string, prop: string) =>
      layers.find((l) => l.id === id)?.paint?.[prop],
    getLayoutProperty: (id: string, prop: string) =>
      layers.find((l) => l.id === id)?.layout?.[prop],
    setPaintProperty: (id: string, prop: string, value: unknown) => {
      const layer = layers.find((l) => l.id === id);
      if (!layer) throw new Error(`no layer ${id}`);
      layer.paint = { ...layer.paint, [prop]: value };
      if (!prop.endsWith("-transition")) {
        calls.push(`paint:${id}:${prop}=${JSON.stringify(value)}`);
      }
    },
    setLayoutProperty: (id: string, prop: string, value: unknown) => {
      const layer = layers.find((l) => l.id === id);
      if (!layer) throw new Error(`no layer ${id}`);
      layer.layout = { ...layer.layout, [prop]: value };
      calls.push(`layout:${id}:${prop}=${value}`);
    },
    setLayerZoomRange: (id: string, minzoom: number, maxzoom: number) => {
      const layer = layers.find((l) => l.id === id);
      if (!layer) throw new Error(`no layer ${id}`);
      layer.minzoom = minzoom;
      layer.maxzoom = maxzoom;
      calls.push(`zoomRange:${id}=${minzoom},${maxzoom}`);
    },
    addLayer: (layer: StubLayer, beforeId?: string) => {
      const at = beforeId ? layers.findIndex((l) => l.id === beforeId) : -1;
      if (at >= 0) layers.splice(at, 0, layer);
      else layers.push(layer);
      calls.push(`addLayer:${layer.id}:before=${beforeId ?? "-"}`);
    },
    setSky: (sky: unknown) => {
      map.sky = sky;
      calls.push("setSky");
    },
    on: (event: string, cb: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(cb);
    },
    off: (event: string, cb: () => void) => {
      listeners.get(event)?.delete(cb);
    },
    emit: (event: string) => {
      for (const cb of [...(listeners.get(event) ?? [])]) cb();
    },
    listenerCount: (event: string) => listeners.get(event)?.size ?? 0,
  };
  return map;
}

type StubMap = ReturnType<typeof stubMap>;

const asMap = (m: StubMap) => m as unknown as maplibregl.Map;

/** Mirrors OpenFreeMap `liberty`: a flat footprint fill capped at z14 plus an
 * already-present extrusion with no vertical gradient, labels after both. */
function libertyLayers(): StubLayer[] {
  return [
    { id: "background", type: "background" },
    {
      id: "building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      maxzoom: 14,
      paint: { "fill-color": "hsl(35,8%,85%)" },
    },
    {
      id: BUILDING_3D_ID,
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: { "fill-extrusion-opacity": 0.8 },
    },
    { id: "waterway_line_label", type: "symbol" },
  ];
}

/** Mirrors OpenFreeMap `dark`: flat fill only, no extrusion layer at all. */
function darkLayers(): StubLayer[] {
  return [
    { id: "background", type: "background" },
    {
      id: "building",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 12,
      paint: { "fill-opacity": 0.9 },
    },
    { id: "place_city", type: "symbol" },
  ];
}

describe("buildingExtrusionLayer", () => {
  it("starts transparent and hidden so it can be faded in on demand", () => {
    const layer = buildingExtrusionLayer("light", "openmaptiles");
    expect(layer.id).toBe(BUILDING_3D_ID);
    expect(layer["source-layer"]).toBe("building");
    expect(layer.minzoom).toBe(14);
    expect(layer.layout?.visibility).toBe("none");
    expect(layer.paint?.["fill-extrusion-opacity"]).toBe(0);
  });

  it("keeps opacity data-constant (the spec forbids data-driven) while height is an expression", () => {
    const paint = buildingExtrusionPaint("dark");
    expect(typeof paint?.["fill-extrusion-opacity"]).toBe("number");
    expect(Array.isArray(paint?.["fill-extrusion-height"])).toBe(true);
    expect(paint?.["fill-extrusion-vertical-gradient"]).toBe(true);
  });

  it("uses a different palette per theme", () => {
    expect(buildingExtrusionPaint("light")).not.toEqual(
      buildingExtrusionPaint("dark"),
    );
    expect(skySpec("light")).not.toEqual(skySpec("dark"));
  });
});

describe("applyMapDimension", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("overrides liberty's flat extrusion paint and widens the footprint zoom range", () => {
    const map = stubMap(libertyLayers());
    applyMapDimension(asMap(map), true, "light");

    // Without this the 2D group would vanish above z14, where liberty hands
    // rendering over to the extrusion.
    expect(map.calls).toContain("zoomRange:building=13,24");
    expect(
      map.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-vertical-gradient"),
    ).toBe(true);
    expect(map.calls).toContain("setSky");
  });

  it("creates the extrusion layer under the labels for dark, which ships none", () => {
    const map = stubMap(darkLayers());
    applyMapDimension(asMap(map), true, "dark");

    expect(map.calls).toContain(`addLayer:${BUILDING_3D_ID}:before=place_city`);
    const ids = map.layers.map((l) => l.id);
    expect(ids.indexOf(BUILDING_3D_ID)).toBeLessThan(ids.indexOf("place_city"));
  });

  it("fills dark's massing solid, since dark-on-dark washes out when translucent", () => {
    const dark = stubMap(darkLayers());
    applyMapDimension(asMap(dark), true, "dark");
    const light = stubMap(libertyLayers());
    applyMapDimension(asMap(light), true, "light");

    const darkOpacity = dark.getPaintProperty(
      BUILDING_3D_ID,
      "fill-extrusion-opacity",
    ) as number;
    const lightOpacity = light.getPaintProperty(
      BUILDING_3D_ID,
      "fill-extrusion-opacity",
    ) as number;
    expect(darkOpacity).toBe(1);
    expect(darkOpacity).toBeGreaterThan(lightOpacity);
  });

  it("makes the 3D group drawable before fading it in", () => {
    const map = stubMap(libertyLayers());
    applyMapDimension(asMap(map), true, "light");

    const visible = map.calls.indexOf(
      `layout:${BUILDING_3D_ID}:visibility=visible`,
    );
    // The paint override writes opacity 0 first (transparent before visible);
    // the fade is the write that lands on the final value.
    const fadeIn = map.calls.lastIndexOf(
      `paint:${BUILDING_3D_ID}:fill-extrusion-opacity=0.85`,
    );
    expect(visible).toBeGreaterThanOrEqual(0);
    expect(visible).toBeLessThan(fadeIn);
    expect(map.getPaintProperty("building", "fill-opacity")).toBe(0);
  });

  it("waits for tiles before fading when the source is still loading", () => {
    const map = stubMap(libertyLayers(), { sourceLoaded: false });
    applyMapDimension(asMap(map), true, "light");

    expect(map.calls).toContain(`layout:${BUILDING_3D_ID}:visibility=visible`);
    expect(map.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-opacity")).toBe(
      0,
    );

    map.emit("idle");
    expect(
      map.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-opacity"),
    ).toBeGreaterThan(0);
    expect(map.listenerCount("idle")).toBe(0);
  });

  it("ignores a stale readiness callback after the switch is reversed", () => {
    // 3D was requested while tiles were still loading, then the user went back
    // to 2D before `idle` arrived: the pending callback must not resurrect the
    // 3D group by writing its final opacity.
    const map = stubMap(libertyLayers(), { sourceLoaded: false });
    applyMapDimension(asMap(map), true, "light");
    applyMapDimension(asMap(map), false, "light");

    map.emit("idle");
    vi.advanceTimersByTime(800 + FADE_MS);

    expect(map.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-opacity")).toBe(
      0,
    );
    expect(map.getLayoutProperty(BUILDING_3D_ID, "visibility")).toBe("none");
  });

  it("falls back to fading anyway when idle never arrives", () => {
    const map = stubMap(libertyLayers(), { sourceLoaded: false });
    applyMapDimension(asMap(map), true, "light");
    vi.advanceTimersByTime(800);

    expect(
      map.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-opacity"),
    ).toBeGreaterThan(0);
  });

  it("hides the 3D group only after it has faded out", () => {
    const map = stubMap(libertyLayers());
    applyMapDimension(asMap(map), true, "light");
    applyMapDimension(asMap(map), false, "light");

    expect(map.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-opacity")).toBe(
      0,
    );
    expect(map.getLayoutProperty(BUILDING_3D_ID, "visibility")).toBe("visible");
    // liberty's flat fill has no explicit fill-opacity, so it comes back at
    // the spec default. (The dark case below covers restoring a real value.)
    expect(map.getPaintProperty("building", "fill-opacity")).toBe(1);

    vi.advanceTimersByTime(FADE_MS);
    expect(map.getLayoutProperty(BUILDING_3D_ID, "visibility")).toBe("none");
  });

  it("restores dark's own flat opacity rather than forcing 1", () => {
    const map = stubMap(darkLayers());
    applyMapDimension(asMap(map), true, "dark");
    applyMapDimension(asMap(map), false, "dark");

    expect(map.getPaintProperty("building", "fill-opacity")).toBe(0.9);
  });

  it("cancels a pending hide when the switch is reversed mid-fade", () => {
    const map = stubMap(libertyLayers());
    applyMapDimension(asMap(map), true, "light");
    applyMapDimension(asMap(map), false, "light");
    applyMapDimension(asMap(map), true, "light");

    vi.advanceTimersByTime(FADE_MS * 2);
    expect(map.getLayoutProperty(BUILDING_3D_ID, "visibility")).toBe("visible");
    expect(
      map.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-opacity"),
    ).toBeGreaterThan(0);
  });

  it("snaps without a timer when animation is off", () => {
    const map = stubMap(libertyLayers());
    applyMapDimension(asMap(map), true, "light", { animate: false });
    applyMapDimension(asMap(map), false, "light", { animate: false });

    expect(map.getLayoutProperty(BUILDING_3D_ID, "visibility")).toBe("none");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("is a no-op once applied, so styledata callbacks cannot loop", () => {
    const map = stubMap(libertyLayers());
    applyMapDimension(asMap(map), true, "light");
    const after = map.calls.length;

    applyMapDimension(asMap(map), true, "light");
    applyMapDimension(asMap(map), true, "light");
    expect(map.calls.length).toBe(after);
  });

  it("rebuilds after a theme swap replaces the style", () => {
    const light = stubMap(libertyLayers());
    applyMapDimension(asMap(light), true, "light");

    // A theme swap hands us a brand-new style object for the same map.
    light.layers.splice(0, light.layers.length, ...darkLayers());
    applyMapDimension(asMap(light), true, "dark", { animate: false });

    expect(light.getLayer(BUILDING_3D_ID)).toBeDefined();
    expect(
      light.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-color"),
    ).toEqual(buildingExtrusionPaint("dark")?.["fill-extrusion-color"]);
  });

  it("does nothing when the style has no building data", () => {
    const map = stubMap([{ id: "background", type: "background" }]);
    applyMapDimension(asMap(map), true, "light");
    expect(map.calls).toEqual([]);
  });
});
