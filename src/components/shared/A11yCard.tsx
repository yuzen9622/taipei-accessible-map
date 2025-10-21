import { Loader2 } from "lucide-react";
import useComputeRoute from "@/hook/useComputeRoute";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import { A11yEnum, type Marker } from "@/types";
import { Button } from "../ui/button";

export default function A11yCard({ place }: { place: Marker }) {
  const {
    setA11yDrawerOpen,

    map,
  } = useMapStore();
  const { t } = useAppTranslation("translation");
  const { handleComputeRoute, isLoading } = useComputeRoute();
  const type = {
    [A11yEnum.ELEVATOR]: t("elevator"),
    [A11yEnum.RAMP]: t("ramp"),
    [A11yEnum.RESTROOM]: t("toilet"),
  } as Record<A11yEnum, string>;
  return (
    <div
      key={place.id}
      className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm">{place.content?.title}</h4>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
          {type[place.a11yType as A11yEnum]}
        </span>
      </div>

      {place.content?.desc && (
        <p className="text-xs text-muted-foreground mb-2">
          {place.content.desc}
        </p>
      )}

      <div className="text-xs text-muted-foreground">
        <p>
          位置: {place.position.lat.toFixed(6)}, {place.position.lng.toFixed(6)}
        </p>
      </div>
      <div className="flex  gap-2 ">
        <Button
          aria-label="Plan route"
          variant="default"
          size="sm"
          className="mt-2 flex-1"
          onClick={async () => {
            // 可以在這裡加上點擊後的動作，例如在地圖上聚焦到該位置

            await handleComputeRoute({
              destination: place.position,
            });
            setA11yDrawerOpen(false);
          }}
        >
          {isLoading ? t("loadingRoute") : t("planRoute")}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </Button>

        <Button
          aria-label="View on map"
          variant="outline"
          size="sm"
          className="mt-2 flex-1"
          onClick={() => {
            // 可以在這裡加上點擊後的動作，例如在地圖上聚焦到該位置
            console.log("Navigate to:", place.position);
            map?.setCenter(place.position);
            map?.setZoom(18);
          }}
        >
          {t("viewOnMap")}
        </Button>
      </div>
    </div>
  );
}
