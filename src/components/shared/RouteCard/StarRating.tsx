import { cn } from "@/lib/utils";

export function StarRating({
  filled,
  colorClass,
  ariaLabel,
}: {
  filled: number;
  colorClass: string;
  ariaLabel: string;
}) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 20 20"
          className={cn(
            "h-4 w-4",
            star <= filled ? colorClass : "text-muted-foreground/25",
          )}
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27 5.23 15.71l.91-5.32L2.27 6.62l5.34-.78z"
          />
        </svg>
      ))}
    </span>
  );
}
