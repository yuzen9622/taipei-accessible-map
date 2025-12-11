import { useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { chatWithA11yAI } from "@/lib/api/a11y";
import { formatBathroom, formatMetroA11y, getGeocoder } from "@/lib/utils";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import type { IBathroom, Marker, metroA11yData } from "@/types";
import type { AIRouteResponse, GooglePlaceResult } from "@/types/transit";
import useComputeRoute from "./useComputeRoute";
export default function useAIChatTool() {
  const { t } = useAppTranslation();
  const { userConfig } = useAuthStore();

  const [messages, setMessages] = useState<
    {
      sender: string;
      text: string;
      a11y?: Marker[];
      places?: GooglePlaceResult[];
      planningRoute?: {
        origin: string;
        destination: string;
        mode: string;
      };
    }[]
  >([
    {
      sender: "ai",
      text: t(
        "assistFirstMessage",
        "你好！我是無障礙台北的 AI 助理，有什麼我能幫你的嗎？附近無障礙設施或者是問題回饋？請隨時提出！"
      ),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const { userLocation, setDestination, setOrigin } = useMapStore();

  const { handleComputeRoute } = useComputeRoute();
  function nearbyA11y(params: {
    nearbyBathroom: IBathroom[];
    nearbyMetroA11y: metroA11yData[];
  }) {
    const { nearbyBathroom, nearbyMetroA11y } = params;
    const formattedA11yInfo: Marker[] = [
      ...formatBathroom(nearbyBathroom || []),
      ...formatMetroA11y(nearbyMetroA11y || []),
    ];
    return formattedA11yInfo;
  }

  async function planRoute(AIRouteResponse: AIRouteResponse) {
    const origin = AIRouteResponse.origin;
    const destination = AIRouteResponse.destination;
    const mode = AIRouteResponse.travelMode as google.maps.TravelMode;
    const origin_geocode = await getGeocoder({
      lat: origin.latitude,
      lng: origin.longitude,
    });
    const destination_geocode = await getGeocoder({
      lat: destination.latitude,
      lng: destination.longitude,
    });

    setOrigin({
      kind: "geocoder",
      place: origin_geocode,
      position: origin_geocode.geometry.location.toJSON(),
    });
    setDestination({
      kind: "geocoder",
      place: destination_geocode,
      position: destination_geocode.geometry.location.toJSON(),
    });

    handleComputeRoute({
      origin: { lat: origin.latitude, lng: origin.longitude },
      destination: {
        lat: destination.latitude,
        lng: destination.longitude,
      },
      mode: mode,
    });
    return { origin_geocode, destination_geocode, mode };
  }

  const handleSend = async (input: string) => {
    if (input.trim() === "") return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    setInput("");
    setIsLoading(true);
    const history = messages.map((message) => {
      if (message.sender === "ai") {
        return { role: "model", parts: [{ text: message.text }] };
      }
      return { role: "user", parts: [{ text: message.text }] };
    });
    const AIResponse = await chatWithA11yAI(
      input,
      userConfig.language,
      userLocation?.lat,
      userLocation?.lng,
      history
    );

    if (AIResponse.data) {
      if (AIResponse.data.a11yPlacesResults) {
        const formattedA11yInfo = nearbyA11y(AIResponse.data.a11yPlacesResults);
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: AIResponse.data?.message || "",
            a11y: formattedA11yInfo,
          },
        ]);
      } else if (AIResponse.data.googlePlacesResults) {
        const places = AIResponse.data.googlePlacesResults;
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: AIResponse.data?.message || "",
            places: places,
          },
        ]);
      } else if (AIResponse.data.planRouteResult) {
        const { origin_geocode, destination_geocode, mode } = await planRoute(
          AIResponse.data.planRouteResult
        );
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: AIResponse.data?.message || "",
            planningRoute: {
              origin: origin_geocode.formatted_address,
              destination: destination_geocode.formatted_address,
              mode,
            },
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: AIResponse.data?.message || "",
          },
        ]);
      }
    }
    setIsLoading(false);
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    open,
    setOpen,
    handleSend,
  };
}
