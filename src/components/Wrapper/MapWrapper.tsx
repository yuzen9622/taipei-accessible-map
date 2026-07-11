import useMapStore from "@/stores/useMapStore";
import RoutePlanInput from "../Input/PlanInput";

export default function MapWrapper() {
  const { selectRoute, isNavigating } = useMapStore();

  if (!selectRoute || isNavigating) return null;

  return (
    <div className="fixed inset-x-2 top-5 z-30 flex justify-center pointer-events-none">
      <span className="flex h-fit items-center gap-2 w-full max-w-[450px] pointer-events-auto">
        <RoutePlanInput />
      </span>
    </div>
  );
}
