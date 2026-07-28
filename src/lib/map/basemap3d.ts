import type maplibregl from "maplibre-gl";
import type {
  FillExtrusionLayerSpecification,
  SkySpecification,
} from "maplibre-gl";

/**
 * 2D and 3D are two distinct basemap layer groups living inside ONE MapLibre
 * style, cross-faded in place:
 *
 *   2D group — the flat `building` fill already in the OpenFreeMap style.
 *   3D group — the `building-3d` fill-extrusion plus a sky/atmosphere.
 *
 * Switching never calls `map.setStyle`, so every overlay (route line, live
 * buses, hazards, SOS tracker — all declarative react-map-gl `<Source>`/
 * `<Layer>`) survives the switch untouched, and because both groups read the
 * SAME vector source the target group's tiles are already in cache: there is
 * no frame where the basemap is blank.
 *
 * Style facts this relies on (verified against the live styles 2026-07-28):
 *   - `liberty` already ships `building-3d` (minzoom 14, flat colour, opacity
 *     0.8, no vertical gradient) and draws it in 2D too — the reason 2D and 3D
 *     used to look like the same basemap.
 *   - `dark` ships no extrusion layer at all, so 3D dark had no buildings.
 *   - `liberty`'s flat `building` fill stops at maxzoom 14 (the extrusion took
 *     over above that), so hiding the extrusion leaves z>14 with no buildings
 *     unless the flat layer's zoom range is widened.
 */

export type MapTheme = "light" | "dark";

export const BUILDING_3D_ID = "building-3d";
export const FADE_MS = 450;
/** Dark's buildings are dark-on-dark, so any translucency washes the massing
 * out against the basemap — it needs a solid fill, where light can afford to
 * let a little of the ground plane through. */
function extrusionOpacity(theme: MapTheme): number {
  return theme === "dark" ? 1 : 0.85;
}
/** 2D needs flat footprints at every zoom, not just up to the style's z14. */
const FLAT_BUILDING_MAX_ZOOM = 24;
/** Cap on waiting for tiles before fading anyway; the old group stays up. */
const READY_TIMEOUT_MS = 800;

/** DEM terrain is a separate change: it moves markers onto the elevation
 * model and changes `queryRenderedFeatures` results, so it needs its own
 * verification pass rather than riding along with the 2D/3D split. */
const ENABLE_TERRAIN = false;

type FlatOriginal = { opacity: unknown };

type MapState = {
  theme: MapTheme | null;
  hideTimer: ReturnType<typeof setTimeout> | null;
  cancelReady: (() => void) | null;
  flatOriginals: Map<string, FlatOriginal>;
};

const states = new WeakMap<maplibregl.Map, MapState>();

function stateOf(map: maplibregl.Map): MapState {
  let state = states.get(map);
  if (!state) {
    state = {
      theme: null,
      hideTimer: null,
      cancelReady: null,
      flatOriginals: new Map(),
    };
    states.set(map, state);
  }
  return state;
}

/** Colour ramp keeps each theme's existing palette: liberty's warm greys,
 * dark's cool near-blacks. Taller buildings read lighter so the skyline has
 * depth instead of one flat mass. */
function extrusionColors(theme: MapTheme): [string, string] {
  return theme === "dark"
    ? ["hsl(220,10%,17%)", "hsl(220,12%,27%)"]
    : ["hsl(35,10%,89%)", "hsl(35,8%,77%)"];
}

const HEIGHT_EXPR = [
  "coalesce",
  ["get", "render_height"],
  ["get", "height"],
  3,
] as unknown as maplibregl.ExpressionSpecification;

/**
 * Paint for the 3D group. `fill-extrusion-opacity` starts at 0 and is
 * data-constant + transitionable, so the cross-fade is just "set the final
 * value and let MapLibre interpolate" — no rAF loop.
 */
export function buildingExtrusionPaint(
  theme: MapTheme,
): NonNullable<FillExtrusionLayerSpecification["paint"]> {
  const [low, high] = extrusionColors(theme);
  return {
    "fill-extrusion-height": HEIGHT_EXPR,
    "fill-extrusion-base": [
      "coalesce",
      ["get", "render_min_height"],
      ["get", "min_height"],
      0,
    ] as unknown as maplibregl.ExpressionSpecification,
    "fill-extrusion-color": [
      "interpolate",
      ["linear"],
      HEIGHT_EXPR,
      0,
      low,
      60,
      high,
    ] as unknown as maplibregl.ExpressionSpecification,
    "fill-extrusion-vertical-gradient": true,
    "fill-extrusion-opacity": 0,
  };
}

export function buildingExtrusionLayer(
  theme: MapTheme,
  sourceId: string,
): FillExtrusionLayerSpecification {
  return {
    id: BUILDING_3D_ID,
    type: "fill-extrusion",
    source: sourceId,
    "source-layer": "building",
    minzoom: 14,
    filter: [
      "match",
      ["geometry-type"],
      ["Polygon", "MultiPolygon"],
      true,
      false,
    ],
    layout: { visibility: "none" },
    paint: buildingExtrusionPaint(theme),
  };
}

/** Sky is a root-level style property in MapLibre 5 (there is no sky *layer*),
 * and it is only visible once the camera is pitched — so it is set once per
 * theme and left out of the cross-fade entirely. */
export function skySpec(theme: MapTheme): SkySpecification {
  return theme === "dark"
    ? {
        "sky-color": "#070a10",
        "horizon-color": "#171f2b",
        "fog-color": "#0b0f16",
        "sky-horizon-blend": 0.6,
        "horizon-fog-blend": 0.6,
        "fog-ground-blend": 0.5,
        "atmosphere-blend": 0.7,
      }
    : {
        "sky-color": "#a9ccef",
        "horizon-color": "#e7eff7",
        "fog-color": "#eef1f4",
        "sky-horizon-blend": 0.7,
        "horizon-fog-blend": 0.6,
        "fog-ground-blend": 0.5,
        "atmosphere-blend": 0.8,
      };
}

/** The flat footprint layers, found by data rather than by hardcoded id so
 * both styles (and any future restyle) resolve the same way. */
function flatBuildingLayers(map: maplibregl.Map) {
  const layers = map.getStyle()?.layers ?? [];
  return layers.filter(
    (layer): layer is maplibregl.FillLayerSpecification =>
      layer.type === "fill" &&
      (layer as maplibregl.FillLayerSpecification)["source-layer"] ===
        "building",
  );
}

function firstSymbolLayerId(map: maplibregl.Map): string | undefined {
  // Buildings belong under the labels so street/POI names stay legible when
  // tilted. Overlays are added after the style and are unaffected by this.
  return map.getStyle()?.layers?.find((l) => l.type === "symbol")?.id;
}

/**
 * True when the live style does not already carry our configuration. Read
 * entirely from the map (never from remembered JS state) for two reasons:
 * `setPaintProperty` itself re-fires `styledata`, so a stale-state guard would
 * either loop or skip; and a theme swap replaces the whole style, which must
 * re-trigger a rebuild no matter what order the React effect and the style
 * load happen to run in.
 */
function needsApply(
  map: maplibregl.Map,
  theme: MapTheme,
  is3D: boolean,
): boolean {
  if (!map.getLayer(BUILDING_3D_ID)) return true;
  // liberty's own building-3d has no vertical gradient — its presence is the
  // fingerprint that this style still carries our paint.
  if (
    map.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-vertical-gradient") !==
    true
  )
    return true;
  const state = stateOf(map);
  if (state.theme !== theme) return true;
  if (
    map.getPaintProperty(BUILDING_3D_ID, "fill-extrusion-opacity") !==
    (is3D ? extrusionOpacity(theme) : 0)
  )
    return true;
  // A pending hide timer means a 2D fade is still running and the layer is
  // meant to be visible for now.
  if (!state.hideTimer) {
    const visibility =
      map.getLayoutProperty(BUILDING_3D_ID, "visibility") ?? "visible";
    if (visibility !== (is3D ? "visible" : "none")) return true;
  }
  return false;
}

/**
 * Idempotently make sure both groups exist in the current style and carry this
 * theme's paint. Returns the shared source id, or null when the style has no
 * building data at all (then there is nothing to switch between).
 */
function ensureGroups(
  map: maplibregl.Map,
  theme: MapTheme,
): { sourceId: string; flatIds: string[] } | null {
  const flat = flatBuildingLayers(map);
  const sourceId = flat[0]?.source ?? map.getLayer(BUILDING_3D_ID)?.source;
  if (!sourceId) return null;

  const state = stateOf(map);
  if (state.theme !== theme) state.flatOriginals.clear();

  for (const layer of flat) {
    if (!state.flatOriginals.has(layer.id)) {
      state.flatOriginals.set(layer.id, {
        opacity: map.getPaintProperty(layer.id, "fill-opacity"),
      });
    }
    // Widen once, up front: from here on the two groups differ by opacity
    // only, so toggling never changes a zoom range (which would force a tile
    // reparse on every switch).
    if ((layer.maxzoom ?? Number.POSITIVE_INFINITY) < FLAT_BUILDING_MAX_ZOOM) {
      map.setLayerZoomRange(
        layer.id,
        layer.minzoom ?? 0,
        FLAT_BUILDING_MAX_ZOOM,
      );
    }
  }

  if (map.getLayer(BUILDING_3D_ID)) {
    // liberty already has the layer: overwrite its flat paint with ours.
    const paint = buildingExtrusionPaint(theme);
    for (const [prop, value] of Object.entries(paint)) {
      map.setPaintProperty(BUILDING_3D_ID, prop, value);
    }
  } else {
    // dark has no extrusion layer at all — build it.
    map.addLayer(
      buildingExtrusionLayer(theme, sourceId),
      firstSymbolLayerId(map),
    );
  }

  map.setSky(skySpec(theme));
  state.theme = theme;
  return { sourceId, flatIds: flat.map((l) => l.id) };
}

/** Resolve once the target group's tiles are drawable. Both groups read the
 * same source, so this is normally already true and the fade starts on the
 * spot; the `idle` listener is the safety net for a cold viewport, and the
 * timeout the safety net for `idle` never arriving. */
function whenTilesReady(
  map: maplibregl.Map,
  sourceId: string,
  run: () => void,
): () => void {
  let sourceReady = false;
  try {
    sourceReady = map.isSourceLoaded(sourceId);
  } catch {
    sourceReady = true; // source vanished mid-switch; don't stall the fade
  }
  if (sourceReady) {
    run();
    return () => {};
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    map.off("idle", finish);
    clearTimeout(timer);
    run();
  };
  const timer = setTimeout(finish, READY_TIMEOUT_MS);
  map.on("idle", finish);
  return () => {
    done = true;
    map.off("idle", finish);
    clearTimeout(timer);
  };
}

function setTransitions(
  map: maplibregl.Map,
  flatIds: string[],
  duration: number,
) {
  map.setPaintProperty(BUILDING_3D_ID, "fill-extrusion-opacity-transition", {
    duration,
    delay: 0,
  });
  for (const id of flatIds) {
    map.setPaintProperty(id, "fill-opacity-transition", { duration, delay: 0 });
  }
}

/**
 * Cross-fade the basemap between the 2D and 3D groups.
 *
 * `animate: false` snaps straight to the end state — used on first load and
 * after a theme swap replaces the style, where there is nothing to fade from.
 */
export function applyMapDimension(
  map: maplibregl.Map,
  is3D: boolean,
  theme: MapTheme,
  options: { animate?: boolean } = {},
): void {
  if (!map.isStyleLoaded()) return;
  if (!needsApply(map, theme, is3D)) return;

  const groups = ensureGroups(map, theme);
  if (!groups) return;
  const { sourceId, flatIds } = groups;
  const state = stateOf(map);

  // A reversed switch must cancel the previous one's tail, or the outgoing
  // group's hide would fire after the incoming group is already up.
  if (state.hideTimer) {
    clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }
  state.cancelReady?.();
  state.cancelReady = null;

  const duration = options.animate === false ? 0 : FADE_MS;
  setTransitions(map, flatIds, duration);

  if (is3D) {
    // Make the target group drawable first, still fully transparent, and only
    // start the fade once its tiles are there — the outgoing group keeps the
    // screen covered until then.
    map.setLayoutProperty(BUILDING_3D_ID, "visibility", "visible");
    state.cancelReady = whenTilesReady(map, sourceId, () => {
      state.cancelReady = null;
      map.setPaintProperty(
        BUILDING_3D_ID,
        "fill-extrusion-opacity",
        extrusionOpacity(theme),
      );
      for (const id of flatIds) map.setPaintProperty(id, "fill-opacity", 0);
    });
    return;
  }

  for (const id of flatIds) {
    const original = state.flatOriginals.get(id)?.opacity;
    map.setPaintProperty(id, "fill-opacity", original ?? 1);
  }
  map.setPaintProperty(BUILDING_3D_ID, "fill-extrusion-opacity", 0);
  const hide = () => {
    state.hideTimer = null;
    if (map.getLayer(BUILDING_3D_ID)) {
      map.setLayoutProperty(BUILDING_3D_ID, "visibility", "none");
    }
  };
  if (duration === 0) hide();
  // Stop paying for extrusion draw calls, but only after it has faded out.
  else state.hideTimer = setTimeout(hide, duration);
}

export const __internal = { ENABLE_TERRAIN };
