"use client";

import { X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import { A11yEnum, type Marker } from "@/types/index";
import A11yCard from "../shared/A11yCard";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import DrawerWrapper from "../Wrapper/DrawerWrapper";
export default function AccessibleDrawer() {
  const {
    selectedA11yTypes,
    a11yDrawerOpen,
    setA11yDrawerOpen,
    toggleA11yType,
    routeA11y,
    setSelectA11yPlace,
    a11yPlaces,
  } = useMapStore(
    useShallow((s) => ({
      selectedA11yTypes: s.selectedA11yTypes,
      a11yDrawerOpen: s.a11yDrawerOpen,
      setA11yDrawerOpen: s.setA11yDrawerOpen,
      toggleA11yType: s.toggleA11yType,
      routeA11y: s.routeA11y,
      setSelectA11yPlace: s.setSelectA11yPlace,
      a11yPlaces: s.a11yPlaces,
    })),
  );
  const { t } = useAppTranslation("translation");
  const [searchTerm, setSearchTerm] = useState("");

  const searchToA11yPlaces = useCallback((term: string, place: Marker) => {
    if (term.trim() === "") return true;
    return place.content?.title.includes(term);
  }, []);

  const filteredPlaces = useMemo(() => {
    if (routeA11y.length > 0) return routeA11y;
    return (
      a11yPlaces?.filter(
        (place) =>
          selectedA11yTypes.has(place.a11yType) &&
          searchToA11yPlaces(searchTerm, place),
      ) ?? []
    );
  }, [
    routeA11y,
    a11yPlaces,
    selectedA11yTypes,
    searchTerm,
    searchToA11yPlaces,
  ]);

  const MAX_VISIBLE = 100;
  const visiblePlaces = useMemo(
    () => filteredPlaces.slice(0, MAX_VISIBLE),
    [filteredPlaces],
  );

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
          title: t("a11yDefaultTitle"),
          description: t("a11yDefaultDesc"),
        };
    }
  };

  return (
    <DrawerWrapper zIndex={30} open={a11yDrawerOpen}>
      <div className="p-4 space-y-4 flex flex-col overflow-hidden">
        <span className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{t("accessibleTitle")}</h1>
          <Button
            aria-label="Close accessibility options"
            variant="outline"
            onClick={() => {
              setA11yDrawerOpen(false);
              toggleA11yType(A11yEnum.NONE);
              setSelectA11yPlace(null);
            }}
          >
            <X />
          </Button>
        </span>
        <div>
          <Input
            placeholder={t("searchA11yPlaceholder")}
            onChange={(e) => setSearchTerm(e.target.value)}
            value={searchTerm}
          />
        </div>
        <div className=" flex-1 overflow-y-auto ">
          <div className="space-y-4  overflow-auto">
            {Array.from(selectedA11yTypes).map((type) => {
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
            {visiblePlaces.length > 0 &&
              visiblePlaces.map((place) => (
                <A11yCard key={place.id} place={place} />
              ))}
            {filteredPlaces.length > MAX_VISIBLE && (
              <p className="text-xs text-center text-muted-foreground py-2">
                {`顯示前 ${MAX_VISIBLE} 筆，共 ${filteredPlaces.length} 筆`}
              </p>
            )}
          </div>
        </div>
      </div>
    </DrawerWrapper>
  );
}
