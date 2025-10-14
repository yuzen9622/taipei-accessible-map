"use client";
import { X } from "lucide-react";
import useComputeRoute from "@/hook/useComputeRoute";
import useMapStore from "@/stores/useMapStore";
import { A11yEnum } from "@/types/index";
import DrawerWrapper from "./DrawerWrapper";
import { Button } from "./ui/button";

export default function AccessibleDrawer() {
  const {
    selectedA11yTypes,
    a11yDrawerOpen,
    setA11yDrawerOpen,
    toggleA11yType,
    routeA11y,

    a11yPlaces,
    map,
  } = useMapStore();
  const { handleComputeRoute } = useComputeRoute();
  const filteredPlaces =
    a11yPlaces?.filter((place) => selectedA11yTypes.includes(place.a11yType)) ||
    routeA11y ||
    [];

  const getA11yTypeDescription = (type: A11yEnum) => {
    switch (type) {
      case A11yEnum.ELEVATOR:
        return {
          title: "無障礙電梯",
          description:
            "提供輪椅使用者及行動不便人士垂直移動的設施，通常設置在捷運站出入口。",
        };
      case A11yEnum.RAMP:
        return {
          title: "無障礙斜坡",
          description:
            "提供輪椅使用者及推車通行的無障礙坡道，坡度符合無障礙設計規範。",
        };
      case A11yEnum.RESTROOM:
        return {
          title: "無障礙廁所",
          description: "設有無障礙設施的公共廁所，方便身心障礙者使用。",
        };
      default:
        return {
          title: "無障礙設施",
          description: "提供身心障礙者使用的相關設施。",
        };
    }
  };

  return (
    <DrawerWrapper open={a11yDrawerOpen}>
      <div className="p-4 space-y-4 flex flex-col overflow-hidden">
        <span className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">無障礙設施資訊</h1>
          <Button
            variant="outline"
            onClick={() => {
              setA11yDrawerOpen(false);
              toggleA11yType(A11yEnum.NONE);
            }}
          >
            <X />
          </Button>
        </span>
        <div className=" flex-1 overflow-y-auto ">
          {selectedA11yTypes.length === 0 ? (
            <p className="text-muted-foreground">
              請選擇要查看的無障礙設施類型
            </p>
          ) : (
            <div className="space-y-4  overflow-auto">
              {selectedA11yTypes.map((type) => {
                const info = getA11yTypeDescription(type);
                return (
                  <div key={type} className="border rounded-lg p-3">
                    <h3 className="font-medium mb-2">{info.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {info.description}
                    </p>
                  </div>
                );
              })}
              {filteredPlaces.length > 0 &&
                filteredPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">
                        {place.content?.title}
                      </h4>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                        {place.a11yType}
                      </span>
                    </div>

                    {place.content?.desc && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {place.content.desc}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground">
                      <p>
                        位置: {place.position.lat.toFixed(6)},{" "}
                        {place.position.lng.toFixed(6)}
                      </p>
                    </div>
                    <div className="flex  gap-2 ">
                      <Button
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
                        規劃路線
                      </Button>

                      <Button
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
                        查看位置
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </DrawerWrapper>
  );
}
