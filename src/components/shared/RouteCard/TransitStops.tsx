import { useAppTranslation } from "@/i18n/client";
import type { IntermediateStop, SlimOsmA11y } from "@/types/route";
import { A11yStationIcons } from "./A11yStationIcons";
import { IntermediateStops } from "./IntermediateStops";

export function TransitStops({
  boardName,
  alightName,
  boardTime,
  alightTime,
  intermediateStops,
  color,
  departureA11y,
  arrivalA11y,
  isSelected,
}: {
  boardName?: string;
  alightName?: string;
  boardTime?: string;
  alightTime?: string;
  intermediateStops?: IntermediateStop[];
  color: string;
  departureA11y?: SlimOsmA11y[];
  arrivalA11y?: SlimOsmA11y[];
  isSelected?: boolean;
}) {
  const { t } = useAppTranslation();
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground shrink-0">
          {t("board")}
          {t("labelColon")}
        </span>
        <span className="font-medium">{boardName}</span>
        {boardTime && (
          <span className="text-muted-foreground">{boardTime}</span>
        )}
      </div>
      {isSelected && (
        <A11yStationIcons
          items={departureA11y}
          ariaLabel={t("departureA11yLabel") ?? "出發站無障礙設施"}
        />
      )}
      <IntermediateStops stops={intermediateStops} color={color} />
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground shrink-0">
          {t("alight")}
          {t("labelColon")}
        </span>
        <span className="font-medium">{alightName}</span>
        {alightTime && (
          <span className="text-muted-foreground">{alightTime}</span>
        )}
      </div>
      {isSelected && (
        <A11yStationIcons
          items={arrivalA11y}
          ariaLabel={t("arrivalA11yLabel") ?? "到達站無障礙設施"}
        />
      )}
    </div>
  );
}
