"use client";

import {
  BotMessageSquare,
  ChevronDown,
  SendHorizonal,
  XIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Fragment, useEffect, useRef } from "react";
import useAIChatTool from "@/hook/useAIChat";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import A11yCard from "./shared/A11yCard";
import MarkdownText from "./shared/MarkdownText";
import PlaceCard from "./shared/PlaceCard";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

export default function AIChatBot() {
  const { t } = useAppTranslation();

  const { messages, handleSend, input, setInput, isLoading, open, setOpen } =
    useAIChatTool();
  const scrollRef = useRef<HTMLDivElement>(null);
  const recommendations = [
    t("chatbot.recommendation1", "附近無障礙設施(限台北)"),
    t("chatbot.recommendation2", "目前位置到最近車站"),
    t("chatbot.recommendation3", "附近餐廳"),
  ];
  useEffect(() => {
    if (messages && open) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, open]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div
      className={cn(
        "fixed  flex items-end  justify-end bottom-16  right-5 z-50  ",
        open && "bottom-2"
      )}
    >
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
        <Card className="w-11/12 gap-0  h-[calc(100dvh-5rem)] max-w-lg flex flex-col shadow-lg border border-border/50 overflow-hidden">
          <CardHeader className="px-4 py-3 border-b flex flex-row items-center space-y-0 gap-2">
            <Avatar className="h-8 w-8 flex items-center justify-center bg-primary/10">
              <BotMessageSquare className="h-4 w-4 text-primary" />
            </Avatar>
            <div className="font-medium">
              <h1>{t("assist")}</h1>
              <p className="text-muted-foreground text-xs">{t("assistDesc")}</p>
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

          <ScrollArea className="flex-1 overflow-auto pt-1  ">
            <CardContent className="  min-h-full space-y-4" ref={scrollRef}>
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
                  {m.places &&
                    m.places.length > 0 &&
                    m.places.map((place) => (
                      <PlaceCard key={place.place_id} {...place} />
                    ))}
                  {m.planningRoute && (
                    <Card className="w-full border ">
                      <CardContent className="flex flex-col gap-4 items-center justify-between">
                        <div className="flex items-start gap-2">
                          <Badge variant="secondary" className="shrink-0">
                            起點
                          </Badge>
                          <div className="text-sm text-foreground/90">
                            {m.planningRoute.origin}
                          </div>
                        </div>
                        <ChevronDown className=" animate-bounce" />
                        <div className="flex items-start gap-2">
                          <Badge variant="secondary" className="shrink-0">
                            終點
                          </Badge>
                          <div className="text-sm text-foreground/90 ">
                            {m.planningRoute.destination}
                          </div>
                        </div>
                        {m.planningRoute.mode && (
                          <div className="text-xs text-muted-foreground">
                            模式：{m.planningRoute.mode}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </Fragment>
              ))}
              {isLoading && (
                <div className="flex gap-2 px-3 py-4 rounded-2xl text-sm w-fit bg-muted items-end ">
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="bg-primary w-1.5 h-1.5 rounded-full"
                  ></motion.div>
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="bg-primary w-1.5 h-1.5 rounded-full"
                  ></motion.div>
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="bg-primary w-1.5 h-1.5 rounded-full"
                  ></motion.div>
                </div>
              )}{" "}
            </CardContent>
          </ScrollArea>
          <div className="  sticky bg-linear-to-t from-accent to-transparent flex gap-4 bottom-0 left-5 py-2 items-center justify-center">
            {recommendations.map((rec) => (
              <Badge
                onClick={() => handleSend(rec)}
                key={rec}
                className="px-3 py-2 rounded-3xl"
                asChild
              >
                <button type="button">{rec}</button>
              </Badge>
            ))}
          </div>
          <CardFooter className="p-3 border-t bg-background flex flex-col gap-2">
            <div className="flex w-full items-center space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t("chatbot.placeholder", "輸入問題...")}
                className="flex-1"
              />
              <Button
                onClick={() => handleSend(input)}
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
