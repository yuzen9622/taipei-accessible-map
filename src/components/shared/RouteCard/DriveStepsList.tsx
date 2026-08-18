import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { DriveStep } from "@/types/route";
import { formatDistance, formatDuration } from "@/types/route";

export function DriveStepsList({ steps }: { steps?: DriveStep[] }) {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-1">
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
        <span>{t("viewDriveSteps") ?? "查看路線細節"}</span>
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
          <ul className="pl-3.5 my-2 space-y-1.5 border-l border-muted-foreground/30 ml-3.5">
            {steps.map((step) => (
              <li
                key={`${step.instruction || "step"}-${step.distanceM ?? 0}-${step.durationMin ?? 0}`}
                className="text-xs text-muted-foreground"
              >
                <span className="text-foreground">{step.instruction}</span>
                {" · "}
                {formatDistance(step.distanceM)} ·{" "}
                {formatDuration(step.durationMin)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
