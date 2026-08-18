"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  type LucideIcon,
  SearchX,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * S4 of the UX blueprint: one shell for every full-page result screen —
 * email verified, verification link expired, password reset, reset link
 * expired, 404, offline — instead of each route hand-rolling its own
 * centered-card layout with a slightly different icon treatment.
 */
export type StatusPageStatus =
  | "pending"
  | "success"
  | "error"
  | "notFound"
  | "offline";

interface StatusPageAction {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface StatusPageProps {
  status: StatusPageStatus;
  title: string;
  description?: string;
  /** e.g. "404" — rendered as "錯誤代碼：404" below the description. */
  code?: string;
  /** The one primary CTA the mockup calls for — resist adding a second. */
  primaryAction?: StatusPageAction;
  /** A quiet text-link fallback, e.g. "需要協助？". */
  secondaryAction?: StatusPageAction;
  /** Escape hatch for a route that needs a genuinely different icon. */
  icon?: LucideIcon;
  /** For an active step (e.g. a form) where no status icon applies at all. */
  hideIcon?: boolean;
  /** Only the reset-password form step needs this — everything else is icon + text + button. */
  children?: ReactNode;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusPageStatus,
  { Icon: LucideIcon; iconClass: string; bgClass: string; spin?: boolean }
> = {
  pending: {
    Icon: Loader2,
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted",
    spin: true,
  },
  success: {
    Icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
  },
  error: {
    Icon: AlertTriangle,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
  },
  notFound: {
    Icon: SearchX,
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
  offline: {
    Icon: WifiOff,
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
};

function ActionButton({ action }: { action: StatusPageAction }) {
  if (action.href) {
    return (
      <Button className="w-full" disabled={action.disabled} asChild>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button
      className="w-full"
      onClick={action.onClick}
      disabled={action.disabled}
    >
      {action.label}
    </Button>
  );
}

function SecondaryLink({ action }: { action: StatusPageAction }) {
  const className = "text-xs text-muted-foreground hover:underline";
  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

export default function StatusPage({
  status,
  title,
  description,
  code,
  primaryAction,
  secondaryAction,
  icon,
  hideIcon,
  children,
  className,
}: StatusPageProps) {
  const { t } = useAppTranslation();
  const config = STATUS_CONFIG[status];
  const Icon = icon ?? config.Icon;

  return (
    <div
      role={status === "error" ? "alert" : undefined}
      aria-live={status === "error" ? "assertive" : undefined}
      aria-atomic={status === "error" ? "true" : undefined}
      className="flex min-h-dvh w-full items-center justify-center p-6"
    >
      <Card className={cn("w-full max-w-md text-center", className)}>
        <CardHeader>
          {!hideIcon && (
            <div
              className={cn(
                "mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full",
                config.bgClass,
              )}
            >
              <Icon
                className={cn(
                  "h-7 w-7",
                  config.iconClass,
                  config.spin && "animate-spin",
                )}
              />
            </div>
          )}
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>

        {(children || code) && (
          <CardContent className="space-y-4">
            {children}
            {code && (
              <p className="text-sm text-muted-foreground">
                {t("statusErrorCode", { code })}
              </p>
            )}
          </CardContent>
        )}

        {(primaryAction || secondaryAction) && (
          <CardFooter className="flex flex-col gap-2">
            {primaryAction && <ActionButton action={primaryAction} />}
            {secondaryAction && <SecondaryLink action={secondaryAction} />}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
