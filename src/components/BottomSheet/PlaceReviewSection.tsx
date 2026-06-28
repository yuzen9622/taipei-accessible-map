"use client";

import { MessageSquare, Star, ThumbsUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface ReviewRatings {
  passageWidth: number;
  restroomQuality: number;
  elevatorCondition: number;
  serviceAttitude: number;
}

interface PlaceReview {
  id: string;
  ratings: ReviewRatings;
  comment: string;
  author: string;
  createdAt: string;
  helpful: number;
}

const RATING_KEYS: (keyof ReviewRatings)[] = [
  "passageWidth",
  "restroomQuality",
  "elevatorCondition",
  "serviceAttitude",
];

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        >
          <Star
            className={`h-4 w-4 ${
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function getStorageKey(placeId: string) {
  return `reviews_${placeId}`;
}

export default function PlaceReviewSection({ placeId }: { placeId: string }) {
  const { t } = useAppTranslation();
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [ratings, setRatings] = useState<ReviewRatings>({
    passageWidth: 0,
    restroomQuality: 0,
    elevatorCondition: 0,
    serviceAttitude: 0,
  });
  const [comment, setComment] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(placeId));
      if (stored) setReviews(JSON.parse(stored));
      else setReviews([]);
    } catch {
      setReviews([]);
    }
  }, [placeId]);

  const handleSubmit = useCallback(() => {
    const hasRating = Object.values(ratings).some((v) => v > 0);
    if (!hasRating && !comment.trim()) return;

    const review: PlaceReview = {
      id: Date.now().toString(),
      ratings,
      comment: comment.trim(),
      author: "匿名使用者",
      createdAt: new Date().toISOString(),
      helpful: 0,
    };

    const updated = [review, ...reviews];
    setReviews(updated);
    localStorage.setItem(getStorageKey(placeId), JSON.stringify(updated));
    setRatings({ passageWidth: 0, restroomQuality: 0, elevatorCondition: 0, serviceAttitude: 0 });
    setComment("");
    setShowForm(false);
  }, [ratings, comment, reviews, placeId]);

  const handleHelpful = useCallback(
    (reviewId: string) => {
      const updated = reviews.map((r) =>
        r.id === reviewId ? { ...r, helpful: r.helpful + 1 } : r
      );
      setReviews(updated);
      localStorage.setItem(getStorageKey(placeId), JSON.stringify(updated));
    },
    [reviews, placeId]
  );

  const reviewsWithScores = useMemo(() =>
    reviews.map((r) => {
      const vals = Object.values(r.ratings).filter((v) => v > 0);
      return { ...r, avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
    }),
    [reviews],
  );

  const avgScore = useMemo(() => {
    if (reviewsWithScores.length === 0) return 0;
    return reviewsWithScores.reduce((sum, r) => sum + r.avg, 0) / reviewsWithScores.length;
  }, [reviewsWithScores]);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" />
          {t("reviewTitle")}
          {reviews.length > 0 && (
            <Badge variant="secondary" className="text-xs ml-1">
              {reviews.length}
            </Badge>
          )}
        </h2>
        {avgScore > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {avgScore.toFixed(1)}
          </div>
        )}
      </div>

      {/* Write review button / form */}
      {!showForm ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl mb-3 gap-1.5"
        >
          <Star className="h-3.5 w-3.5" />
          {t("writeReview")}
        </Button>
      ) : (
        <div className="rounded-xl bg-muted/30 p-3 space-y-3 mb-3">
          {RATING_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t(key)}</span>
              <StarRating
                value={ratings[key]}
                onChange={(v) => setRatings((prev) => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("reviewPlaceholder")}
            className="w-full text-sm bg-background border border-border rounded-lg p-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl"
            >
              {t("cancel") || "取消"}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              className="flex-1 rounded-xl"
            >
              {t("submitReview")}
            </Button>
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="space-y-2">
          {reviewsWithScores.slice(0, 5).map((review) => (
              <div
                key={review.id}
                className="rounded-xl bg-muted/40 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{review.author}</span>
                    {review.avg > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs text-muted-foreground">{review.avg.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm leading-relaxed">{review.comment}</p>
                )}
                <button
                  type="button"
                  onClick={() => handleHelpful(review.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ThumbsUp className="h-3 w-3" />
                  {t("reviewHelpful")} {review.helpful > 0 && `(${review.helpful})`}
                </button>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-2">{t("noReviews")}</p>
      )}
    </section>
  );
}
