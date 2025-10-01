"use client";

import { Heart, MapPin, Share2, Star, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import DrawerWrapper from "@/components/DrawerWrapper";
import LoadingDrawer from "@/components/shared/LoadingDrawer";
import useComputeRoute from "@/hook/useComputeRoute";
import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import {
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";

type TabType = "map" | "menu" | "reviews" | "facilities";

export default function InfoDrawer() {
  const {
    infoShow,
    setInfoShow,
    userLocation,
    setRouteInfoShow,
    setDestination,
    map,
  } = useMapStore();
  const { isLoading, computeRouteService } = useComputeRoute();
  const [isOpen, setIsOpen] = useState(false);

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [tab, setTab] = useState<TabType>("map");

  const place = infoShow.kind === "place" ? infoShow.place : null;

  const galleryImages = useMemo(() => {
    if (!place?.photos) return [];
    return place.photos.map((p) => p.getURI({ maxWidth: 400, maxHeight: 300 }));
  }, [place]);

  const placeHours = useMemo(() => {
    if (!place?.regularOpeningHours) return null;
    return place.regularOpeningHours;
  }, [place]);

  useEffect(() => {
    let cancelled = false;
    if (!place?.isOpen) {
      setIsOpen(false);
      return;
    }
    place.isOpen().then((b: boolean | null | undefined) => {
      if (!cancelled) setIsOpen(Boolean(b));
    });
    return () => {
      cancelled = true;
    };
  }, [place]);

  const handlePlanRoute = useCallback(async () => {
    if (!place) return;
    const latLng = getLocation(place);
    if (!latLng || !userLocation || !map) return;

    await computeRouteService({ lat: 25.0475613, lng: 121.5173399 }, latLng);

    setDestination({ kind: "place", place, position: latLng });

    setInfoShow({ isOpen: false, kind: null });
    setRouteInfoShow(true);
  }, [
    place,
    setDestination,
    computeRouteService,
    setInfoShow,
    setRouteInfoShow,
    map,
    userLocation,
  ]);

  const renderMenuTab = () => {
    if (!place) return null;

    switch (place.type) {
      case "restaurant":
        return (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-4 border rounded-lg p-3 shadow-md bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50"
              >
                <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    餐點名稱 {idx + 1}
                  </h3>
                  <p className="text-gray-500 text-sm">描述 / 備註</p>
                  <p className="text-blue-600 font-bold mt-1">
                    ${120 + idx * 30}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );
      case "attraction":
        return (
          <div className="space-y-3">
            {Array.from({ length: 2 }, (_, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-3 shadow-md bg-gradient-to-r from-pink-50 via-pink-100 to-pink-50"
              >
                <h3 className="font-semibold text-gray-800">
                  票券名稱 {idx + 1}
                </h3>
                <p className="text-gray-500 text-sm">票種 / 時間說明</p>
                <p className="text-blue-600 font-bold mt-1">$300</p>
              </div>
            ))}
          </div>
        );
      case "store":
        return (
          <div className="space-y-3">
            {Array.from({ length: 2 }, (_, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-4 border rounded-lg p-3 shadow-md bg-gradient-to-r from-green-50 via-green-100 to-green-50"
              >
                <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    商品 {idx + 1}
                  </h3>
                  <p className="text-gray-500 text-sm">商品描述</p>
                  <p className="text-blue-600 font-bold mt-1">$200</p>
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return <p className="text-gray-500">無相關資訊</p>;
    }
  };

  return (
    <DrawerWrapper
      open={infoShow.isOpen}
      snapPoints={["400px", 1]}
      onOpenChange={(b) => setInfoShow({ ...infoShow, isOpen: b })}
    >
      {place ? (
        <DrawerContent
          className="
            fixed flex flex-col gap-4 items-center lg:items-start z-20 overflow-auto
            backdrop-blur-md bg-background/95 border-t border-border shadow-xl rounded-t-2xl
          "
        >
          {/* Header */}
          <DrawerHeader className="w-full flex flex-col gap-2 border-b border-border/50 px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="text-primary" />
                <DrawerTitle className="text-xl font-bold">
                  {place.displayName}
                </DrawerTitle>
              </div>
              <Button
                onClick={() => setInfoShow({ ...infoShow, isOpen: false })}
                size="icon"
                variant="ghost"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <DrawerDescription className="text-sm text-muted-foreground">
              {place.formattedAddress}
            </DrawerDescription>
            <span
              className={`inline-block w-fit px-2 py-1 mt-1 rounded text-white text-xs font-medium ${
                isOpen ? "bg-green-500" : "bg-gray-400"
              }`}
            >
              {isOpen ? "營業中" : "休息中"}
            </span>
          </DrawerHeader>

          {/* 圖片輪播 */}
          {galleryImages.length > 0 && (
            <div className="relative w-full max-w-lg aspect-video rounded-lg overflow-hidden mt-2 shadow-md">
              <Image
                src={galleryImages[galleryIndex]}
                alt={`店家圖片 ${galleryIndex + 1}`}
                width={400}
                height={300}
                className="object-cover w-full h-full"
              />
              {galleryImages.length > 1 && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {galleryImages.map((_, idx) => (
                    <button
                      type="button"
                      key={galleryIndex}
                      className={`w-3 h-3 rounded-full ${
                        idx === galleryIndex ? "bg-blue-500" : "bg-gray-300"
                      }`}
                      onClick={() => setGalleryIndex(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b mt-4 w-full px-4">
            {(["map", "menu", "reviews", "facilities"] as TabType[]).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-center transition-colors ${
                    tab === t
                      ? "border-b-2 border-blue-500 font-semibold text-blue-600"
                      : "text-gray-500 hover:text-blue-400"
                  }`}
                >
                  {t === "map"
                    ? "總覽"
                    : t === "menu"
                    ? place.type === "attraction"
                      ? "票券"
                      : place.type === "store"
                      ? "商品"
                      : "菜單"
                    : t === "reviews"
                    ? "評論"
                    : "附近無障礙"}
                </button>
              )
            )}
          </div>

          {/* Content */}
          <div className="w-full mt-2 px-4 pb-24">
            {tab === "map" && (
              <p className="text-gray-700">地圖總覽區（可串 Google Map）</p>
            )}
            {tab === "menu" && renderMenuTab()}
            {tab === "reviews" && (
              <div className="space-y-2 text-sm">
                {Array.from({ length: 2 }, (_, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-3 shadow-sm bg-gray-50"
                  >
                    <p className="font-semibold">使用者 {idx + 1}</p>
                    <div className="flex items-center space-x-1 text-yellow-400">
                      {Array.from({ length: 5 }).map((__, i) => (
                        <Star key={i} size={14} />
                      ))}
                    </div>
                    <p className="text-gray-600">評論內容示意文字...</p>
                  </div>
                ))}
              </div>
            )}
            {tab === "facilities" && (
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  無障礙入口：
                  {place.accessibilityOptions?.hasWheelchairAccessibleEntrance
                    ? "有"
                    : "無"}
                </p>
                <p>
                  無障礙停車：
                  {place.accessibilityOptions?.hasWheelchairAccessibleParking
                    ? "有"
                    : "無"}
                </p>
                <p>
                  無障礙衛生間：
                  {place.accessibilityOptions?.hasWheelchairAccessibleRestroom
                    ? "有"
                    : "無"}
                </p>
                <p>
                  無障礙座位：
                  {place.accessibilityOptions?.hasWheelchairAccessibleSeating
                    ? "有"
                    : "無"}
                </p>
              </div>
            )}

            {/* 營業時間 Accordion */}
            {placeHours && (
              <Accordion type="single" collapsible className="w-full mt-3">
                <AccordionItem value="hours">
                  <AccordionTrigger>
                    {isOpen ? "營業中" : "休息中"} - 營業時間
                  </AccordionTrigger>
                  <AccordionContent>
                    {placeHours.periods.map((period, idx) => (
                      <p key={idx} className="text-sm">
                        {period.open?.day} {period.open?.hour}:
                        {period.open?.minute} - {period.close?.hour}:
                        {period.close?.minute}
                      </p>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>

          {/* Footer */}
          <DrawerFooter className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 flex justify-end gap-2">
            <Button
              disabled={isLoading}
              onClick={handlePlanRoute}
              className="flex-1"
            >
              {isLoading ? "規劃中..." : "規劃路線"}
            </Button>
            <Button variant="outline" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </DrawerFooter>
        </DrawerContent>
      ) : (
        <LoadingDrawer />
      )}
    </DrawerWrapper>
  );
}
