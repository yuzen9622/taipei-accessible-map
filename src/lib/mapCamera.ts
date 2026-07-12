import type maplibregl from "maplibre-gl";
import { LngLatBounds } from "maplibre-gl";
import useMapStore from "@/stores/useMapStore";
import type { RouteLeg } from "@/types/route";

// Desktop side panel is a fixed overlay (rail 68px + panel 380px + gap).
const DESKTOP_PANEL_OVERLAY_PX = 460;

function isValidLngLat(lng: unknown, lat: unknown): lng is number {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    Math.abs(lat as number) <= 90 &&
    Math.abs(lng as number) <= 180 &&
    // [0,0] is a common "missing data" sentinel from upstream sources —
    // letting it in drags the camera to the Gulf of Guinea.
    !((lng as number) === 0 && (lat as number) === 0)
  );
}

export function extendBounds(
  bounds: LngLatBounds,
  lng: unknown,
  lat: unknown,
) {
  if (isValidLngLat(lng, lat)) {
    bounds.extend([lng as number, lat as number]);
  }
}

export function routeBoundsFromLegs(legs: RouteLeg[]): LngLatBounds {
  const bounds = new LngLatBounds();
  for (const leg of legs) {
    for (const point of leg.polyline ?? []) {
      extendBounds(bounds, point?.[0], point?.[1]);
    }
  }
  return bounds;
}

/**
 * Fit the camera to route bounds without the two classic failure modes:
 * - a stale canvas size (panel/sheet just opened or the window resized)
 *   making MapLibre compute the zoom against the wrong viewport, which
 *   shows up as a wild zoom-out;
 * - fixed paddings that exceed the available canvas on small screens.
 * Padding also reserves space for the desktop overlay panel / mobile
 * bottom sheet so the route centers in the visible part of the map.
 */
export function fitRouteBounds(map: maplibregl.Map, bounds: LngLatBounds) {
  if (bounds.isEmpty()) return;

  const isRemoved = () => (map as unknown as { _removed?: boolean })._removed;

  try {
    if (isRemoved()) return;
    map.resize();
  } catch {
    return;
  }

  requestAnimationFrame(() => {
    try {
      if (isRemoved()) return;
      map.resize();
      const container = map.getContainer();
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const isDesktop = w >= 1024;

      const { activeRailPanel, sidebarCollapsed } = useMapStore.getState();
      const panelOverlay =
        isDesktop && activeRailPanel !== "none" && !sidebarCollapsed
          ? DESKTOP_PANEL_OVERLAY_PX
          : 0;

      let padding = {
        top: isDesktop ? 80 : 70,
        bottom: isDesktop ? 80 : Math.min(Math.round(h * 0.5), 360),
        left: panelOverlay + 40,
        right: isDesktop ? 60 : 40,
      };
      if (padding.left + padding.right > w - 120) {
        padding = { ...padding, left: 40, right: 40 };
      }
      if (padding.top + padding.bottom > h - 120) {
        padding = { ...padding, top: 40, bottom: Math.round(h * 0.3) };
      }

      try {
        map.fitBounds(bounds, { padding, maxZoom: 16.5, duration: 700 });
      } catch {
        map.fitBounds(bounds, { padding: 40, maxZoom: 16.5, duration: 700 });
      }
    } catch {
      // Map was torn down between frames — nothing to fit.
    }
  });
}
