"use client";

import {
  BotMessageSquare,
  SendHorizonal,
  Square,
  XIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Fragment, useEffect, useRef } from "react";
import useAIChat from "@/hook/useAIChat";
import type { ChatBubble } from "@/hook/useAIChat";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import MarkdownText from "./shared/MarkdownText";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

function StreamingDots() {
  return (
    <div className="flex gap-1.5 px-3 py-3 rounded-2xl text-sm w-fit bg-muted items-center">
      {[0, 0.15, 0.3].map((delay) => (
        <motion.div
          key={delay}
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay }}
          className="bg-primary/60 w-1.5 h-1.5 rounded-full"
        />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatBubble }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] w-fit px-3 py-2 rounded-2xl text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        )}
      >
        <MarkdownText>{message.content}</MarkdownText>
        {message.isStreaming && !message.content && <StreamingDots />}
      </div>
    </motion.div>
  );
}

export default function AIChatBot() {
  const { t } = useAppTranslation();
  const {
    messages,
    handleSend,
    input,
    setInput,
    isLoading,
    open,
    setOpen,
    stopStreaming,
  } = useAIChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  const recommendations = [
    t("chatbot.recommendation1", "附近無障礙設施"),
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
        "fixed flex items-end justify-end bottom-44 lg:bottom-[80px] right-3 z-50",
        open && "bottom-2 lg:bottom-2"
      )}
    >
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.div
            key="fab"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Button
              onClick={() => setOpen(true)}
              size="lg"
              className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all text-foreground"
              aria-label={t("chatbot.open", "開啟聊天助理")}
            >
              <BotMessageSquare className="h-6 w-6" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[92vw] max-w-lg"
          >
            <Card className="h-[calc(100dvh-5rem)] gap-0 flex flex-col shadow-xl border border-border/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="px-4 py-3 border-b flex flex-row items-center space-y-0 gap-2">
                <Avatar className="h-8 w-8 flex items-center justify-center bg-primary/10">
                  <BotMessageSquare className="h-4 w-4 text-primary" />
                </Avatar>
                <div className="font-medium">
                  <h1 className="text-sm">{t("assist")}</h1>
                  <p className="text-muted-foreground text-xs">
                    {t("assistDesc")}
                  </p>
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

              <ScrollArea className="flex-1 overflow-auto pt-1">
                <CardContent className="min-h-full space-y-3" ref={scrollRef}>
                  {messages.map((m, i) => (
                    <Fragment key={i}>
                      <MessageBubble message={m} />
                    </Fragment>
                  ))}
                  {isLoading &&
                    messages[messages.length - 1]?.role !== "assistant" && (
                      <StreamingDots />
                    )}
                </CardContent>
              </ScrollArea>

              <div className="sticky bg-gradient-to-t from-card to-transparent bottom-0 py-2">
                <div className="flex gap-2 px-4 overflow-x-auto justify-center">
                  {recommendations.map((rec) => (
                    <Badge
                      onClick={() => handleSend(rec)}
                      key={rec}
                      className="px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap text-xs transition-colors hover:bg-primary/80"
                      asChild
                    >
                      <button type="button">{rec}</button>
                    </Badge>
                  ))}
                </div>
              </div>

              <CardFooter className="p-3 border-t bg-card flex flex-col gap-2">
                <div className="flex w-full items-center gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={t("chatbot.placeholder", "輸入問題...")}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  {isLoading ? (
                    <Button
                      onClick={stopStreaming}
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSend(input)}
                      size="icon"
                      disabled={!input.trim()}
                      className="shrink-0"
                    >
                      <SendHorizonal className="h-4 w-4" />
                      <span className="sr-only">
                        {t("chatbot.send", "傳送")}
                      </span>
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
