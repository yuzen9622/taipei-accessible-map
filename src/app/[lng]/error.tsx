"use client";

import { useEffect } from "react";
import StatusPage from "@/components/shared/StatusPage";
import { useAppTranslation } from "@/i18n/client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  const { t } = useAppTranslation();
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    console.error(
      "[RouteError] Unhandled error caught in route error boundary:",
      error,
    );
  }, [error]);

  return (
    <StatusPage
      status="error"
      title={t("errorTitle", "發生未預期錯誤")}
      description={t(
        "errorDescription",
        "應用程式遇到未預期的問題，請嘗試重新載入或返回首頁。",
      )}
      code={error.digest}
      primaryAction={{
        label: t("errorRetry", "重新嘗試"),
        onClick: reset,
      }}
      secondaryAction={{
        label: t("errorGoHome", "返回首頁"),
        href: "/",
      }}
    >
      {(isDev || error.message) && (
        <details className="text-left text-xs text-muted-foreground group mt-2">
          <summary className="cursor-pointer font-medium hover:text-foreground select-none">
            {t("errorDetails", "詳細錯誤資訊")}
          </summary>
          <pre className="mt-2 max-h-36 overflow-auto rounded bg-muted/80 p-2.5 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-all border border-border">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        </details>
      )}
    </StatusPage>
  );
}
