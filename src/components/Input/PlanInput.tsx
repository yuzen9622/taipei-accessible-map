"use client";
import {
  ArrowDownUpIcon,
  Loader2,
  Search,
  Bus,
  Car,
  Footprints,
  Bike,
  Accessibility,
  EyeOff,
  User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import useComputeRoute from "@/hook/useComputeRoute";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import PlaceInput from "../shared/PlaceInput";

export default function RoutePlanInput() {
  const {
    origin,
    destination,
    originName,
    destinationName,
    setOrigin,
    setDestination,
    setOriginName,
    setDestinationName,
  } = useMapStore();

  const { handleComputeRoute, isLoading } = useComputeRoute();
  const { t } = useAppTranslation();

  const [queryInput, setQueryInput] = useState("");
  const [mode, setMode] = useState<"structured" | "natural">("natural");
  const [travelMode, setTravelMode] = useState<"transit" | "drive" | "motorcycle" | "walk">("transit");
  const [a11yMode, setA11yMode] = useState<"normal" | "wheelchair" | "elderly" | "visual_impaired">("normal");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (origin?.kind === "place") {
      setOriginName(origin.place.name || origin.place.display_name || "");
    } else if (origin?.kind === "coordinate") {
      setOriginName(origin.address || "");
    }
  }, [origin, setOriginName]);

  useEffect(() => {
    if (destination?.kind === "place") {
      setDestinationName(
        destination.place.name || destination.place.display_name || "",
      );
    } else if (destination?.kind === "coordinate") {
      setDestinationName(destination.address || "");
    }
  }, [destination, setDestinationName]);

  const handleNaturalQuery = useCallback(async () => {
    const q = queryInput.trim();
    if (!q) return;
    await handleComputeRoute({ query: q, mode: a11yMode, travelMode });
  }, [queryInput, handleComputeRoute, a11yMode, travelMode]);

  const handleStructuredRoute = useCallback(async () => {
    if (!origin?.position && !destination?.position) return;
    await handleComputeRoute({
      origin: origin?.position,
      destination: destination?.position,
      mode: a11yMode,
      travelMode,
    });
  }, [origin, destination, handleComputeRoute, a11yMode, travelMode]);

  const handleSwitch = () => {
    const prevOriginName = originName;
    const prevDestName = destinationName;
    setOriginName(prevDestName);
    setDestinationName(prevOriginName);

    if (origin?.position && destination?.position) {
      handleComputeRoute({
        origin: destination.position,
        destination: origin.position,
        mode: a11yMode,
        travelMode,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (mode === "natural") {
        handleNaturalQuery();
      } else {
        handleStructuredRoute();
      }
    }
  };

  return (
    <Card
      className={cn(
        "w-full p-2 rounded-2xl transition-all pointer-events-auto gap-2",
      )}
    >
      <div className="flex gap-1 mb-2">
        <Button
          variant={mode === "natural" ? "default" : "outline"}
          size="sm"
          className="rounded-3xl text-xs h-7"
          onClick={() => setMode("natural")}
        >
          {t("naturalLanguage", "自然語言")}
        </Button>
        <Button
          variant={mode === "structured" ? "default" : "outline"}
          size="sm"
          className="rounded-3xl text-xs h-7"
          onClick={() => setMode("structured")}
        >
          {t("manualInput", "手動輸入")}
        </Button>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        {/* Transportation Mode */}
        <div className="flex gap-1 bg-muted/30 p-1 rounded-2xl w-fit">
          {[
            { id: "transit", icon: Bus, label: t("transit", "大眾運輸") },
            { id: "drive", icon: Car, label: t("drive", "開車") },
            { id: "motorcycle", icon: Bike, label: t("motorcycle", "機車") },
            { id: "walk", icon: Footprints, label: t("walk", "步行") },
          ].map((tm) => (
            <Button
              key={tm.id}
              variant={travelMode === tm.id ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 px-3 rounded-xl text-xs flex gap-1.5 transition-all",
                travelMode === tm.id ? "shadow-sm" : "text-muted-foreground hover:bg-muted/80"
              )}
              onClick={() => setTravelMode(tm.id as any)}
              aria-label={tm.label}
            >
              <tm.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tm.label}</span>
            </Button>
          ))}
        </div>

        {/* Accessibility Mode */}
        <div className="flex gap-1 bg-muted/30 p-1 rounded-2xl w-fit">
          {[
            { id: "normal", icon: User, label: t("normalMode", "一般") },
            { id: "wheelchair", icon: Accessibility, label: t("wheelchairMode", "輪椅") },
            { id: "elderly", icon: User, label: t("elderlyMode", "長者") },
            { id: "visual_impaired", icon: EyeOff, label: t("visualImpairedMode", "視障") },
          ].map((am) => (
            <Button
              key={am.id}
              variant={a11yMode === am.id ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 px-3 rounded-xl text-xs flex gap-1.5 transition-all",
                a11yMode === am.id ? "shadow-sm" : "text-muted-foreground hover:bg-muted/80"
              )}
              onClick={() => setA11yMode(am.id as any)}
              aria-label={am.label}
            >
              <am.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{am.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {mode === "natural" ? (
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t(
                "routeQueryPlaceholder",
                "例：從台北車站到101怎麼走？",
              )}
              className="w-full px-3 py-2 text-sm rounded-3xl border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={t("routeQuery", "路線查詢")}
            />
          </div>
          <Button
            size="icon"
            className="rounded-full shrink-0"
            onClick={handleNaturalQuery}
            disabled={isLoading || !queryInput.trim()}
            aria-label={t("search", "搜尋")}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-2 relative z-50">
            <PlaceInput
              value={originName}
              onChange={(e) => setOriginName(e.target.value)}
              placeholder={t("originPlaceholder", "起點")}
              className="w-full px-3 py-2 text-sm rounded-3xl border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={t("origin", "起點")}
              hideIcon
              onPlaceSelect={(place) => {
                setOrigin(place);
                if (place.kind === "place") {
                  setOriginName(
                    place.place.name || place.place.display_name || "",
                  );
                } else if (place.kind === "coordinate") {
                  setOriginName(place.address || "");
                }
              }}
            />
            <PlaceInput
              value={destinationName}
              onChange={(e) => setDestinationName(e.target.value)}
              placeholder={t("destinationPlaceholder", "終點")}
              className="w-full px-3 py-2 text-sm rounded-3xl border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={t("destination", "終點")}
              hideIcon
              onPlaceSelect={(place) => {
                setDestination(place);
                if (place.kind === "place") {
                  setDestinationName(
                    place.place.name || place.place.display_name || "",
                  );
                } else if (place.kind === "coordinate") {
                  setDestinationName(place.address || "");
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleSwitch}
              aria-label={t("switchOriginDestination", "交換起終點")}
            >
              <ArrowDownUpIcon size={14} />
            </Button>
            <Button
              size="icon"
              className="rounded-full h-7 w-7"
              onClick={handleStructuredRoute}
              disabled={isLoading}
              aria-label={t("search", "搜尋")}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Search className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
