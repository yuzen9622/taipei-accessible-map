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
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppTranslation } from "@/i18n/client";
import { createHazardReport } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import { Button } from "../ui/button";

const HAZARD_TYPES = [
  { value: "obstacle" as const, Icon: TriangleAlert, color: "text-amber-500" },
  { value: "construction" as const, Icon: Construction, color: "text-orange-500" },
  { value: "data_error" as const, Icon: AlertTriangle, color: "text-red-500" },
];

export default function HazardReportPanel({ onClose }: { onClose: () => void }) {
  const { t } = useAppTranslation();
  const { userLocation } = useMapStore();

  const [hazardType, setHazardType] = useState<"obstacle" | "construction" | "data_error">("obstacle");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

      {/* Location */}
      {userLocation && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}</span>
        </div>
      )}

      {/* Hazard Type */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          {t("hazardType")}
        </label>
        <div className="flex gap-2">
          {HAZARD_TYPES.map((ht) => (
            <button
              key={ht.value}
              type="button"
              onClick={() => setHazardType(ht.value)}
              className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all border ${
                hazardType === ht.value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <ht.Icon className={`h-5 w-5 ${ht.color}`} />
              {t(ht.value === "data_error" ? "dataError" : ht.value)}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          {t("hazardDesc")}
        </label>
        <textarea
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
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        {photoPreview ? (
          <div className="relative">
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
