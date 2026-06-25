"use client";

import { Eye, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";

interface AudioSignal {
  id: number;
  lat: number;
  lng: number;
  buttonOperated: boolean | null;
  vibration: boolean | null;
  roadName: string | null;
}

interface TactilePaving {
  id: number;
  lat: number;
  lng: number;
  type: string;
  name: string | null;
  nameEn?: string;
  wheelchair?: string;
}

export default function VisualA11yWrapper() {
  const { t } = useAppTranslation();
  const { map, visualA11yVisible } = useMapStore();
  const [audioSignals, setAudioSignals] = useState<AudioSignal[]>([]);
  const [tactilePaving, setTactilePaving] = useState<TactilePaving[]>([]);
  const [selected, setSelected] = useState<{ type: "audio" | "tactile"; data: AudioSignal | TactilePaving } | null>(null);
  const [zoom, setZoom] = useState(15);

  useEffect(() => {
    if (!visualA11yVisible) return;
    fetch("/data/audio-signals.json")
      .then((r) => r.json())
      .then(setAudioSignals)
      .catch(() => {});
    fetch("/data/tactile-paving.json")
      .then((r) => r.json())
      .then(setTactilePaving)
      .catch(() => {});
  }, [visualA11yVisible]);

  useEffect(() => {
    if (!map) return;
    const handler = () => setZoom(map.getZoom());
    map.on("zoom", handler);
    return () => { map.off("zoom", handler); };
  }, [map]);

  if (!visualA11yVisible || zoom < 14) return null;

  return (
    <>
      {audioSignals.map((s) => (
        <Marker
          key={`audio-${s.id}`}
          longitude={s.lng}
          latitude={s.lat}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelected({ type: "audio", data: s });
          }}
        >
          <div className="h-6 w-6 rounded-full bg-violet-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform">
            <Volume2 className="h-3 w-3 text-white" />
          </div>
        </Marker>
      ))}

      {tactilePaving.map((p) => (
        <Marker
          key={`tactile-${p.id}`}
          longitude={p.lng}
          latitude={p.lat}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelected({ type: "tactile", data: p });
          }}
        >
          <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform">
            <Eye className="h-3 w-3 text-white" />
          </div>
        </Marker>
      ))}

      {selected && (
        <Popup
          longitude={selected.data.lng}
          latitude={selected.data.lat}
          anchor="bottom"
          onClose={() => setSelected(null)}
          closeOnClick={false}
          className="[&_.maplibregl-popup-content]:rounded-xl [&_.maplibregl-popup-content]:p-3 [&_.maplibregl-popup-content]:shadow-lg"
        >
          {selected.type === "audio" ? (
            <AudioPopup signal={selected.data as AudioSignal} t={t} />
          ) : (
            <TactilePopup paving={selected.data as TactilePaving} t={t} />
          )}
        </Popup>
      )}
    </>
  );
}

function AudioPopup({ signal, t }: { signal: AudioSignal; t: (key: string) => string }) {
  return (
    <div className="space-y-1 min-w-[160px]">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Volume2 className="h-3.5 w-3.5 text-violet-500" />
        {t("audioSignals")}
      </p>
      {signal.roadName && (
        <p className="text-xs text-muted-foreground">{signal.roadName}</p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-1">
        {signal.buttonOperated && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
            {t("buttonOperated")}
          </span>
        )}
        {signal.vibration === true && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            {t("hasVibration")}
          </span>
        )}
        {signal.vibration === false && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {t("noVibration")}
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-1">{t("osmDataSource")}</p>
    </div>
  );
}

function TactilePopup({ paving, t }: { paving: TactilePaving; t: (key: string) => string }) {
  const typeLabel = paving.type === "bus_stop" ? t("busStop")
    : paving.type === "kerb" ? t("kerb")
    : t("crossing");

  return (
    <div className="space-y-1 min-w-[160px]">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5 text-orange-500" />
        {t("tactilePaving")}
      </p>
      {paving.name && (
        <p className="text-xs">{paving.name}</p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-1">
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
          {typeLabel}
        </span>
        {paving.wheelchair && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            ♿ {paving.wheelchair}
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-1">{t("osmDataSource")}</p>
    </div>
  );
}
