import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import RoutePlanInput from "../Input/PlanInput";

export default function MapWrapper() {
  const { selectRoute, isNavigating, sidebarCollapsed, activeRailPanel } =
    useMapStore();

  if (!selectRoute || isNavigating) return null;

  // The desktop side panel (rail 68px + panel 380px) is a fixed overlay, so
  // the input card centers within the remaining map area instead of the full
  // viewport — otherwise the two collide when the panel is open.
  const panelOpen = activeRailPanel !== "none" && !sidebarCollapsed;

  return (
    <div
      className={cn(
        "fixed top-5 right-2 left-2 z-30 flex justify-center pointer-events-none",
        "transition-[left] duration-300 ease-out motion-reduce:transition-none",
        panelOpen ? "lg:left-[460px]" : "lg:left-[84px]",
        "lg:right-4",
      )}
    >
      <span className="flex h-fit items-center gap-2 w-full max-w-[450px] pointer-events-auto">
        <RoutePlanInput />
      </span>
    </div>
  );
}
