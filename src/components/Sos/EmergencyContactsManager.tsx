"use client";

import { Copy, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppTranslation } from "@/i18n/client";
import {
  createEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
} from "@/lib/api/sos";
import { copyToClipboard } from "@/lib/clipboard";
import type {
  CreateEmergencyContactResult,
  EmergencyContact,
} from "@/types/sos";

const MAX_CONTACTS = 5;
const POLL_MS = 5000;

export default function EmergencyContactsManager() {
  const { t } = useAppTranslation();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justCreated, setJustCreated] =
    useState<CreateEmergencyContactResult | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await getEmergencyContacts();
      setContacts(res.data?.contacts ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchContacts().finally(() => setLoading(false));
  }, [fetchContacts]);

  useEffect(() => {
    if (!contacts.some((c) => c.bindStatus === "pending")) {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }
    pollTimer.current = setInterval(fetchContacts, POLL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
  }, [contacts, fetchContacts]);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) return;
    setSubmitting(true);
    try {
      const res = await createEmergencyContact(trimmed);
      const created = res.data;
      if (created) {
        setContacts((prev) => [...prev, created.contact]);
        setJustCreated(created);
        setName("");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("sosContactsDeleteConfirm"))) return;
    try {
      await deleteEmergencyContact(id);
      setContacts((prev) => prev.filter((c) => c._id !== id));
      if (justCreated && justCreated.contact._id === id) {
        setJustCreated(null);
      }
    } catch (err) {
      toast.error((err as Error).message);
      fetchContacts();
    }
  };

  const handleCopy = async (text: string) => {
    const copied = await copyToClipboard(text);
    if (copied) toast.success(t("linkCopied"));
    else toast.error(t("copyFailed"));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("sosContactsManageTitle")}</p>
        <p className="text-xs text-muted-foreground">
          {t("sosContactsManageDesc")}
        </p>
      </div>

      {justCreated && (
        <div className="rounded-xl bg-muted/30 p-3 space-y-2.5 border border-border/40">
          <p className="text-sm font-semibold">
            {t("sosContactsBindResultTitle")}
          </p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("sosContactsBindUrlLabel")}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={justCreated.bindUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline truncate flex-1"
              >
                {justCreated.bindUrl}
              </a>
              <button
                type="button"
                onClick={() => handleCopy(justCreated.bindUrl)}
                className="shrink-0 h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label={t("copyLink")}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("sosContactsBindCodeLabel")}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold tracking-widest">
                {justCreated.bindCode.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(justCreated.bindCode.toUpperCase())}
                className="shrink-0 h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label={t("copyLink")}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("sosContactsBindExpiry")}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border/60 rounded-xl bg-muted/5">
            {t("sosContactsEmpty")}
          </p>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact._id}
              className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">
                  {contact.name}
                </span>
                <Badge
                  variant={
                    contact.bindStatus === "bound" ? "default" : "secondary"
                  }
                  className={
                    contact.bindStatus === "bound"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                      : ""
                  }
                >
                  {contact.bindStatus === "bound"
                    ? t("sosContactsBound")
                    : t("sosContactsPending")}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(contact._id)}
                className="shrink-0 h-7 w-7 rounded-full hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-muted-foreground transition-colors"
                aria-label={t("sosContactsDelete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("sosContactsAddPlaceholder")}
            maxLength={50}
            disabled={submitting || contacts.length >= MAX_CONTACTS}
            className="rounded-xl h-10"
          />
          <Button
            onClick={handleAdd}
            disabled={
              submitting || !name.trim() || contacts.length >= MAX_CONTACTS
            }
            className="shrink-0 rounded-xl h-10 px-4"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("sosContactsAddSubmit")
            )}
          </Button>
        </div>
        {contacts.length >= MAX_CONTACTS && (
          <p className="text-xs text-muted-foreground">
            {t("sosContactsLimitReached")}
          </p>
        )}
      </div>
    </div>
  );
}
