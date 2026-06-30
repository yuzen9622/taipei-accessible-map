"use client";

import {
  Accessibility,
  BotMessageSquare,
  Bus,
  Loader2,
  Navigation,
  Search,
  SendHorizonal,
  Square,
  SquareParking,
  Thermometer,
  TriangleAlert,
  Wind,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useRef } from "react";
import type { ChatBubble, ToolActivity } from "@/hook/useAIChat";
import useAIChat, { TOOL_LABELS, TOOL_LOADING_TEXT } from "@/hook/useAIChat";
import useOpenAiResult from "@/hook/useOpenAiResult";
import { useAppTranslation } from "@/i18n/client";
import {
  getToolResultGroup,
  type ToolCardIcon,
  type ToolResultItem,
} from "@/lib/toolResultCards";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import MarkdownText from "./shared/MarkdownText";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

const CARD_ICONS: Record<ToolCardIcon, React.ReactNode> = {
  search: <Search className="h-3.5 w-3.5" />,
  a11y: <Accessibility className="h-3.5 w-3.5" />,
  parking: <SquareParking className="h-3.5 w-3.5" />,
  bus: <Bus className="h-3.5 w-3.5" />,
  air: <Wind className="h-3.5 w-3.5" />,
  env: <Thermometer className="h-3.5 w-3.5" />,
  hazard: <TriangleAlert className="h-3.5 w-3.5" />,
  nav: <Navigation className="h-3.5 w-3.5" />,
};

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-[13px] text-muted-foreground py-1.5 px-1"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70 shrink-0" />
      <span className="animate-pulse">{label}</span>
    </motion.div>
  );
}

function ToolResultCard({
  item,
  onClick,
}: {
  item: ToolResultItem;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  const className = cn(
    "shrink-0 snap-start flex flex-col items-start text-left p-3 rounded-xl bg-card border border-border/60 shadow-sm w-[200px] transition-all",
    clickable &&
      "cursor-pointer hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  );
  const inner = (
    <>
      <div className="w-full flex items-center gap-1.5 mb-1">
        <span className="flex-1 font-semibold text-[14px] text-foreground leading-tight truncate">
          {item.title}
        </span>
        {item.badge && (
          <Badge
            variant="secondary"
            className="shrink-0 text-[10px] px-1.5 py-0 rounded-full"
          >
            {item.badge}
          </Badge>
        )}
      </div>
      {item.subtitle && (
        <div className="w-full text-[12px] text-muted-foreground line-clamp-2">
          {item.subtitle}
        </div>
      )}
    </>
  );

  return clickable ? (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  ) : (
    <div className={className}>{inner}</div>
  );
}

function ToolResultView({ activity }: { activity: ToolActivity }) {
  const { openAiResult, flyTo } = useOpenAiResult();
  const group = getToolResultGroup(activity.name, activity.result);
  if (!group) return null;

  const handleClick = (item: ToolResultItem) => {
    if (!item.position) return;
    if (item.target) {
      openAiResult({
        id: item.id,
        position: item.position,
        title: item.title,
        desc: item.subtitle,
        target: item.target,
      });
    } else {
      flyTo(item.position);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 mt-2 w-full"
    >
      <div className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1.5">
        {CARD_ICONS[group.icon]}
        {group.heading} ({group.items.length})
      </div>
      {group.note && (
        <div className="text-[12px] text-muted-foreground px-1 -mt-1">
          {group.note}
        </div>
      )}
      <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 px-1 snap-x w-full max-w-[85vw] sm:max-w-[420px] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        {group.items.map((item) => (
          <ToolResultCard
            key={item.id}
            item={item}
            onClick={item.position ? () => handleClick(item) : undefined}
          />
        ))}
      </div>
    </motion.div>
  );
}

function MessageBubble({ message }: { message: ChatBubble }) {
  const isUser = message.role === "user";
  const activities = message.toolActivities ?? [];
  // 所有已完成的工具都嘗試渲染；ToolResultView 對無法渲染的工具回 null
  const doneActivities = activities.filter((a) => a.status === "done");

  // 載入文字：優先顯示進行中的工具，否則最後一個工具，再否則「思考中」
  // 各工具有專屬文字（TOOL_LOADING_TEXT），找不到才退回通用寫法
  const running = activities.find((a) => a.status === "running");
  const latest = activities[activities.length - 1];
  const labelFor = (name: string) =>
    TOOL_LOADING_TEXT[name] ||
    (TOOL_LABELS[name] ? `正在${TOOL_LABELS[name]}…` : `正在${name}…`);
  const loadingLabel = running
    ? labelFor(running.name)
    : latest
      ? labelFor(latest.name)
      : "思考中…";

  const showLoading =
    !isUser && message.isStreaming && (!message.content || !!running);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex flex-col gap-1.5 w-full",
        isUser ? "items-end" : "items-start",
      )}
    >
      {showLoading && <ThinkingIndicator label={loadingLabel} />}

      {message.content && (
        <div
          className={cn(
            "max-w-[85%] w-fit px-3 py-2 rounded-2xl text-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm shadow-sm border border-border/30",
          )}
        >
          <MarkdownText>{message.content}</MarkdownText>
        </div>
      )}

      {/* Render done results only after streaming is finished, below the content */}
      {!message.isStreaming && !isUser && doneActivities.length > 0 && (
        <div className="flex flex-col gap-3 w-full mt-1 overflow-hidden">
          {doneActivities.map((activity, idx) => (
            <ToolResultView
              key={`${activity.name}-${idx}-done`}
              activity={activity}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function AIChatBot() {
  const { t } = useAppTranslation();
  const { sidebarCollapsed, activeRailPanel } = useMapStore();
  const panelOpen = activeRailPanel !== "none";
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
    // !isComposing：避免中文輸入法選字時按 Enter 誤送出（與 PlanInput 一致）
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div
      className={cn(
        "fixed flex items-end z-50",
        "bottom-44 right-3 justify-end",
        "lg:bottom-[80px] lg:right-auto lg:justify-start",
        sidebarCollapsed
          ? "lg:left-8"
          : panelOpen
            ? "lg:left-[468px]"
            : "lg:left-[76px]",
        open && "bottom-2 lg:bottom-2",
        open &&
          (sidebarCollapsed
            ? "lg:left-3"
            : panelOpen
              ? "lg:left-[453px]"
              : "lg:left-[68px]"),
      )}
      style={{ transition: "left 0.3s ease, bottom 0.3s ease" }}
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
                      <ThinkingIndicator label="思考中…" />
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
