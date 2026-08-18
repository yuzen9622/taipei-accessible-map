"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(
      "[GlobalError] Unhandled error caught in root global error boundary:",
      error,
    );
  }, [error]);

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <html lang="zh-TW">
      <head>
        <title>系統發生錯誤 - 無障礙智慧地圖</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
          backgroundColor: "#f8fafc",
          color: "#0f172a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <main
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          style={{
            maxWidth: "480px",
            width: "90%",
            padding: "24px",
            margin: "16px auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 16px",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-hidden="true"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label="錯誤提示圖示"
            >
              <title>錯誤提示圖示</title>
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: "20px",
              fontWeight: 700,
              margin: "0 0 8px",
              color: "#0f172a",
            }}
          >
            系統發生重大錯誤
          </h1>

          <p
            style={{
              fontSize: "14px",
              color: "#64748b",
              lineHeight: 1.6,
              margin: "0 0 16px",
            }}
          >
            應用程式核心元件發生未預期的錯誤，請嘗試重新載入整個頁面或返回首頁。
          </p>

          {error?.digest && (
            <p
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                margin: "0 0 16px",
                fontFamily: "monospace",
              }}
            >
              錯誤代碼：{error.digest}
            </p>
          )}

          {error?.message && (
            <details
              style={{
                textAlign: "left",
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "20px",
                padding: "8px 12px",
                backgroundColor: "#f1f5f9",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                詳細錯誤資訊
              </summary>
              <pre
                style={{
                  marginTop: "8px",
                  maxHeight: "120px",
                  overflow: "auto",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  color: "#334155",
                }}
              >
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ""}
              </pre>
            </details>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={handleReload}
              style={{
                minHeight: "44px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#ffffff",
                backgroundColor: "#0284c7",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              }}
              aria-label="重新載入頁面"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
                aria-label="重新載入圖示"
              >
                <title>重新載入圖示</title>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              <span>重新載入頁面</span>
            </button>

            <a
              href="/"
              style={{
                minHeight: "44px",
                padding: "10px 20px",
                fontSize: "13px",
                color: "#64748b",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              返回首頁
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
