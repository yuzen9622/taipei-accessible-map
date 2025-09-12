// 小工具：格式化 24 小時制字串
function formatTime(hhmm?: string) {
  if (!hhmm || hhmm.length < 4) return "";
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

// 營業資訊元件
export function BusinessHours({
  hours,
  highlightToday = true,
}: {
  hours?: google.maps.places.OpeningHours; // 可改成 google.maps.places.PlaceOpeningHours
  highlightToday?: boolean;
}) {
  if (!hours) {
    return (
      <span className="text-sm text-muted-foreground">未提供營業時間</span>
    );
  }

  const today = new Date().getDay(); // 0=週日
  const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

  // 1) 若有 Google 直接提供的描述，直接顯示
  if (Array.isArray(hours.periods) && hours.weekdayDescriptions.length) {
    return (
      <ul className="space-y-1">
        {hours.weekdayDescriptions.map((line: string, idx: number) => (
          <li
            key={line}
            className={highlightToday && idx === today ? "font-medium" : ""}
          >
            {line}
          </li>
        ))}
      </ul>
    );
  }

  // 2) 否則用 periods 自行組裝
  const perDay: Record<number, string[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };

  if (Array.isArray(hours.periods)) {
    for (const p of hours.periods) {
      const openDay = p?.open?.day;
      const openTime = p?.open?.hour;
      const closeDay = p?.close?.day;
      const closeTime = p?.close?.hour;

      if (openDay == null) continue;

      // 沒有 close 視為 24 小時或跨日未提供明確關閉
      if (closeDay == null || !closeTime) {
        perDay[openDay].push("24 小時營業");
      } else {
        perDay[openDay].push(
          `${formatTime(`${openTime}`)} - ${formatTime(`${closeTime}`)}`
        );
      }
    }
  }

  return (
    <ul className="space-y-1">
      {days.map((d, idx) => {
        const slots = perDay[idx];
        const text = slots.length ? slots.join("、") : "休息";
        return (
          <li
            key={d}
            className={highlightToday && idx === today ? "font-medium" : ""}
          >
            {d}：{text}
          </li>
        );
      })}
    </ul>
  );
}
