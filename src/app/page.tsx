"use client";
import dynamic from "next/dynamic";

const ClientMap = dynamic(() => import("@/components/ClientMap"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className=" w-full h-full flex flex-col">
      <ClientMap />
    </div>
  );
}
