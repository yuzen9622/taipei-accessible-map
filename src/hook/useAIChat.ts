import { useCallback, useRef, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { streamChatWithAgent } from "@/lib/api/ai";
import type { ChatMessage } from "@/lib/api/ai";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import useComputeRoute from "./useComputeRoute";

export interface ToolActivity {
  name: string;
  args?: unknown;
  status: "running" | "done";
}

export interface ChatBubble {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  toolActivities?: ToolActivity[];
}

export const TOOL_LABELS: Record<string, string> = {
  plan_route: "規劃路線",
  search_places: "搜尋地點",
  get_nearby: "查詢附近設施",
  get_weather: "查詢天氣",
  get_air_quality: "查詢空氣品質",
  analyze_route: "分析路線",
};

export default function useAIChat() {
  const { t } = useAppTranslation();
  const { userConfig } = useAuthStore();

  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      role: "assistant",
      content: t(
        "assistFirstMessage",
        "你好！我是無障礙台北的 AI 助理，有什麼我能幫你的嗎？附近無障礙設施或者是問題回饋？請隨時提出！"
      ),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { userLocation } = useMapStore();
  const { handleComputeRoute } = useComputeRoute();
  const abortRef = useRef<AbortController | null>(null);

  const chatHistory = useRef<ChatMessage[]>([
    {
      role: "system",
      content: `你是「無障礙台北」的 AI 助理，專門協助使用者查詢無障礙相關資訊、路線規劃、附近設施。請使用${userConfig.language === "en" ? "英文" : "繁體中文"}回答。`,
    },
  ]);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      setIsLoading(true);

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
                const activities = last.toolActivities?.map((a) => ({
                  ...a,
                  status: "done" as const,
                }));
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
          (toolName, toolArgs) => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                const existing = last.toolActivities || [];
                const doneExisting = existing.map((a) => ({
                  ...a,
                  status: "done" as const,
                }));
                updated[updated.length - 1] = {
                  ...last,
                  toolActivities: [
                    ...doneExisting,
                    { name: toolName, args: toolArgs, status: "running" },
                  ],
                };
              }
              return updated;
            });

            if (toolName === "plan_route") {
              const args =
                typeof toolArgs === "string" ? JSON.parse(toolArgs) : toolArgs;
              handleComputeRoute({
                origin: {
                  lat: args.origin?.latitude,
                  lng: args.origin?.longitude,
                },
                destination: {
                  lat: args.destination?.latitude,
                  lng: args.destination?.longitude,
                },
              });
            }
          },
          controller.signal
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
    [isLoading, userLocation, handleComputeRoute, t]
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
