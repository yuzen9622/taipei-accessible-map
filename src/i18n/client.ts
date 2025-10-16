import i18n from "i18next";
import { redirect, usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  initReactI18next,
  useTranslation as useReactTranslation,
} from "react-i18next";
import en from "@/i18n/locale/en/translation.json";
import zhTW from "@/i18n/locale/zh-TW/translation.json";
import type { LanguageEnum } from "@/lib/config";
import useAuthStore from "@/stores/useAuthStore";

const resources = {
  en: { translation: en },
  "zh-TW": { translation: zhTW },
};

// init 只要執行一次
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "zh-TW",
    fallbackLng: "zh-TW",
    supportedLngs: ["en", "zh-TW"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export function changeAppLanguage(lng: "en" | "zh-TW") {
  void i18n.changeLanguage(lng);
}

// client-safe useTranslation wrapper
// 用法： const { t, i18n } = useAppTranslation(); 或 useAppTranslation("en", "translation");
export function useAppTranslation(ns?: string | string[]) {
  const ret = useReactTranslation(ns as string, { useSuspense: false });
  const path = usePathname();

  const lang = path.split("/")[1];
  const { updateUserConfig, userConfig } = useAuthStore();
  useEffect(() => {
    if (!userConfig.language) return;
    // 只有在語言不同時才切換，避免重複呼叫
    if (ret.i18n.language !== userConfig.language) {
      void ret.i18n.changeLanguage(userConfig.language);
      updateUserConfig({ language: userConfig.language as LanguageEnum });
    }
  }, [userConfig.language, ret.i18n, updateUserConfig]);
  useEffect(() => {
    // 只有在語言不同時才切換，避免重複呼叫
    if (userConfig.language !== lang) {
      redirect(`/${userConfig.language}`);
    }
  }, [lang, userConfig.language]);
  return ret;
}

export default i18n;
