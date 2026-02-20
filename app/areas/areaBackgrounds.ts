export type AreaBg = {
  video: string;
  poster?: string; // ✅ є в типі, але можемо не задавати
};

export const areaBackgrounds: Record<string, AreaBg> = {
  slums:   { video: "/areas/netrytsia.mp4" },
  suburbs: { video: "/areas/peredmistya.mp4" },
  swamp:   { video: "/areas/bolota.mp4" },
  ruins:   { video: "/areas/forpost.mp4" },
  quarry:  { video: "/areas/karjer.mp4" },
  ridge:  { video: "/areas/hrebet.mp4" },
  crown:  { video: "/areas/kryzhana.mp4" },
};

export function resolveAreaBg(areaKey?: string | null): AreaBg {
  const k = String(areaKey || "").toLowerCase();
  return areaBackgrounds[k] ?? areaBackgrounds.slums;
}