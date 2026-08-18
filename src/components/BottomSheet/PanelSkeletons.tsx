"use client";

import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

interface SkeletonBaseProps {
  className?: string;
  label?: string;
}

const SKELETON_SLOTS_3 = ["s-1", "s-2", "s-3"] as const;
const SKELETON_SLOTS_4 = ["s-1", "s-2", "s-3", "s-4"] as const;
const SKELETON_SLOTS_5 = ["s-1", "s-2", "s-3", "s-4", "s-5"] as const;

/**
 * Base accessible wrapper for panel skeletons.
 * Follows WCAG 2.1 AA / ui-ux-pro-max guidelines with status role, aria-busy, and sr-only announcement.
 */
export function PanelSkeletonWrapper({
  className,
  label,
  children,
}: SkeletonBaseProps & { children: React.ReactNode }) {
  const { t } = useAppTranslation();
  const accessibleLabel = label || t("loading", "載入中…");

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={accessibleLabel}
      className={cn("w-full space-y-4 py-1", className)}
    >
      <span className="sr-only">{accessibleLabel}</span>
      {children}
    </div>
  );
}

/**
 * Generic panel skeleton with header, chip filters, and card items.
 */
export function PanelSkeleton({ className, label }: SkeletonBaseProps) {
  return (
    <PanelSkeletonWrapper className={className} label={label}>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="space-y-3 pt-2">
        {SKELETON_SLOTS_4.map((id) => (
          <div
            key={`panel-card-${id}`}
            className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-48" />
          </div>
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for A11y facilities panel.
 */
export function A11yPanelSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("accessibleTitle", "無障礙設施")}
    >
      {/* Category filter chips */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      {/* Facility items list */}
      <div className="space-y-3 pt-1">
        {SKELETON_SLOTS_4.map((id) => (
          <div
            key={`a11y-item-${id}`}
            className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-44" />
          </div>
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Bus information panel.
 */
export function BusPanelSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("busInfo", "公車資訊")}
    >
      {/* Search bar placeholder */}
      <Skeleton className="h-11 w-full rounded-2xl" />
      {/* Segment tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
      </div>
      {/* Route list */}
      <div className="space-y-2.5 pt-1">
        {SKELETON_SLOTS_5.map((id) => (
          <div
            key={`bus-item-${id}`}
            className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between"
          >
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3.5 w-36" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Parking information panel.
 */
export function ParkingPanelSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("parking", "停車資訊")}
    >
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="space-y-3 pt-1">
        {SKELETON_SLOTS_4.map((id) => (
          <div
            key={`parking-item-${id}`}
            className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Environment panel.
 */
export function EnvironmentSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("environment", "環境資訊")}
    >
      {/* Target switch */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
      {/* Weather hero card */}
      <div className="h-28 w-full rounded-2xl bg-muted/30 border border-border/40 p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
      {/* 2x2 Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {SKELETON_SLOTS_4.map((id) => (
          <div
            key={`env-metric-${id}`}
            className="h-20 rounded-2xl bg-muted/30 border border-border/40 p-3 space-y-2"
          >
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Hazard report panel.
 */
export function HazardReportSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("reportHazard", "回報障礙")}
    >
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
      {/* Photo upload placeholder */}
      <div className="h-28 w-full rounded-2xl border-2 border-dashed border-muted/60 flex items-center justify-center">
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      {/* Textarea placeholder */}
      <Skeleton className="h-20 w-full rounded-2xl" />
      {/* Submit button */}
      <Skeleton className="h-11 w-full rounded-2xl" />
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Saved places panel.
 */
export function SavedPlacesSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("savedPlaces", "已存地點")}
    >
      <div className="flex gap-2 overflow-hidden">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="space-y-2.5 pt-1">
        {SKELETON_SLOTS_4.map((id) => (
          <div
            key={`saved-item-${id}`}
            className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 flex items-center gap-3"
          >
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Welfare resources panel.
 */
export function WelfareSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("welfare", "福利資源")}
    >
      <Skeleton className="h-10 w-full rounded-2xl" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="space-y-3 pt-1">
        {SKELETON_SLOTS_3.map((id) => (
          <div
            key={`welfare-item-${id}`}
            className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Place detail content.
 */
export function PlaceSkeleton({ className }: SkeletonBaseProps) {
  return (
    <PanelSkeletonWrapper className={className}>
      {/* Cover / image box */}
      <Skeleton className="h-40 w-full rounded-2xl" />
      {/* Title & subtitle */}
      <div className="space-y-2 pt-1">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {/* Action buttons grid (44px min height for touch target) */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        {SKELETON_SLOTS_4.map((id) => (
          <Skeleton key={`place-btn-${id}`} className="h-11 rounded-xl" />
        ))}
      </div>
      {/* Place details list */}
      <div className="space-y-2 pt-2">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Route planning content.
 */
export function RoutePlanSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("planRoute", "規劃路線")}
    >
      {/* Origin/Destination inputs container */}
      <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 space-y-2.5">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      {/* Mode selection tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
      </div>
      {/* Route option cards */}
      <div className="space-y-3 pt-1">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Route calculation summary & steps.
 */
export function RouteContentSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper className={className} label={t("route", "路線")}>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="space-y-3 pt-2">
        {SKELETON_SLOTS_4.map((id) => (
          <div key={`route-step-${id}`} className="flex gap-3 items-start p-2">
            <Skeleton className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Navigation instructions content.
 */
export function NavigationSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("navInstructions", "導航指引")}
    >
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="space-y-3 pt-2">
        {SKELETON_SLOTS_4.map((id) => (
          <div
            key={`nav-step-${id}`}
            className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between"
          >
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for Station details content.
 */
export function StationDetailSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={className}
      label={t("stationDetail", "車站詳情")}
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
      </div>
      <div className="space-y-2.5 pt-1">
        {SKELETON_SLOTS_4.map((id) => (
          <Skeleton
            key={`station-fac-${id}`}
            className="h-14 w-full rounded-xl"
          />
        ))}
      </div>
    </PanelSkeletonWrapper>
  );
}

/**
 * Accessible skeleton for AI Chatbot assistant panel.
 */
export function ChatSkeleton({ className }: SkeletonBaseProps) {
  const { t } = useAppTranslation();
  return (
    <PanelSkeletonWrapper
      className={cn("h-full flex flex-col justify-between p-3", className)}
      label={t("assist", "AI 助理")}
    >
      <div className="space-y-4 flex-1">
        {/* Assistant greeting bubble */}
        <div className="flex items-start gap-2.5 max-w-[85%]">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-16 w-56 rounded-2xl" />
        </div>
        {/* User response bubble */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40 rounded-2xl" />
        </div>
        {/* Assistant reply bubble */}
        <div className="flex items-start gap-2.5 max-w-[85%]">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-20 w-64 rounded-2xl" />
        </div>
      </div>
      {/* Chat input box */}
      <Skeleton className="h-12 w-full rounded-2xl mt-4 shrink-0" />
    </PanelSkeletonWrapper>
  );
}
