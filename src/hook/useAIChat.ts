import { useCallback, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppTranslation } from "@/i18n/client";
import { executeAction } from "@/lib/ai/actionExecutor";
import { mapToolToActions } from "@/lib/ai/toolActionMapper";
import type { ChatMessage } from "@/lib/api/ai";
import { streamChatWithAgent } from "@/lib/api/ai";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import useComputeRoute from "./useComputeRoute";

export interface ToolActivity {
  name: string;
  args?: unknown;
  result?: unknown;
  status: "running" | "done";
}

export interface ChatBubble {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  toolActivities?: ToolActivity[];
}

export const TOOL_LABELS: Record<string, string> = {
  findGooglePlaces: "搜尋周邊地點",
  findA11yPlaces: "查詢無障礙設施",
  getA11yFacilityDetails: "查詢無障礙設施詳情",
  findCampusAccessibility: "查詢校園無障礙",
  getCampusAccessibilityDetails: "查詢校區設施詳情",
  planAccessibleRoute: "規劃無障礙路線",
  getNavInstructions: "產生導航指引",
  getBusRoute: "查詢公車路線",
  getBusRouteDetail: "查詢公車路線詳情",
  getBusArrival: "查詢公車預估到站時間",
  getBusTimetable: "查詢公車時刻表",
  trackBuses: "追蹤公車即時動態",
  findNearbyBusStops: "查詢附近公車站牌",
  getAirQuality: "查詢空氣品質",
  getEnvironmentInfo: "查詢周邊環境資訊",
  getNearbyHazards: "查詢附近障礙物",
  findNearbyParking: "查詢身障停車位",
  saveMemory: "記錄偏好設定",
  deleteMemory: "刪除偏好設定",
  searchAccessibilityGuide: "查詢無障礙指南",
  webSearch: "網路搜尋",
};

/**
 * 每個工具執行時的專屬 loading 文字（已含「正在…」與結尾「…」）。
 * 找不到對應時，AIChatBot 會退回 `正在${TOOL_LABELS[name]}…` 或工具原名。
 */
export const TOOL_LOADING_TEXT: Record<string, string> = {
  findGooglePlaces: "正在搜尋周邊地點…",
  findA11yPlaces: "正在查詢周邊無障礙設施…",
  getA11yFacilityDetails: "正在查詢無障礙設施詳情…",
  findCampusAccessibility: "正在查詢校園無障礙資訊…",
  getCampusAccessibilityDetails: "正在查詢校區設施詳情…",
  planAccessibleRoute: "正在為你規劃無障礙路線…",
  getNavInstructions: "正在產生導航指引…",
  getBusRoute: "正在查詢公車路線…",
  getBusRouteDetail: "正在查詢公車路線詳情…",
  getBusArrival: "正在查詢公車到站時間…",
  getBusTimetable: "正在查詢公車時刻表…",
  trackBuses: "正在追蹤公車即時動態…",
  findNearbyBusStops: "正在查詢附近公車站牌…",
  getAirQuality: "正在查詢空氣品質…",
  getEnvironmentInfo: "正在查詢周邊環境資訊…",
  getNearbyHazards: "正在查詢附近路況與障礙物…",
  findNearbyParking: "正在尋找身障停車位…",
  saveMemory: "正在記住你的偏好…",
  deleteMemory: "正在刪除記憶…",
  searchAccessibilityGuide: "正在查詢無障礙指南…",
  webSearch: "正在搜尋網路資訊…",
};

export default function useAIChat() {
  const { t } = useAppTranslation();
  const { userConfig } = useAuthStore(
    useShallow((s) => ({ userConfig: s.userConfig })),
  );

  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      role: "assistant",
      content: t(
        "assistFirstMessage",
        "你好！我是無障礙智慧地圖的 AI 助理，有什麼我能幫你的嗎？附近無障礙設施或者是問題回饋？請隨時提出！",
      ),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    userLocation,
    chatOpen: open,
    setChatOpen: setOpen,
  } = useMapStore(
    useShallow((s) => ({
      userLocation: s.userLocation,
      chatOpen: s.chatOpen,
      setChatOpen: s.setChatOpen,
    })),
  );
  const { handleComputeRoute } = useComputeRoute();
  const abortRef = useRef<AbortController | null>(null);

  const chatHistory = useRef<ChatMessage[]>([
    {
      role: "system",
      content: `你是「無障礙智慧地圖」的 AI 助理，專門協助使用者查詢無障礙相關資訊、路線規劃、附近設施。請使用${userConfig.language === "en" ? "英文" : "繁體中文"}回答。`,
    },
  ]);

  const markDone = (activities: ToolActivity[] | undefined) =>
    activities?.map((a) => ({ ...a, status: "done" as const }));

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      setIsLoading(true);
      executeAction({ type: "clear-markers" });

      const userBubble: ChatBubble = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userBubble]);

      chatHistory.current.push({ role: "user", content: trimmed });

      const assistantBubble: ChatBubble = {
        role: "assistant",
        content: "",
        isStreaming: true,
        toolActivities: [],
      };
      setMessages((prev) => [...prev, assistantBubble]);

      const controller = new AbortController();
      abortRef.current = controller;

      let fullText = "";

      try {
        await streamChatWithAgent(
          {
            messages: chatHistory.current,
            stream: true,
            temperature: 0.7,
            ...(userLocation
              ? {
                  userLocation: {
                    latitude: userLocation.lat,
                    longitude: userLocation.lng,
                  },
                }
              : {}),
          },
          (chunk) => {
            fullText += chunk;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                const activities = markDone(last.toolActivities);
                updated[updated.length - 1] = {
                  ...last,
                  content: fullText,
                  isStreaming: true,
                  toolActivities: activities,
                };
              }
              return updated;
            });
          },
          (toolName, toolArgs, isDone, result) => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                const existing = last.toolActivities
                  ? [...last.toolActivities]
                  : [];
                // Find if this tool is already in the list
                const idx = existing.findIndex(
                  (a) => a.name === toolName && a.status === "running",
                );

                if (idx !== -1) {
                  existing[idx] = {
                    ...existing[idx],
                    args: toolArgs,
                    result,
                    status: isDone ? "done" : "running",
                  };
                  updated[updated.length - 1] = {
                    ...last,
                    toolActivities: existing,
                  };
                } else {
                  const doneExisting = markDone(existing) ?? [];
                  updated[updated.length - 1] = {
                    ...last,
                    toolActivities: [
                      ...doneExisting,
                      {
                        name: toolName,
                        args: toolArgs,
                        result,
                        status: isDone ? "done" : "running",
                      },
                    ],
                  };
                }
              }
              return updated;
            });

            if (isDone) {
              const actions = mapToolToActions(toolName, result, toolArgs);
              let shouldCloseChat = false;

              for (const action of actions) {
                if (action.type === "compute-route") {
                  void handleComputeRoute({
                    origin: action.origin,
                    destination: action.destination,
                  }).then((ok) => {
                    if (ok) setOpen(false);
                  });
                } else {
                  executeAction(action);
                  if (
                    action.type === "show-route" ||
                    action.type === "switch-panel"
                  ) {
                    shouldCloseChat = true;
                  }
                }
              }
              if (shouldCloseChat) setOpen(false);
            }
          },
          controller.signal,
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        fullText =
          fullText || t("chatbot.error", "抱歉，發生錯誤，請稍後再試。");
      } finally {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            const activities = last.toolActivities?.map((a) => ({
              ...a,
              status: "done" as const,
            }));
            updated[updated.length - 1] = {
              ...last,
              content: fullText,
              isStreaming: false,
              toolActivities: activities,
            };
          }
          return updated;
        });

        chatHistory.current.push({ role: "assistant", content: fullText });
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [isLoading, userLocation, handleComputeRoute, setOpen, t],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    open,
    setOpen,
    handleSend,
    stopStreaming,
  };
}
