import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { IntermediateStop } from "@/types/route";

export function IntermediateStops({
  stops,
  color,
}: {
  stops?: IntermediateStop[];
  color: string;
}) {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  if (!stops || stops.length === 0) return null;

  return (
    <div className="my-1.5 ml-2.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={listId}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 px-2 py-2.5 lg:py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
            isOpen && "rotate-180",
          )}
        />
        <span>{t("passStops", { count: stops.length })}</span>
      </button>

      <div
        id={listId}
        aria-hidden={!isOpen}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="pl-3.5 my-2 space-y-2 border-l border-muted-foreground/30 ml-3.5">
            {stops.map((stop) => (
              <div
                key={stop.stationUid || stop.name}
                className="flex items-center gap-2.5 text-xs text-muted-foreground relative"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 border border-background"
                  style={{ backgroundColor: color }}
                />
                <span>{stop.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
