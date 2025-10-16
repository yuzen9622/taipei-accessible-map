"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

import useAuthStore from "@/stores/useAuthStore";

export default function GoogleMapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userConfig } = useAuthStore();
  const language = userConfig.language === "zh-TW" ? "zh-TW" : "en";

  return (
    <APIProvider
      key={language}
      version="beta"
      region="zh-TW"
      language={language}
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY ?? ""}
    >
      {children}
    </APIProvider>
  );
}
