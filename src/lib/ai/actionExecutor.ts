import useMapStore from "@/stores/useMapStore";
import {
  extendBounds,
  fitRouteBounds,
  routeBoundsFromLegs,
} from "@/lib/mapCamera";
import type { UIAction, ActionResult } from "./uiAction";

export function executeAction(action: UIAction): ActionResult {
  const s = useMapStore.getState();

  switch (action.type) {
    case "show-markers":
      s.setAiResultMarkers(action.markers);
      return { ok: true };

    case "clear-markers":
      s.setAiResultMarkers([]);
      return { ok: true };

    case "fly-to":
      s.map?.flyTo({
        center: [action.position.lng, action.position.lat],
        zoom: action.zoom ?? 17,
      });
      return { ok: true };

    case "show-route": {
      const { routes, origin, destination } = action;
      if (!routes.length) return { ok: false, skipped: "empty routes" };

      s.setComputeRoutes(routes);
      s.setRouteSelect({ index: 0, route: routes[0] });
      s.setRouteInfoShow(true);

      if (s.map) {
        const bounds = routeBoundsFromLegs(routes[0].legs);
        if (bounds.isEmpty() && origin && destination) {
          extendBounds(bounds, origin.lng, origin.lat);
          extendBounds(bounds, destination.lng, destination.lat);
        }
        fitRouteBounds(s.map, bounds);
      }
      return { ok: true };
    }

    case "compute-route":
      return { ok: false, skipped: "async-needs-caller" };

    case "switch-panel":
      s.setSheetMode(action.sheet);
      return { ok: true };

    case "close-chat":
      s.setChatOpen(false);
      return { ok: true };

    default:
      return {
        ok: false,
        skipped: `unknown action: ${(action as any).type}`,
      };
  }
}
