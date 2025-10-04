"use client";

import {
  Accessibility,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Globe,
  Heart,
  MapPin,
  NavigationIcon,
  ParkingCircle,
  Phone,
  Share2,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import useComputeRoute from "@/hook/useComputeRoute";
import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import { Button } from "./ui/button";
import { DrawerFooter, DrawerHeader } from "./ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import DrawerWrapper from "./DrawerWrapper";

export default function TestDrawer() {
  const {
    infoShow,
    setInfoShow,
    setSearchPlace,
    setRouteInfoShow,
    setDestination,
    toggleInfoShow,
    map,
  } = useMapStore();
  const { isLoading, computeRouteService } = useComputeRoute();
  const [isOpen, setIsOpen] = useState(false);

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
    if (!latLng || !map) return;
    console.log(place);
    await computeRouteService({ lat: 25.0475613, lng: 121.5173399 }, latLng);

    setDestination({ kind: "place", place, position: latLng });
    setSearchPlace(null);
    setInfoShow({ isOpen: false, kind: null });
    setRouteInfoShow(true);
  }, [
    place,
    setDestination,
    computeRouteService,
    setInfoShow,
    setSearchPlace,
    setRouteInfoShow,
    map,
  ]);

  return (
    <DrawerWrapper open={infoShow.isOpen} onOpenChange={toggleInfoShow}>
      {place && (
        <div className="flex flex-col overflow-auto h-full">
          <Swiper
            pagination={{
              type: "bullets",
            }}
            navigation={true}
            className="w-full min-h-60"
            modules={[Pagination]}
          >
            {galleryImages.map((src, idx) => (
              <SwiperSlide className="" key={src}>
                <div className=" w-full flex  justify-center   h-full  overflow-hidden  shadow-md">
                  <Image
                    src={src}
                    alt={`店家圖片 ${idx + 1}`}
                    width={400}
                    height={300}
                    className="object-cover w-full  max-w-lg h-full"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <DrawerHeader className="w-full flex flex-col gap-2 border-b  border-border/50  py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {place.svgIconMaskURI ? (
                  <Image
                    src={place.svgIconMaskURI}
                    alt="店家圖示"
                    width={24}
                    height={24}
                    className="object-contain  "
                  />
                ) : (
                  <MapPin className="h-6 w-6 text-primary" />
                )}

                <h1 className="text-xl font-bold  line-clamp-2">
                  {place.displayName}
                </h1>
              </div>
              <Button
                onClick={() => setInfoShow({ ...infoShow, isOpen: false })}
                size="icon"
                variant="ghost"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {place.formattedAddress}
            </p>
            <span
              className={`inline-block w-fit px-2 py-1 mt-1 rounded text-white text-xs font-medium ${
                isOpen ? "bg-green-500" : "bg-gray-400"
              }`}
            >
              {isOpen ? "營業中" : "休息中"}
            </span>

            <Tabs defaultValue="map" className="w-full  bg-transparent">
              <TabsList className="w-full border-b border-border  bg-transparent  rounded-none">
                <TabsTrigger
                  value="map"
                  className="  border-0 border-b-2 shadow-none! data-[state=active]:border-b-2! rounded-none data-[state=active]:border-blue-400"
                >
                  總覽
                </TabsTrigger>
                {place.types?.includes("restaurant") && (
                  <TabsTrigger
                    className="  border-0 border-b-2 shadow-none! data-[state=active]:border-b-2! rounded-none data-[state=active]:border-blue-400"
                    value="menu"
                  >
                    菜單
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="reviews"
                  className="  border-0 border-b-2 shadow-none! data-[state=active]:border-b-2! rounded-none data-[state=active]:border-blue-400"
                >
                  評論
                </TabsTrigger>
                <TabsTrigger
                  value="facilities"
                  className="  border-0 border-b-2 shadow-none! data-[state=active]:border-b-2! rounded-none data-[state=active]:border-blue-400"
                >
                  無障礙設施
                </TabsTrigger>
              </TabsList>
              {/* 總覽內容 */}
              <TabsContent value="map" className="w-full px-4 py-4 space-y-4">
                {/* 簡介 */}
                {place.editorialSummary && (
                  <div className="space-y-2">
                    <div className=" font-semibold">簡介</div>
                    <p className="text-sm  leading-relaxed">
                      {place.editorialSummary}
                    </p>
                  </div>
                )}
                {/* 評分與評論 */}
                {place.rating && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-bold">
                        {place.rating.toFixed(1)}
                      </span>
                    </div>
                    {place.userRatingCount && (
                      <span className="text-sm text-muted-foreground">
                        ({place.userRatingCount.toLocaleString()} 則評論)
                      </span>
                    )}
                  </div>
                )}
                {/* 營業時間 */}
                {placeHours?.weekdayDescriptions && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>營業時間</span>
                    </div>
                    <div className="pl-6 space-y-1">
                      {placeHours.weekdayDescriptions.map((desc, idx) => (
                        <p
                          key={`${idx + 1}${desc}`}
                          className="text-sm text-muted-foreground"
                        >
                          {desc}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {/* 聯絡資訊 */}
                <div className="space-y-3">
                  {place.nationalPhoneNumber && (
                    <a
                      href={`tel:${place.nationalPhoneNumber}`}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Phone
                        size={20}
                        className="min-h-2 min-w-2 text-primary"
                      />
                      <span className="text-sm">
                        {place.nationalPhoneNumber}
                      </span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </a>
                  )}

                  {place.websiteURI && (
                    <a
                      href={place.websiteURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Globe size={20} className="text-primary" />
                      <span className="text-sm truncate flex-1">
                        {place.websiteURI}
                      </span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </a>
                  )}

                  {place.googleMapsURI && (
                    <a
                      href={place.googleMapsURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <NavigationIcon
                        size={20}
                        className="min-h-2 min-w-2  text-primary"
                      />
                      <span className="text-sm">在 Google Maps 中查看</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </a>
                  )}
                </div>
                {/* 設施與服務 */}
                {(place.accessibilityOptions ||
                  place.parkingOptions ||
                  place.paymentOptions) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span>設施與服務</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {place.accessibilityOptions
                        ?.hasWheelchairAccessibleEntrance && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Accessibility className="h-4 w-4 text-green-600" />
                          <span className="text-xs">無障礙入口</span>
                        </div>
                      )}
                      {place.parkingOptions?.hasPaidParkingLot && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <ParkingCircle className="h-4 w-4 text-blue-600" />
                          <span className="text-xs">付費停車場</span>
                        </div>
                      )}
                      {place.paymentOptions?.acceptsCreditCards && (
                        <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <CreditCard className="h-4 w-4 text-purple-600" />
                          <span className="text-xs">接受信用卡</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* 價格等級 */}
                {place.priceLevel && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-sm">價格等級</span>
                    <span className="ml-auto text-sm font-medium">
                      {place.priceLevel}
                    </span>
                  </div>
                )}
                {/* 類型標籤 */}
                {place.types && place.types.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">類型</div>
                    <div className="flex flex-wrap gap-2">
                      {place.types.slice(0, 5).map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {type.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 菜單內容 */}
              <TabsContent value="menu" className="w-full px-4 py-4">
                <p className="text-sm text-muted-foreground">
                  菜單資訊載入中...
                </p>
              </TabsContent>

              {/* 評論內容 */}
              <TabsContent value="reviews" className="w-full px-4 py-4">
                {place.reviews && place.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {place.reviews.map((review) => (
                      <div
                        key={`review-${Math.random()}`}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {review.rating}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {review.authorAttribution?.displayName}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {review.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">尚無評論</p>
                )}
              </TabsContent>

              {/* 無障礙設施內容 */}
              <TabsContent value="facilities" className="w-full px-4 py-4">
                {place.accessibilityOptions ? (
                  <div className="space-y-3">
                    {place.accessibilityOptions
                      .hasWheelchairAccessibleEntrance !== undefined && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">無障礙入口</span>
                        <span
                          className={`text-sm font-medium ${
                            place.accessibilityOptions
                              .hasWheelchairAccessibleEntrance
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {place.accessibilityOptions
                            .hasWheelchairAccessibleEntrance
                            ? "有"
                            : "無"}
                        </span>
                      </div>
                    )}
                    {place.accessibilityOptions
                      .hasWheelchairAccessibleParking !== undefined && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">無障礙停車位</span>
                        <span
                          className={`text-sm font-medium ${
                            place.accessibilityOptions
                              .hasWheelchairAccessibleParking
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {place.accessibilityOptions
                            .hasWheelchairAccessibleParking
                            ? "有"
                            : "無"}
                        </span>
                      </div>
                    )}
                    {place.accessibilityOptions
                      .hasWheelchairAccessibleRestroom !== undefined && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">無障礙洗手間</span>
                        <span
                          className={`text-sm font-medium ${
                            place.accessibilityOptions
                              .hasWheelchairAccessibleRestroom
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {place.accessibilityOptions
                            .hasWheelchairAccessibleRestroom
                            ? "有"
                            : "無"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    無障礙設施資訊尚未提供
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </DrawerHeader>
          {/* Footer */}
          <DrawerFooter className="bg-background/95 backdrop-blur-md border-t w-full border-border py-3 flex justify-end gap-2">
            <Button
              disabled={isLoading}
              onClick={handlePlanRoute}
              className="flex-1"
            >
              {isLoading ? "規劃中..." : "規劃路線"}
            </Button>
            <span className="space-x-4">
              <Button variant="outline" size="icon">
                <Heart className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </span>
          </DrawerFooter>
        </div>
      )}
    </DrawerWrapper>
  );
}
