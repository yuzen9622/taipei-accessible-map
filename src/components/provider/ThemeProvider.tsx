"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type * as React from "react";
import { useEffect } from "react";
import { FontSizeEnum, fontSizeConfig } from "@/lib/config";
import useAuthStore from "@/stores/useAuthStore";
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSync>{children}</ThemeSync>
    </NextThemesProvider>
  );
}
function ThemeSync({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const { userConfig } = useAuthStore();
  const darkMode = useAuthStore((s) => s.userConfig.darkMode);

  useEffect(() => {
    if (darkMode) {
      setTheme(darkMode); // 'light' | 'dark' | 'system'
    }
  }, [darkMode, setTheme]);
  useEffect(() => {
    const cfg =
      fontSizeConfig[userConfig.fontSize || FontSizeEnum.Medium] ??
      fontSizeConfig[FontSizeEnum.Medium];

    // 1) 設定 CSS 變數到 :root（可在全域 CSS 使用 var(--font-size-base)）
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      Object.entries(cfg.cssVars || {}).forEach(([k, v]) => {
        root.style.setProperty(k, v as string);
      });

      // 2) 切換 Tailwind 文字大小 class（例如 text-sm / text-base / text-lg）
      const allBases = Object.values(fontSizeConfig).map((c) => c.base);
      // 先移除可能存在的 font-size class
      root.classList.remove(...allBases);
      // 再加上目前的 base class
      if (cfg.base) root.classList.add(cfg.base);
    }
  }, [userConfig.fontSize]);

  return <>{children}</>;
}
