"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { getJSON } from "@/lib/api";

type AvatarAsset =
  | { type: "single"; path: string }
  | { type: "gendered"; variants: { m?: string; f?: string } };

type PremiumCatalogItem = {
  kind?: "frame" | "name" | "avatar";
  title?: string;

  icon?: string; // для рамок і імен — іконка
  overlay?: string; // для рамок — оверлей (якщо є)

  asset?: AvatarAsset | null; // для аватарів
  css?: { type?: "solid" | "gradient"; value?: string } | null; // для імен
};

type PremiumCatalogResponse = {
  ok: boolean;
  catalog: Record<string, PremiumCatalogItem>;
};

type MemberRow = {
  tg_id: number;
  name: string;
  role: string;
  level: number;
};

type MembersResponse = {
  ok: boolean;
  members: MemberRow[];
  error?: string;
};

type PlayerMiniDTO = {
  tg_id: number;
  name: string;

  race_key?: string | null;
  gender?: string | null;

  equipped_frame_sku?: string | null;
  equipped_name_sku?: string | null;
  equipped_avatar_sku?: string | null;
};

type PlayersMiniResponse = { ok: boolean; players: PlayerMiniDTO[] };

const RACE_IMAGE_BASE: Record<string, string> = {
  human: "race_human",
  vovkulak: "race_vovkulak",
  naviy: "race_naviy",
  mavchyn: "race_mavchyn",
  chugaister: "race_chugaister",
  upyr: "race_upyr",
};

type NameStyle =
  | { type: "solid"; value: string }
  | { type: "gradient"; value: string };

const NAME_STYLE_FALLBACK: Record<string, NameStyle> = {
  name_amber: { type: "solid", value: "#fbbf24" },
  name_amethyst: { type: "solid", value: "#a855f7" },
  name_emerald: { type: "solid", value: "#34d399" },
  name_crimson: { type: "solid", value: "#ef4444" },
  name_sapphire: { type: "solid", value: "#38bdf8" },
  name_frost: { type: "solid", value: "#93c5fd" },
  name_gold: { type: "solid", value: "#f59e0b" },
  name_obsidian: { type: "solid", value: "#cbd5e1" },
  name_sunset: { type: "gradient", value: "linear-gradient(90deg,#f59e0b,#ef4444)" },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getRaceImage(player: { race_key?: string | null; gender?: string | null }): string | null {
  const key = player.race_key || "";
  const base = RACE_IMAGE_BASE[key];
  if (!base) return null;
  const suffix = player.gender === "f" ? "_f" : "_m";
  return `/races/${base}${suffix}.png`;
}

function getNameStyle(
  nameSku?: string | null,
  catalog?: Record<string, PremiumCatalogItem> | null
): NameStyle | null {
  if (!nameSku) return null;

  const c = catalog?.[nameSku];
  const css = c?.css;
  if (css && typeof css === "object") {
    const t = (css.type || "").toLowerCase();
    const v = String(css.value || "");
    if (t === "solid" && v) return { type: "solid", value: v };
    if (t === "gradient" && v) return { type: "gradient", value: v };
  }

  return NAME_STYLE_FALLBACK[nameSku] || null;
}

function normalizeSku(sku: string) {
  let s = (sku || "").trim();
  if (!s) return s;
  if (s.startsWith("/") || s.startsWith("http://") || s.startsWith("https://")) return s;
  s = s.replace(/\.png$/i, "").replace(/\.webp$/i, "");
  return s;
}

function getAvatarCandidate(
  avatarSku?: string | null,
  gender?: string | null,
  catalog?: Record<string, PremiumCatalogItem> | null
) {
  if (!avatarSku) return null;
  if (avatarSku.startsWith("/") || avatarSku.startsWith("http")) return avatarSku;

  const base = normalizeSku(avatarSku);
  const item = catalog?.[avatarSku] || catalog?.[base] || null;

  const asset = item?.asset as AvatarAsset | null | undefined;
  if (asset?.type === "single" && asset.path) return asset.path;

  if (asset?.type === "gendered" && asset.variants) {
    const g = gender === "f" ? "f" : "m";
    const v = (asset.variants as any)?.[g];
    if (typeof v === "string" && v) return v;
  }

  if (item?.icon) return item.icon;

  return `/avatars/${base}.png`;
}

// ─────────────────────────────────────────────────────────────
// Frame helpers (overlay + fallback icon)
// ─────────────────────────────────────────────────────────────

function normalizeFrameBaseSku(sku: string) {
  let s = (sku || "").trim();
  if (!s) return s;

  if (s.startsWith("/") || s.startsWith("http://") || s.startsWith("https://")) return s;

  s = s.replace(/\.png$/i, "").replace(/\.webp$/i, "");
  if (s.endsWith("_icon")) s = s.slice(0, -5);
  if (s.endsWith("_overlay")) s = s.slice(0, -8);
  return s;
}

function toOverlayPath(p: string) {
  if (!p) return p;
  if (p.includes("_overlay")) return p;
  if (p.includes("_icon.")) return p.replace("_icon.", "_overlay.");
  if (p.includes("_icon")) return p.replace("_icon", "_overlay");
  return p;
}

function toIconPath(p: string) {
  if (!p) return p;
  if (p.includes("_icon")) return p;
  if (p.includes("_overlay.")) return p.replace("_overlay.", "_icon.");
  if (p.includes("_overlay")) return p.replace("_overlay", "_icon");
  return p;
}

function getFrameOverlayCandidate(
  frameSku?: string | null,
  catalog?: Record<string, PremiumCatalogItem> | null
) {
  if (!frameSku) return null;

  if (frameSku.startsWith("/") || frameSku.startsWith("http")) {
    return toOverlayPath(frameSku);
  }

  const base = normalizeFrameBaseSku(frameSku);
  const c = catalog?.[frameSku] || catalog?.[base] || null;

  const fromCatalog = c?.overlay || c?.icon;
  if (fromCatalog) return toOverlayPath(fromCatalog);

  return `/premium/${base}_overlay.png`;
}

function getFrameIconCandidate(
  frameSku?: string | null,
  catalog?: Record<string, PremiumCatalogItem> | null
) {
  if (!frameSku) return null;

  if (frameSku.startsWith("/") || frameSku.startsWith("http")) {
    return toIconPath(frameSku);
  }

  const base = normalizeFrameBaseSku(frameSku);
  const c = catalog?.[frameSku] || catalog?.[base] || null;

  const fromCatalog = c?.icon || c?.overlay;
  if (fromCatalog) return toIconPath(fromCatalog);

  return `/premium/${base}_icon.png`;
}

// ─────────────────────────────────────────────────────────────
// Image resolver
// ─────────────────────────────────────────────────────────────

function useResolvedImageSrc(candidates: (string | null | undefined)[]) {
  const key = useMemo(() => candidates.filter(Boolean).join("|"), [candidates]);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSrc(null);

    (async () => {
      for (const c of candidates) {
        if (!c) continue;
        try {
          const img = new window.Image();
          img.decoding = "async";
          img.src = c;
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej(new Error("load failed"));
          });
          if (!alive) return;
          setSrc(c);
          return;
        } catch {
          // next
        }
      }
      if (alive) setSrc(null);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return src;
}

// ─────────────────────────────────────────────────────────────
// Auto scale for frame (✅ FIX TS: ctx = CanvasRenderingContext2D)
// ─────────────────────────────────────────────────────────────

const FRAME_SCALE_CACHE = new Map<string, number>();

function useAutoFrameScale(frameSrc: string | null, extra = 1.24) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let alive = true;

    if (!frameSrc) {
      setScale(1);
      return;
    }

    const cacheKey = `${frameSrc}::${extra}::v2`;
    const cached = FRAME_SCALE_CACHE.get(cacheKey);
    if (cached !== undefined) {
      setScale(cached);
      return;
    }

    (async () => {
      try {
        const img = new window.Image();
        img.decoding = "async";
        img.src = frameSrc;

        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("Frame image load failed"));
        });

        const w0 = img.naturalWidth || img.width;
        const h0 = img.naturalHeight || img.height;

        const MAX = 384;
        const k = Math.min(1, MAX / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * k));
        const h = Math.max(1, Math.round(h0 * k));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        // ✅ КЛЮЧОВИЙ ФІКС: без options/as any, щоб TS взяв overload "2d"
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No canvas ctx");

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const { data } = ctx.getImageData(0, 0, w, h);

        function bboxFor(threshold: number) {
          let minX = w,
            minY = h,
            maxX = -1,
            maxY = -1;

          for (let y = 1; y < h - 1; y += 1) {
            for (let x = 1; x < w - 1; x += 1) {
              const a = data[(y * w + x) * 4 + 3];
              if (a > threshold) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (maxX < 0 || maxY < 0) return null;

          const pad = 1;
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(w - 1, maxX + pad);
          maxY = Math.min(h - 1, maxY + pad);

          const bw = Math.max(1, maxX - minX + 1);
          const bh = Math.max(1, maxY - minY + 1);
          return { bw, bh };
        }

        const thresholds = [10, 28, 52, 78];
        const candidates: number[] = [];

        for (const t of thresholds) {
          const bb = bboxFor(t);
          if (!bb) continue;

          const minFrac = 0.35;
          if (bb.bw < w * minFrac || bb.bh < h * minFrac) continue;

          const auto = Math.max(w / bb.bw, h / bb.bh);
          candidates.push(auto);
        }

        const auto = candidates.length ? Math.max(...candidates) : 1;
        const finalScale = clamp(auto * extra, 1, 4);

        FRAME_SCALE_CACHE.set(cacheKey, finalScale);
        if (alive) setScale(finalScale);
      } catch {
        const fallback = 1.0;
        FRAME_SCALE_CACHE.set(`${frameSrc}::${extra}::v2`, fallback);
        if (alive) setScale(fallback);
      }
    })();

    return () => {
      alive = false;
    };
  }, [frameSrc, extra]);

  return scale;
}

// ─────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────

function StyledName({
  name,
  nameSku,
  catalog,
}: {
  name: string;
  nameSku?: string | null;
  catalog?: Record<string, PremiumCatalogItem> | null;
}) {
  const style = getNameStyle(nameSku, catalog);

  if (!style) return <span className="font-semibold">{name || "Безіменний"}</span>;

  if (style.type === "solid") {
    return (
      <span className="font-semibold" style={{ color: style.value }}>
        {name || "Безіменний"}
      </span>
    );
  }

  return (
    <span
      className="font-semibold"
      style={{
        backgroundImage: style.value,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {name || "Безіменний"}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const r = (role || "").toLowerCase();
  const label = r === "hetman" ? "Гетьман" : "Воїн";

  return (
    <span
      className={[
        "px-2 py-[2px] rounded-full text-[11px] font-semibold border",
        r === "hetman"
          ? "border-amber-400/70 bg-amber-500/10 text-amber-200"
          : "border-slate-600/70 bg-slate-900/40 text-slate-200",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function MemberAvatar({
  p,
  catalog,
  size = 56,
}: {
  p: PlayerMiniDTO | null;
  catalog: Record<string, PremiumCatalogItem> | null;
  size?: number;
}) {
  const overlayCandidate = useMemo(() => {
    const sku = p?.equipped_frame_sku || null;
    return getFrameOverlayCandidate(sku, catalog);
  }, [p?.equipped_frame_sku, catalog]);

  const iconCandidate = useMemo(() => {
    const sku = p?.equipped_frame_sku || null;
    return getFrameIconCandidate(sku, catalog);
  }, [p?.equipped_frame_sku, catalog]);

  const frameSrc = useResolvedImageSrc([overlayCandidate, iconCandidate]);
  const frameScale = useAutoFrameScale(frameSrc, 1.24);

  const raceImg = useMemo(() => (p ? getRaceImage(p) : null), [p?.race_key, p?.gender]);

  const avatarCandidates = useMemo(() => {
    const list: (string | null)[] = [];
    const premium = getAvatarCandidate(p?.equipped_avatar_sku || null, p?.gender ?? null, catalog);
    if (premium) list.push(premium);
    if (raceImg) list.push(raceImg);
    return list;
  }, [p?.equipped_avatar_sku, p?.gender, catalog, raceImg]);

  const avatarSrc = useResolvedImageSrc(avatarCandidates);

  return (
    <div className="relative shrink-0 overflow-visible" style={{ width: size, height: size }}>
      <div
        className={[
          "absolute inset-0 overflow-hidden bg-slate-800/80",
          frameSrc ? "rounded-none" : "rounded-2xl border border-amber-500/35",
        ].join(" ")}
      >
        {avatarSrc ? (
          <Image src={avatarSrc} alt="" fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">🕯️</div>
        )}
      </div>

      {frameSrc && (
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src={frameSrc}
            alt=""
            fill
            sizes={`${size}px`}
            className="object-contain"
            style={{ transform: `scale(${frameScale})`, transformOrigin: "center" }}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function ZastavaMembersPage() {
  const router = useRouter();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [players, setPlayers] = useState<Record<number, PlayerMiniDTO>>({});
  const [catalog, setCatalog] = useState<Record<string, PremiumCatalogItem> | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        // catalog
        try {
          const c = await getJSON<PremiumCatalogResponse>("/api/premium/catalog", { cache: "no-store" });
          if (alive && c?.ok && c.catalog) setCatalog(c.catalog);
        } catch {}

        // members
        const m = await getJSON<MembersResponse>("/api/zastavy/members", { cache: "no-store" });
        if (!alive) return;

        if (!m?.ok) {
          setErr(m?.error || "Не вдалося завантажити учасників застави.");
          setMembers([]);
          return;
        }

        const list = Array.isArray(m.members) ? m.members : [];
        setMembers(list);

        const ids = Array.from(
          new Set(list.map((x) => Number(x.tg_id)).filter((n) => Number.isFinite(n) && n > 0))
        );

        if (ids.length) {
          // ✅ якщо у бекенді параметр називається ids (як у рейтингах) — працюватиме:
          // /api/players/mini?ids=1,2,3
          // якщо у тебе tg_ids — просто зміни тут на tg_ids.
          const resp = await getJSON<PlayersMiniResponse>(`/api/players/mini?ids=${ids.join(",")}`, {
            cache: "no-store",
          });

          if (!alive) return;

          if (resp?.ok && Array.isArray(resp.players)) {
            const map: Record<number, PlayerMiniDTO> = {};
            for (const p of resp.players) map[p.tg_id] = p;
            setPlayers(map);
          }
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Помилка завантаження.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 px-4 py-5">
      <div className="mx-auto w-full max-w-xl relative">
        <div className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-30 bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.20),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.20),transparent_60%)]" />

        <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200">
            ← Назад
          </button>
          <h1 className="mt-2 text-xl font-semibold text-center">Учасники застави</h1>
          <p className="mt-2 text-sm text-slate-400">Тут видно всіх козаків твоєї застави з їхнім званням та рівнем.</p>
        </motion.header>

        {err && (
          <div className="mb-3 rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {err}
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-slate-400 mt-6">Завантаження…</div>
        ) : (
          <div className="space-y-3">
            {members.map((m) => {
              const p = players[m.tg_id] || null;

              const name = p?.name || m.name || "Безіменний козак";
              const nameSku = p?.equipped_name_sku || null;

              return (
                <div key={m.tg_id} className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar p={p} catalog={catalog} size={56} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-lg">
                          <StyledName name={name} nameSku={nameSku} catalog={catalog} />
                        </div>
                        <RoleBadge role={m.role} />
                      </div>

                      <div className="mt-1 text-xs text-slate-400">tg_id: {m.tg_id}</div>
                    </div>

                    <div className="text-sm text-slate-300 shrink-0">Рівень {m.level}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-full border border-slate-700/80 bg-slate-900/70 text-sm text-slate-200 hover:border-sky-400 hover:text-sky-200 transition"
          >
            ← Повернутися у місто
          </button>
        </div>
      </div>
    </main>
  );
}