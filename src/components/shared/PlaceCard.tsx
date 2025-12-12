"use client";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import useComputeRoute from "@/hook/useComputeRoute";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import type { GooglePlaceResult } from "@/types/transit";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "../ui/card";

export default function PlaceCard({
  name,
  place_id,
  formatted_address,
  rating,
  location,
}: GooglePlaceResult) {
  const placesLib = useMapsLibrary("places");
  const {
    setInfoShow,
    setDestination,
    setA11yDrawerOpen,
    setSearchPlace,
    map,
  } = useMapStore();
  const { userConfig } = useAuthStore();
  const { handleComputeRoute } = useComputeRoute();
  return (
    <Card className="hover:bg-muted/50">
      <CardHeader className="flex justify-between">
        <div>
          <h1>{name}</h1>
          <CardDescription>{formatted_address}</CardDescription>
        </div>
        <Badge className="text-sm shrink-0 bg-yellow-500 text-white">
          評分: {rating}
        </Badge>
      </CardHeader>
      <CardContent>
        <CardAction className="flex w-full  justify-between">
          <Button
            onClick={async () => {
              if (!placesLib || !map) return;
              const { Place } = placesLib;
              const langPlace = new Place({
                id: place_id,
                requestedLanguage: userConfig.language,
              });

              await langPlace.fetchFields({ fields: ["*"] });
              map.setCenter({
                lat: location.latitude,
                lng: location.longitude,
              });
              setInfoShow({ isOpen: true, kind: "place", place: langPlace });
              setSearchPlace({
                kind: "place",
                place: langPlace,
                position: { lat: location.latitude, lng: location.longitude },
              });
            }}
          >
            查看詳情
          </Button>
          <Button
            onClick={async () => {
              if (!placesLib) return;
              const { Place } = placesLib;
              const langPlace = new Place({
                id: place_id,
                requestedLanguage: userConfig.language,
              });

              await langPlace.fetchFields({ fields: ["*"] });
              setDestination({
                kind: "place",
                place: langPlace,
                position: { lat: location.latitude, lng: location.longitude },
              });
              await handleComputeRoute({
                destination: {
                  lat: location.latitude,
                  lng: location.longitude,
                },
              });
              setA11yDrawerOpen(false);
            }}
            variant={"secondary"}
            className="border"
          >
            規劃路線
          </Button>
        </CardAction>
      </CardContent>
    </Card>
  );
}
