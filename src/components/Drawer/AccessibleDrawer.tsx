"use client";

import { X } from "lucide-react";

import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import { A11yEnum } from "@/types/index";
import A11yCard from "../shared/A11yCard";
import { Button } from "../ui/button";
import DrawerWrapper from "../Wrapper/DrawerWrapper";
export default function AccessibleDrawer() {
  const {
    selectedA11yTypes,
    a11yDrawerOpen,
    setA11yDrawerOpen,
    toggleA11yType,
    routeA11y,

    a11yPlaces,
  } = useMapStore();
  const { t } = useAppTranslation("translation");

  const filteredPlaces =
    a11yPlaces?.filter((place) => selectedA11yTypes.includes(place.a11yType)) ||
    routeA11y ||
    [];

  const getA11yTypeDescription = (type: A11yEnum) => {
    switch (type) {
      case A11yEnum.ELEVATOR:
        return {
          title: t("accessibleElevator"),
          description: t("elevatorDesc"),
        };
      case A11yEnum.RAMP:
        return {
          title: t("accessibleRamp"),
          description: t("rampDesc"),
        };
      case A11yEnum.RESTROOM:
        return {
          title: t("accessibleToilet"),
          description: t("toiletDesc"),
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
          <h1 className="text-lg font-semibold">{t("accessibleTitle")}</h1>
          <Button
            aria-label="Close accessibility options"
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
            <p className="text-muted-foreground">{t("selectAccessible")}</p>
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
                  <A11yCard key={place.id} place={place} />
                ))}
            </div>
          )}
        </div>
      </div>
    </DrawerWrapper>
  );
}
