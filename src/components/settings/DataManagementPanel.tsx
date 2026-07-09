"use client";

import {
  Bookmark,
  History,
  LocateFixed,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";

function CountBadge({ value }: { value: number | string }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {value}
    </span>
  );
}

export default function DataManagementPanel({
  onOpenSavedPlaces,
}: {
  onOpenSavedPlaces: () => void;
}) {
  const { t } = useAppTranslation();
  const { searchHistory, savedPlaces, clearSearchHistory, clearSavedPlaces } =
    useMapStore();
  const [quickActionsCount, setQuickActionsCount] = useState(0);
  const [hasLocationCache, setHasLocationCache] = useState(false);

  useEffect(() => {
    try {
      const quickActions = localStorage.getItem("quickActions");
      const parsed = quickActions
        ? (JSON.parse(quickActions) as unknown[])
        : [];
      setQuickActionsCount(Array.isArray(parsed) ? parsed.length : 0);
      setHasLocationCache(Boolean(localStorage.getItem("lastUserLocation")));
    } catch {
      setQuickActionsCount(0);
      setHasLocationCache(false);
    }
  }, []);

  const clearQuickActions = () => {
    try {
      localStorage.removeItem("quickActions");
      setQuickActionsCount(0);
      toast.success(t("settingsDataQuickActionsCleared"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const clearLastLocation = () => {
    try {
      localStorage.removeItem("lastUserLocation");
      setHasLocationCache(false);
      toast.success(t("settingsDataLocationCleared"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const dataItems = [
    {
      key: "history",
      icon: History,
      title: t("settingsDataSearchHistoryTitle"),
      desc: t("settingsDataSearchHistoryDesc"),
      count: searchHistory.length,
      actionLabel: t("settingsDataClearHistory"),
      disabled: searchHistory.length === 0,
      onClick: () => {
        clearSearchHistory();
        toast.success(t("settingsDataHistoryCleared"));
      },
    },
    {
      key: "saved",
      icon: Bookmark,
      title: t("settingsDataSavedPlacesTitle"),
      desc: t("settingsDataSavedPlacesDesc"),
      count: savedPlaces.length,
      actionLabel: t("settingsDataClearSavedPlaces"),
      disabled: savedPlaces.length === 0,
      onClick: () => {
        clearSavedPlaces();
        toast.success(t("settingsDataSavedPlacesCleared"));
      },
    },
    {
      key: "quickActions",
      icon: SlidersHorizontal,
      title: t("settingsDataQuickActionsTitle"),
      desc: t("settingsDataQuickActionsDesc"),
      count: quickActionsCount,
      actionLabel: t("settingsDataResetQuickActions"),
      disabled: quickActionsCount === 0,
      onClick: clearQuickActions,
    },
    {
      key: "location",
      icon: LocateFixed,
      title: t("settingsDataLocationTitle"),
      desc: t("settingsDataLocationDesc"),
      count: hasLocationCache
        ? t("settingsDataStatusStored")
        : t("settingsDataStatusEmpty"),
      actionLabel: t("settingsDataClearLocation"),
      disabled: !hasLocationCache,
      onClick: clearLastLocation,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-1.5">
        <p className="text-sm font-semibold">{t("settingsDataTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("settingsDataDesc")}</p>
      </div>

      <ScrollArea className="max-h-[min(56vh,520px)] pr-3">
        <div className="space-y-3">
          {dataItems.map(
            ({
              key,
              icon: Icon,
              title,
              desc,
              count,
              actionLabel,
              disabled,
              onClick,
            }) => (
              <div
                key={key}
                className="rounded-2xl border border-border/60 bg-background p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{title}</p>
                    <CountBadge value={count} />
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="sm:shrink-0"
                  onClick={onClick}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                  {actionLabel}
                </Button>
              </div>
            ),
          )}

          <div className="rounded-2xl border border-border/60 bg-background p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {t("settingsDataSavedPlacesManagerTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settingsDataSavedPlacesManagerDesc")}
              </p>
            </div>
            <Button type="button" onClick={onOpenSavedPlaces}>
              <Bookmark className="h-4 w-4" />
              {t("settingsDataOpenSavedPlaces")}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
