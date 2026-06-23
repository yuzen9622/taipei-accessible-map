"use client";
import useComputeRoute from "@/hook/useComputeRoute";
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
  formatted_address,
  rating,
  location,
}: GooglePlaceResult) {
  const {
    setInfoShow,
    setDestination,
    setA11yDrawerOpen,
    setSearchPlace,
    map,
  } = useMapStore();
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
            onClick={() => {
              if (!map) return;
              const position = {
                lat: location.latitude,
                lng: location.longitude,
              };
              map.setCenter([position.lng, position.lat]);
              map.setZoom(16);
              setInfoShow({
                isOpen: true,
                kind: "coordinate",
                address: formatted_address,
              });
              setSearchPlace({
                kind: "coordinate",
                address: formatted_address,
                position,
              });
            }}
          >
            查看詳情
          </Button>
          <Button
            onClick={async () => {
              const position = {
                lat: location.latitude,
                lng: location.longitude,
              };
              setDestination({
                kind: "coordinate",
                address: formatted_address,
                position,
              });
              await handleComputeRoute({
                destination: position,
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
