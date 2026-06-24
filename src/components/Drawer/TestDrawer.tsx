"use client";

import { Loader2, Share2, X } from "lucide-react";

import { useCallback } from "react";

import useComputeRoute from "@/hook/useComputeRoute";

import useMapStore from "@/stores/useMapStore";
import type { LatLng } from "@/types";
import { Button } from "../ui/button";
import { DrawerFooter } from "../ui/drawer";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import { useAppTranslation } from "@/i18n/client";
import GeocoderDrawerContent from "../GeocoderDrawerContent";
import PlaceDrawerContent from "../PlaceDrawerContent";
import LoadingDrawer from "../shared/LoadingDrawer";
import DrawerWrapper from "../Wrapper/DrawerWrapper";

export default function TestDrawer() {
  const {
    infoShow,
    setInfoShow,
    setSearchPlace,
    setDestination,
    userLocation,
  } = useMapStore();
  const { t } = useAppTranslation("translation");
  const { isLoading, handleComputeRoute } = useComputeRoute();

  const handlePlanRoute = useCallback(async () => {
    if (!infoShow.kind) return;
    let latLng: LatLng | null = null;
    if (infoShow.kind === "place") {
      const place = infoShow.place;
      const lat = parseFloat(place.lat);
      const lng = parseFloat(place.lon);
      latLng = { lat, lng };
      setDestination({
        kind: "place",
        place,
        position: latLng,
      });
    } else if (infoShow.kind === "coordinate") {
      latLng = infoShow.position ?? userLocation ?? { lat: 25.0478, lng: 121.5319 };
      setDestination({
        kind: "coordinate",
        address: infoShow.address,
        position: latLng,
      });
    }

    await handleComputeRoute({
      origin: userLocation ?? { lat: 25.0478, lng: 121.5319 },
      destination: latLng ?? undefined,
    });
    setSearchPlace(null);
    setInfoShow({ isOpen: false });
  }, [
    userLocation,
    infoShow,
    setSearchPlace,
    setDestination,
    handleComputeRoute,
    setInfoShow,
  ]);

  return (
    <DrawerWrapper zIndex={20} id="info-drawer" open={infoShow.isOpen}>
      <Button
        aria-label="Close drawer"
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
          {infoShow.kind === "coordinate" && (
            <GeocoderDrawerContent address={infoShow.address} />
          )}
          <DrawerFooter className="bg-background/95 backdrop-blur-md border-t w-full border-border py-3 flex justify-end gap-2">
            <Button
              aria-label="Plan route"
              disabled={isLoading}
              onClick={handlePlanRoute}
              className="flex-1"
            >
              {isLoading ? t("loadingRoute") : t("planRoute")}
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!infoShow.kind) return;
                  try {
                    let url = "https://www.openstreetmap.org";
                    if (infoShow.kind === "place") {
                      const place = infoShow.place;
                      if (place.osm_id && place.osm_type) {
                        url = `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`;
                      } else {
                        url = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=18/${place.lat}/${place.lon}`;
                      }
                    } else if (infoShow.kind === "coordinate") {
                      url = `https://www.openstreetmap.org/#map=18/0/0`;
                    }

                    if (navigator.share) {
                      await navigator.share({ url });
                    } else if (navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(url);
                      alert("Link copied to clipboard");
                    } else {
                      window.open(url, "_blank");
                    }
                  } catch (err) {
                    console.error("Share failed", err);
                  }
                }}
                aria-label="Share route"
                variant="outline"
                size="icon"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </DrawerFooter>
        </div>
      )}
    </DrawerWrapper>
  );
}
