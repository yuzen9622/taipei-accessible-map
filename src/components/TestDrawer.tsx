"use client";

import { Heart, Loader2, Share2, X } from "lucide-react";

import { useCallback } from "react";

import useComputeRoute from "@/hook/useComputeRoute";

import useMapStore from "@/stores/useMapStore";
import { Button } from "./ui/button";
import { DrawerFooter } from "./ui/drawer";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import { useAppTranslation } from "@/i18n/client";
import DrawerWrapper from "./DrawerWrapper";
import GeocoderDrawerContent from "./GeocoderDrawerContent";
import PlaceDrawerContent from "./PlaceDrawerContent";
import LoadingDrawer from "./shared/LoadingDrawer";

export default function TestDrawer() {
  const {
    infoShow,
    setInfoShow,
    setSearchPlace,
    setRouteInfoShow,
    setDestination,
    userLocation,
  } = useMapStore();
  const { t } = useAppTranslation("translation");
  const { isLoading, computeRouteService } = useComputeRoute();

  const handlePlanRoute = useCallback(async () => {
    if (!infoShow.kind) return;
    let latLng: google.maps.LatLngLiteral | null = null;
    if (infoShow.kind === "place") {
      const place = infoShow.place;
      if (!place.location) return;
      latLng = place.location.toJSON();
      setDestination({
        kind: "place",
        place,
        position: latLng,
      });
    } else {
      latLng = infoShow.place.geometry.location.toJSON();
      setDestination({
        kind: "geocoder",
        place: infoShow.place,
        position: latLng,
      });
    }

    await computeRouteService(
      userLocation ?? { lat: 25.0478, lng: 121.5319 },
      latLng
    );
    setSearchPlace(null);
    setInfoShow({ isOpen: false, kind: null });
    setRouteInfoShow(true);
  }, [
    userLocation,

    infoShow,
    setDestination,
    computeRouteService,
    setInfoShow,
    setSearchPlace,
    setRouteInfoShow,
  ]);

  return (
    <DrawerWrapper open={infoShow.isOpen}>
      <Button
        onClick={() => {
          setInfoShow({ isOpen: false });
          setSearchPlace(null);
        }}
        size="icon"
        variant="ghost"
        className="absolute  bg-secondary  z-20 rounded-3xl  right-8 top-4"
      >
        <X className="h-5 w-5" />
      </Button>
      {!infoShow.kind ? (
        <LoadingDrawer />
      ) : (
        <div className=" relative flex flex-col overflow-auto flex-1">
          {infoShow.kind === "place" && (
            <PlaceDrawerContent place={infoShow.place} />
          )}
          {infoShow.kind === "geocoder" && (
            <GeocoderDrawerContent geocoder={infoShow.place} />
          )}
          <DrawerFooter className="bg-background/95 backdrop-blur-md border-t w-full border-border py-3 flex justify-end gap-2">
            <Button
              disabled={isLoading}
              onClick={handlePlanRoute}
              className="flex-1"
            >
              {isLoading ? "規劃中" : t("planRoute")}
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Heart className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </DrawerFooter>
        </div>
      )}
    </DrawerWrapper>
  );
}
