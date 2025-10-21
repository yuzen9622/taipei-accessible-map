"use client";

import {
  BotMessageSquare,
  EllipsisIcon,
  SendHorizonal,
  XIcon,
} from "lucide-react";
import { Fragment, useRef, useState } from "react";

import { useAppTranslation } from "@/i18n/client";
import { chatWithA11yAI } from "@/lib/api/a11y";
import { cn, formatBathroom, formatMetroA11y } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { Marker } from "@/types";
import A11yCard from "./shared/A11yCard";
import MarkdownText from "./shared/MarkdownText";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

export default function AIChatBot() {
  const { t } = useAppTranslation();
  const [messages, setMessages] = useState<
    { sender: string; text: string; a11y?: Marker[] }[]
  >([
    {
      sender: "ai",
      text: t(
        "chatbot.greeting",
        "你好！我是無障礙台北的 AI 助理，有什麼我能幫你的嗎？"
      ),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { userLocation } = useMapStore();
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    const AIResponse = await chatWithA11yAI(
      input,
      userLocation?.lat,
      userLocation?.lng
    );
    console.log(AIResponse);
    if (AIResponse.data) {
      const formattedA11yInfo: Marker[] = [
        ...formatBathroom(AIResponse.data?.nearbyBathroom || []),
        ...formatMetroA11y(AIResponse.data?.nearbyMetroA11y || []),
      ];
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: AIResponse.data?.message || "",
          a11y: formattedA11yInfo,
        },
      ]);
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed  flex items-end  justify-end lg:bottom-4 top-16 right-4 z-50  ">
      {!open ? (
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="rounded-full h-10 w-10 shadow-lg bg-primary hover:bg-primary/90"
          aria-label={t("chatbot.open", "開啟聊天助理")}
        >
          <BotMessageSquare className="h-10 w-10" />
        </Button>
      ) : (
        <Card className="w-11/12   max-w-lg shadow-lg border border-border/50 overflow-hidden">
          <CardHeader className="px-4 py-3 border-b flex flex-row items-center space-y-0 gap-2">
            <Avatar className="h-8 w-8 flex items-center justify-center bg-primary/10">
              <BotMessageSquare className="h-4 w-4 text-primary" />
            </Avatar>
            <div className="font-medium">
              AI {t("chatbot.assistant", "智能助理")}
            </div>
            <Button
              onClick={() => setOpen(false)}
              size="sm"
              variant="ghost"
              className="ml-auto h-8 w-8 p-0 rounded-full"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </CardHeader>

          <ScrollArea
            className="h-fit max-h-[200px] overflow-auto"
            ref={scrollRef}
          >
            <CardContent className="p-4 space-y-4">
              {messages.map((m) => (
                <Fragment key={m.text + Math.random()}>
                  <div
                    className={cn(
                      "flex",
                      m.sender === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] w-fit px-3 py-2 rounded-2xl text-sm",
                        m.sender === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted rounded-tl-none"
                      )}
                    >
                      <MarkdownText>{m.text}</MarkdownText>
                    </div>
                  </div>
                  {m.a11y &&
                    m.a11y.length > 0 &&
                    m.a11y.map((place) => (
                      <A11yCard key={place.id} place={place} />
                    ))}
                </Fragment>
              ))}
              {isLoading && (
                <div className="flex gap-2 px-3 py-2 rounded-2xl text-sm w-fit bg-muted ">
                  智能助理思考中{" "}
                  <EllipsisIcon size={20} className="  animate-ping " />
                </div>
              )}
            </CardContent>
          </ScrollArea>

          <CardFooter className="p-3 border-t bg-background">
            <div className="flex w-full items-center space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t("chatbot.placeholder", "輸入問題...")}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                size="icon"
                disabled={!input.trim()}
                className="shrink-0"
              >
                <SendHorizonal className="h-4 w-4" />
                <span className="sr-only">{t("chatbot.send", "傳送")}</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
