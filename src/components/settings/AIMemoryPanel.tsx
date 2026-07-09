"use client";

import {
  Brain,
  Loader2,
  PencilLine,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppTranslation } from "@/i18n/client";
import {
  createMemory,
  getMemorySettings,
  listMemories,
  updateMemory,
  updateMemorySettings,
} from "@/lib/api/memory";
import type {
  MemoryCategory,
  MemorySensitivity,
  UserMemory,
} from "@/types/memory";

const CATEGORY_OPTIONS: MemoryCategory[] = [
  "preference",
  "place",
  "habit",
  "context",
];
const SENSITIVITY_OPTIONS: MemorySensitivity[] = ["low", "medium", "high"];

function formatDateLabel(value: string | null, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale);
}

export default function AIMemoryPanel({
  active,
  loggedIn,
}: {
  active: boolean;
  loggedIn: boolean;
}) {
  const { t, i18n } = useAppTranslation();
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("preference");
  const [sensitivity, setSensitivity] = useState<MemorySensitivity>("medium");
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setContent("");
    setCategory("preference");
    setSensitivity("medium");
    setEditingId(null);
  };

  const loadMemories = useCallback(async () => {
    if (!loggedIn) return;
    setLoading(true);
    try {
      const [settingsRes, memoriesRes] = await Promise.all([
        getMemorySettings(),
        listMemories(),
      ]);
      setMemoryEnabled(settingsRes.data?.memoryEnabled ?? true);
      setMemories(memoriesRes.data?.memories ?? []);
      setLoaded(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    if (!active || !loggedIn || loaded) return;
    void loadMemories();
  }, [active, loggedIn, loaded, loadMemories]);

  const handleToggleMemory = async (checked: boolean) => {
    setSettingsSaving(true);
    try {
      const res = await updateMemorySettings(checked);
      setMemoryEnabled(res.data?.memoryEnabled ?? checked);
      toast.success(t("aiMemorySettingSaved"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setFormSaving(true);
    try {
      if (editingId) {
        const res = await updateMemory(editingId, {
          content: trimmed,
          category,
          sensitivity,
        });
        const updated = res.data?.memory;
        if (updated) {
          setMemories((prev) =>
            prev.map((memory) => (memory.id === updated.id ? updated : memory)),
          );
        }
        toast.success(t("aiMemoryUpdated"));
      } else {
        const res = await createMemory({
          content: trimmed,
          category,
          sensitivity,
        });
        const created = res.data?.memory;
        if (created) {
          setMemories((prev) => [created, ...prev]);
        }
        toast.success(t("aiMemoryCreated"));
      }
      resetForm();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setFormSaving(false);
    }
  };

  const startEditing = (memory: UserMemory) => {
    setEditingId(memory.id);
    setContent(memory.content);
    setCategory(memory.category);
    setSensitivity(memory.sensitivity);
  };

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
        {t("aiMemoryLoginHint")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Brain className="h-4 w-4 text-primary" />
              {t("aiMemoryTitle")}
            </div>
            <p className="text-xs text-muted-foreground">{t("aiMemoryDesc")}</p>
          </div>
          <Switch
            checked={memoryEnabled}
            disabled={settingsSaving}
            onCheckedChange={handleToggleMemory}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          {memoryEnabled ? t("aiMemoryEnabled") : t("aiMemoryDisabled")}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {editingId ? t("aiMemoryEditTitle") : t("aiMemoryCreateTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("aiMemoryFormHint")}
            </p>
          </div>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4" />
              {t("cancel")}
            </Button>
          )}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={240}
          rows={4}
          placeholder={t("aiMemoryPlaceholder")}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex justify-end text-xs text-muted-foreground">
          {content.trim().length}/240
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("aiMemoryCategory")}
            </p>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as MemoryCategory)}
            >
              <SelectTrigger>{t(`memoryCategory.${category}`)}</SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`memoryCategory.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("aiMemorySensitivity")}
            </p>
            <Select
              value={sensitivity}
              onValueChange={(value) =>
                setSensitivity(value as MemorySensitivity)
              }
            >
              <SelectTrigger>
                {t(`memorySensitivity.${sensitivity}`)}
              </SelectTrigger>
              <SelectContent>
                {SENSITIVITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`memorySensitivity.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadMemories()}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={formSaving || !content.trim()}
          >
            {formSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {editingId ? t("saveChanges") : t("aiMemoryCreateAction")}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{t("aiMemoryListTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("aiMemoryListDesc", { count: memories.length })}
            </p>
          </div>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {loading && !loaded ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : memories.length === 0 ? (
          <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("aiMemoryEmpty")}
          </div>
        ) : (
          <ScrollArea className="max-h-72 pr-3">
            <div className="space-y-2.5">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-6">{memory.content}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => startEditing(memory)}
                    >
                      <PencilLine className="h-4 w-4" />
                      {t("edit")}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {t(`memoryCategory.${memory.category}`)}
                    </Badge>
                    <Badge variant="outline">
                      {t(`memorySensitivity.${memory.sensitivity}`)}
                    </Badge>
                    <Badge variant="outline">
                      {t(`memorySource.${memory.source}`)}
                    </Badge>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      {t("updatedAtLabel")}{" "}
                      {formatDateLabel(memory.updatedAt, i18n.language) ??
                        t("unknown")}
                    </p>
                    <p>
                      {t("expiresAtLabel")}{" "}
                      {formatDateLabel(memory.expiresAt, i18n.language) ??
                        t("aiMemoryNoExpiry")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
