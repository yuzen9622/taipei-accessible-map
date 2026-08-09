"use client";

import { useEffect } from "react";
import { fallbackLng, languages } from "@/i18n/setting";

export default function RootPage() {
  useEffect(() => {
    // Capacitor 的 asset router 不解析目錄索引（無副檔名一律回根 index.html），
    // 所以必須用帶 index.html 的絕對路徑，否則會無限重載。
    const segment = window.location.pathname.split("/").filter(Boolean)[0];
    const lng = segment && languages.includes(segment) ? segment : fallbackLng;
    window.location.replace(`/${lng}/index.html`);
  }, []);

  return <main></main>;
}
