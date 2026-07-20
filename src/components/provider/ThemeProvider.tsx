"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type * as React from "react";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
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
  const { userConfig } = useAuthStore(
    useShallow((s) => ({ userConfig: s.userConfig })),
  );
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

    if (typeof window !== "undefined") {
      const root = document.documentElement;
      Object.entries(cfg.cssVars || {}).forEach(([k, v]) => {
        root.style.setProperty(k, v as string);
      });

      const allBases = Object.values(fontSizeConfig).map((c) => c.base);
      root.classList.remove(...allBases);
      if (cfg.base) root.classList.add(cfg.base);
    }
  }, [userConfig.fontSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (userConfig.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  }, [userConfig.highContrast]);

  return <>{children}</>;
}
