"use client";

import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

type PlaceCardProps = {
  title: string;
  subtitle?: string;
  /** "result" 用於 AI 工具結果的橫向卡片（標題列右側徽章）；"compact" 用於
   * 頂部圖示的小卡（NearbyContextBlock 的「你附近」列）。 */
  variant?: "result" | "compact";
  badge?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

export default function PlaceCard({
  title,
  subtitle,
  variant = "result",
  badge,
  icon,
  onClick,
  className,
}: PlaceCardProps) {
  const clickable = !!onClick;

  if (variant === "compact") {
    const compactClassName = cn(
      "flex w-[132px] shrink-0 snap-start flex-col items-start gap-1 rounded-2xl border border-border/60 bg-card/50 p-3 text-left transition-colors",
      clickable && "hover:bg-accent/30",
      className,
    );
    const compactInner = (
      <>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </span>
        )}
        <span className="text-xs font-medium text-foreground">{title}</span>
        {subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </>
    );
    return clickable ? (
      <button type="button" onClick={onClick} className={compactClassName}>
        {compactInner}
      </button>
    ) : (
      <div className={compactClassName}>{compactInner}</div>
    );
  }

  const resultClassName = cn(
    "shrink-0 snap-start flex flex-col items-start text-left p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-2xs w-[170px] sm:w-[190px] transition-all",
    clickable &&
      "cursor-pointer hover:border-primary/40 hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.98]",
    className,
  );
  const resultInner = (
    <>
      <div className="w-full flex items-center gap-1.5 mb-1">
        <span className="flex-1 font-semibold text-[13px] sm:text-[14px] text-foreground leading-tight truncate">
          {title}
        </span>
        {badge && (
          <Badge
            variant="secondary"
            className="shrink-0 text-[10px] px-1.5 py-0 rounded-full font-medium"
          >
            {badge}
          </Badge>
        )}
      </div>
      {subtitle && (
        <div className="w-full text-[11px] sm:text-[12px] text-muted-foreground line-clamp-2 leading-snug">
          {subtitle}
        </div>
      )}
    </>
  );

  return clickable ? (
    <button type="button" onClick={onClick} className={resultClassName}>
      {resultInner}
    </button>
  ) : (
    <div className={resultClassName}>{resultInner}</div>
  );
}
