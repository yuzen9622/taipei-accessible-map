"use client";

import { Loader2, MessageSquare, Star, ThumbsUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createReview, getReviews, getReviewSummary } from "@/lib/api/a11y";
import { useAppTranslation } from "@/i18n/client";
import useAuthStore from "@/stores/useAuthStore";
import type { PlaceReviewData, ReviewSummary } from "@/types/route";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface ReviewRatings {
  passageWidth: number;
  restroomQuality: number;
  elevatorCondition: number;
  serviceAttitude: number;
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

const OSM_TYPES = new Set(["node", "way", "relation"]);

function parseOsmPlaceId(placeId: string): { osmId: string; placeType: string } {
  const parts = placeId.split("_");
  if (parts.length >= 2 && OSM_TYPES.has(parts[0])) {
    return { osmId: parts.slice(1).join("_"), placeType: parts[0] };
  }
  return { osmId: placeId, placeType: "node" };
}

export default function PlaceReviewSection({ placeId }: { placeId: string }) {
  const { t } = useAppTranslation();
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState<PlaceReviewData[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [ratings, setRatings] = useState<ReviewRatings>({
    passageWidth: 0,
    restroomQuality: 0,
    elevatorCondition: 0,
    serviceAttitude: 0,
  });
  const [comment, setComment] = useState("");

  const { osmId, placeType } = parseOsmPlaceId(placeId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [reviewsRes, summaryRes] = await Promise.allSettled([
          getReviews(osmId, placeType),
          getReviewSummary(osmId, placeType),
        ]);
        if (cancelled) return;
        if (reviewsRes.status === "fulfilled" && reviewsRes.value.ok) {
          const data = reviewsRes.value.data as { reviews: PlaceReviewData[]; total: number };
          setReviews(data.reviews || []);
        }
        if (summaryRes.status === "fulfilled" && summaryRes.value.ok) {
          setSummary(summaryRes.value.data as ReviewSummary);
        }
      } catch {
        // API might not have reviews yet — that's fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [osmId, placeType]);

  const handleSubmit = useCallback(async () => {
    const hasRating = Object.values(ratings).some((v) => v > 0);
    if (!hasRating && !comment.trim()) return;

    if (!user) {
      toast.error(t("loginRequired") || "請先登入");
      return;
    }

    const avgRating = (() => {
      const vals = Object.values(ratings).filter((v) => v > 0);
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0;
    })();

    setSubmitting(true);
    try {
      const res = await createReview({
        osmId,
        placeType,
        rating: avgRating || 5,
        comment: comment.trim(),
        ratings: Object.fromEntries(
          Object.entries(ratings).filter(([, v]) => v > 0)
        ),
      });
      if (res.ok && res.data) {
        setReviews((prev) => [res.data as PlaceReviewData, ...prev]);
        setSummary((prev) =>
          prev
            ? { ...prev, totalReviews: prev.totalReviews + 1 }
            : { averageRating: avgRating, totalReviews: 1 }
        );
        toast.success(t("reviewSubmitted") || "評論已送出");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "送出失敗");
    } finally {
      setSubmitting(false);
      setRatings({ passageWidth: 0, restroomQuality: 0, elevatorCondition: 0, serviceAttitude: 0 });
      setComment("");
      setShowForm(false);
    }
  }, [ratings, comment, osmId, placeType, user, t]);

  const avgScore = summary?.averageRating ?? 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" />
          {t("reviewTitle")}
          {(summary?.totalReviews ?? reviews.length) > 0 && (
            <Badge variant="secondary" className="text-xs ml-1">
              {summary?.totalReviews ?? reviews.length}
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
              disabled={submitting}
              className="flex-1 rounded-xl"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {t("submitReview")}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-2">
          {reviews.slice(0, 5).map((review) => (
            <div
              key={review._id}
              className="rounded-xl bg-muted/40 p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{review.userName || "匿名使用者"}</span>
                  {review.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-muted-foreground">{review.rating.toFixed(1)}</span>
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
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ThumbsUp className="h-3 w-3" />
                {t("reviewHelpful")} {(review.helpful ?? 0) > 0 && `(${review.helpful})`}
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
