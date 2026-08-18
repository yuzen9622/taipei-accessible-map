"use client";

import {
  AlertTriangle,
  Camera,
  Construction,
  Loader2,
  MapPin,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useAppTranslation } from "@/i18n/client";
import { createHazardReport } from "@/lib/api/a11y";
import { reverseGeocode } from "@/lib/api/placeSearch";
import { haversineMeters } from "@/lib/geo";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import { Button } from "../ui/button";

export const MAX_REPORT_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_REPORT_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export function validateHazardPhoto(file: {
  size: number;
  type: string;
}):
  | { valid: true }
  | { valid: false; error: "IMAGE_TOO_LARGE" | "INVALID_IMAGE_TYPE" } {
  if (
    !ALLOWED_REPORT_PHOTO_TYPES.includes(file.type) &&
    !file.type.startsWith("image/")
  ) {
    return { valid: false, error: "INVALID_IMAGE_TYPE" };
  }
  if (file.size > MAX_REPORT_PHOTO_SIZE_BYTES) {
    return { valid: false, error: "IMAGE_TOO_LARGE" };
  }
  return { valid: true };
}

const HAZARD_TYPES = [
  { value: "obstacle" as const, Icon: TriangleAlert, color: "text-amber-500" },
  {
    value: "construction" as const,
    Icon: Construction,
    color: "text-orange-500",
  },
  { value: "data_error" as const, Icon: AlertTriangle, color: "text-red-500" },
];

export default function HazardReportPanel({
  onClose,
  hideHeader,
}: {
  onClose: () => void;
  hideHeader?: boolean;
}) {
  const { t, i18n } = useAppTranslation();
  const hazardTypeLabelId = useId();
  const descriptionId = useId();
  const { userLocation, pendingReportContext, setPendingReportContext } =
    useMapStore(
      useShallow((s) => ({
        userLocation: s.userLocation,
        pendingReportContext: s.pendingReportContext,
        setPendingReportContext: s.setPendingReportContext,
      })),
    );
  const { user, requestAuthDialog } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      requestAuthDialog: s.requestAuthDialog,
    })),
  );

  const [hazardType, setHazardType] = useState<
    "obstacle" | "construction" | "data_error"
  >("obstacle");
  const [description, setDescription] = useState("");

  // A place detail's "我知道 → 回報" link on an unconfirmed a11y item hands
  // off a pre-filled description this way — consumed once on mount (not a
  // live subscription) so a later unrelated report doesn't inherit stale
  // context.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only, see above
  useEffect(() => {
    if (!pendingReportContext) return;
    setDescription(pendingReportContext);
    setHazardType("data_error");
    setPendingReportContext("");
  }, []);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [addressFailed, setAddressFailed] = useState(false);

  // Raw lat/lng told the user nothing about whether this is actually the
  // spot they meant to report — reverse-geocode to a readable address (same
  // Nominatim call MapControlsWrapper's share dialog already makes) and
  // show that as the primary line, coordinates demoted to a secondary line.
  //
  // `userLocation` is a fresh object on every GPS fix (watchPosition can tick
  // roughly once a second), so re-querying on every change would hammer
  // Nominatim's public instance well past its ~1 req/sec usage policy and
  // risk getting the origin rate-limited. Only re-query once the user has
  // actually moved a meaningful distance.
  const lastQueriedRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!userLocation) return;
    const last = lastQueriedRef.current;
    if (last) {
      const moved = haversineMeters(last, userLocation);
      if (moved < 30) return;
    }
    lastQueriedRef.current = { lat: userLocation.lat, lng: userLocation.lng };
    const controller = new AbortController();
    const lang = i18n.language === "zh-TW" ? "zh-TW" : "en";
    setAddressFailed(false);
    reverseGeocode(
      {
        lat: userLocation.lat,
        lng: userLocation.lng,
        lang,
        zoom: 16,
      },
      controller.signal,
    )
      .then((formatted) => {
        const a = formatted?.address;
        if (!a) {
          setAddressFailed(true);
          return;
        }
        const composed = [
          a.city || a.county || "",
          a.suburb || a.city_district || a.town || "",
          a.road || a.neighbourhood || "",
        ]
          .filter(Boolean)
          .join(lang === "zh-TW" ? "" : ", ");
        setAddress(composed || formatted.display_name || null);
      })
      .catch((err) => {
        if ((err as Error)?.name === "AbortError") return;
        setAddressFailed(true);
      });
    return () => controller.abort();
  }, [userLocation, i18n.language]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateHazardPhoto(file);
    if (!validation.valid) {
      if (validation.error === "INVALID_IMAGE_TYPE") {
        toast.error(t("invalidImageType", "僅支援 JPG、PNG、WebP 等圖片格式"));
      } else if (validation.error === "IMAGE_TOO_LARGE") {
        toast.error(t("imageTooLarge", "圖片大小不能超過 5MB"));
      }
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = useCallback(async () => {
    if (!userLocation) {
      toast.error("無法取得您的位置");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("hazardType", hazardType);
      formData.append("latitude", String(userLocation.lat));
      formData.append("longitude", String(userLocation.lng));
      if (description) formData.append("description", description);
      if (photo) formData.append("photo", photo);

      const res = await createHazardReport(formData);
      if (res.ok) {
        toast.success(t("reportSuccess"));
        onClose();
      } else {
        toast.error(t("reportFailed"));
      }
    } catch {
      toast.error(t("reportFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [hazardType, description, photo, userLocation, t, onClose]);

  return (
    <div className="space-y-4">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
            {t("reportHazard")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Not blocking the form — anonymous submission may still work — but
          telling the user upfront instead of only finding out after they've
          filled everything in and hit send. */}
      {!user && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
          <span>{t("reportLoginHint", "登入後回報會記在你的帳號下")}</span>
          <button
            type="button"
            onClick={requestAuthDialog}
            className="shrink-0 font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300"
          >
            {t("loginRegisterCta")}
          </button>
        </div>
      )}

      {/* Location — readable address first (so the user can actually
          confirm this is the right spot), raw coordinates demoted to a
          secondary line rather than being the only thing shown. */}
      {userLocation && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-foreground">
              {address ??
                (addressFailed
                  ? t("addressLookupFailed", "無法取得地址，仍可送出回報")
                  : t("locating", "定位中…"))}
            </p>
            <p className="tabular-nums">
              {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
            </p>
          </div>
        </div>
      )}

      {/* Hazard Type — a single-select group of buttons, not a real <label>
          target, so it gets the group/radio ARIA pattern instead of
          `htmlFor` (which has nothing valid to point at here). */}
      <div>
        <span
          id={hazardTypeLabelId}
          className="text-sm font-medium text-muted-foreground mb-2 block"
        >
          {t("hazardType")}
        </span>
        <div className="flex gap-2">
          {HAZARD_TYPES.map((ht) => (
            <button
              key={ht.value}
              type="button"
              aria-pressed={hazardType === ht.value}
              onClick={() => setHazardType(ht.value)}
              className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all border ${
                hazardType === ht.value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <ht.Icon className={`h-5 w-5 ${ht.color}`} aria-hidden="true" />
              {t(ht.value === "data_error" ? "dataError" : ht.value)}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor={descriptionId}
          className="text-sm font-medium text-muted-foreground mb-2 block"
        >
          {t("hazardDesc")}
        </label>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("hazardDescPlaceholder")}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Photo */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        {photoPreview ? (
          <div className="relative">
            {/* biome-ignore lint/performance/noImgElement: local data URL preview from file picker */}
            <img
              src={photoPreview}
              alt="preview"
              className="w-full h-32 object-cover rounded-xl"
            />
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setPhotoPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 h-20 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Camera className="h-4 w-4" />
            {t("takePhoto")}
          </button>
        )}
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full rounded-xl h-11 gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {t("submitReport")}
          </>
        )}
      </Button>
    </div>
  );
}
