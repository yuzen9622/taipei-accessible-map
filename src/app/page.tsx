"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Splash from "@/components/Splash";

const ClientMap = dynamic(() => import("@/components/ClientMap"), {
  ssr: false,
});

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // 1) 直接延遲關閉
    const id = window.setTimeout(() => setShowSplash(false), 1500);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className=" w-full h-full flex flex-col">
      <Splash show={showSplash} />
      <ClientMap />
    </div>
  );
}
