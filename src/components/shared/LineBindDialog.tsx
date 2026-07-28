"use client";

import { Copy } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLineLinkCode } from "@/lib/api/user";
import { copyToClipboard } from "@/lib/clipboard";
import type { LineLinkCodeResult } from "@/types/user";

interface LineBindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LineBindDialog({
  open,
  onOpenChange,
}: LineBindDialogProps) {
  const [loading, setLoading] = useState(false);
  const [linkInfo, setLinkInfo] = useState<LineLinkCodeResult | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) setLinkInfo(null);
    onOpenChange(next);
  };

  const handleBind = async () => {
    setLoading(true);
    try {
      const res = await getLineLinkCode();
      if (res.data) {
        setLinkInfo(res.data);
        window.open(res.data.bindUrl, "_blank", "noopener");
      } else {
        toast.error(res.message || "取得綁定碼失敗");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "取得綁定碼失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    const copied = await copyToClipboard(text);
    if (copied) toast.success("已複製");
    else toast.error("複製失敗");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-6">
        <DialogHeader className="items-center gap-1 text-center">
          <Image
            src="/line-icon.svg"
            alt=""
            width={36}
            height={36}
            className="mb-1"
          />
          <DialogTitle className="text-lg font-semibold">
            綁定 LINE 帳號
          </DialogTitle>
        </DialogHeader>

        {linkInfo ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              已為你開啟 LINE 官方帳號，請將以下綁定碼傳送給機器人完成綁定：
            </p>
            <div className="rounded-xl bg-muted/30 p-3 space-y-2.5 border border-border/40">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-lg font-mono font-bold tracking-widest text-center">
                  {linkInfo.bindCode.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(linkInfo.bindCode.toUpperCase())}
                  className="shrink-0 h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
                  aria-label="複製綁定碼"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <a
                href={linkInfo.bindUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-primary underline text-center"
              >
                重新開啟 LINE 好友連結
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              綁定碼有時效限制，逾期請重新產生。
            </p>
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => handleOpenChange(false)}
            >
              完成
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-center text-muted-foreground">
              綁定 LINE 帳號後，可透過 LINE 官方帳號接收通知。
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                稍後再說
              </Button>
              <Button
                type="button"
                size="lg"
                className="flex-1"
                disabled={loading}
                onClick={handleBind}
              >
                立即綁定
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
