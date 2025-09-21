"use client";
import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";
import useMapStore from "@/stores/useMapStore";

export default function CategoryIndex() {
  const { searchHistory, savedPlaces, timeline } = useMapStore();

  const shareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        alert(`你的經緯度：${pos.coords.latitude}, ${pos.coords.longitude}`);
      });
    } else {
      alert("無法取得地理位置");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 focus:ring-2 focus:ring-white rounded-full transition-colors duration-200"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-4">
        {/* 搜尋歷史紀錄 */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">🔍 搜尋歷史紀錄</h3>
          <ul>
            {searchHistory.map((item, idx) => (
              <li key={idx} className="ml-2 text-sm">
                <a href={`/search?query=${encodeURIComponent(item)}`} className="hover:underline">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* 分享目前位置 */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">📍 分享目前位置</h3>
          <Button onClick={shareLocation} variant="outline" size="sm">
            分享我的位置
          </Button>
        </div>

        {/* 儲存地點 */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">💾 儲存地點</h3>
          <ul>
            {savedPlaces.map((place, idx) => (
              <li key={idx} className="ml-2 text-sm">{place}</li>
            ))}
          </ul>
        </div>

        {/* 時間軸 */}
        <div>
          <h3 className="font-semibold mb-2">🕒 時間軸</h3>
          <ul>
            {timeline.map((event, idx) => (
              <li key={idx} className="ml-2 text-sm">{event}</li>
            ))}
          </ul>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
