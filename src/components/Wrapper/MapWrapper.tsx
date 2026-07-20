import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import RoutePlanInput from "../Input/PlanInput";

export default function MapWrapper() {
  const { selectRoute, isNavigating, sidebarCollapsed, activeRailPanel } =
    useMapStore(
      useShallow((s) => ({
        selectRoute: s.selectRoute,
        isNavigating: s.isNavigating,
        sidebarCollapsed: s.sidebarCollapsed,
        activeRailPanel: s.activeRailPanel,
      })),
    );

  if (!selectRoute || isNavigating) return null;

  const panelOpen = activeRailPanel !== "none" && !sidebarCollapsed;

  return (
    <div
      className={cn(
        "hidden lg:flex fixed top-5 right-2 left-2 z-30 justify-center pointer-events-none",
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
