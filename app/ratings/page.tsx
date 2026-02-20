"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { initTg, waitTgId, resolveTgId } from "@/lib/tg";
import { getJSON, ApiError } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ProfileDTO = {
  tg_id: number;
  name: string;
  level: number;
  xp: number;
  xp_needed: number;

  race_key?: string | null;
  class_key?: string | null;
  gender?: string | null;

  hp: number;
  mp: number;
  energy: number;
  energy_max: number;
  hp_max: number;
  mp_max: number;

  atk: number;
  defense: number;

  chervontsi: number;
  kleynody: number;

  carry_weight: number;
  carry_capacity: number;

  equipped_frame_sku?: string | null;
  equipped_name_sku?: string | null;
  equipped_avatar_sku?: string | null;
};

type ProfileResponse = { ok: boolean; player: ProfileDTO };

type AvatarAsset =
  | { type: "single"; path: string }
  | { type: "gendered"; variants: { m?: string; f?: string } };

type PremiumCatalogItem = {
  kind?: "frame" | "name" | "avatar";
  title?: string;
  price_kleynody?: number;

  icon?: string;
  overlay?: string;

  // ✅ для аватарів
  asset?: AvatarAsset | null;

  // ✅ для імен
  css?: { type?: "solid" | "gradient"; value?: string } | null;
};

type PremiumCatalogResponse = {
  ok: boolean;
  catalog: Record<string, PremiumCatalogItem>;
  owned_skus?: string[];
  equipped?: { frame_sku?: string | null; name_sku?: string | null; avatar_sku?: string | null };
};

// мінімальні дані гравця для рейтингу (аватар + косметика)
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

// рейтинги
type CommonRow = {
  tg_id?: number;
  name: string;
  level: number;
  xp: number;
  chervonci: number;
};

type NightWatchRow = {
  place: number;
  tg_id?: number;
  name: string;
  medals: number;
  hp_destroyed: number;
  kills_total: number;
};

type SacrificeRow = {
  place: number;
  fort_name: string;
  sum: number;
};

type PerunRow = {
  place: number;
  tg_id?: number;
  name: string;
  elo: number;
  wins: number;
  losses: number;
};

type CommonResp = { rows: CommonRow[] };
type NightResp = { top: NightWatchRow[]; you?: NightWatchRow | null };
type SacrificeResp = { top: SacrificeRow[]; your_fort?: SacrificeRow | null };
type PerunScope = "day" | "week" | "month" | "all";
type PerunResp = { scope: PerunScope; top: PerunRow[]; you?: PerunRow | null };

type Tab = "common" | "night" | "sacrifice" | "perun";

// ─────────────────────────────────────────────────────────────
// Assets / helpers (як у профілі)
// ─────────────────────────────────────────────────────────────

const RACE_IMAGE_BASE: Record<string, string> = {
  human: "race_human",
  vovkulak: "race_vovkulak",
  naviy: "race_naviy",
  mavchyn: "race_mavchyn",
  chugaister: "race_chugaister",
  upyr: "race_upyr",
};

type NameStyle = { type: "solid"; value: string } | { type: "gradient"; value: string };

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

// ─────────────────────────────────────────────────────────────
// Avatar helpers (premium avatars можуть бути gendered)
// ─────────────────────────────────────────────────────────────

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

  // якщо це вже path/url
  if (avatarSku.startsWith("/") || avatarSku.startsWith("http")) return avatarSku;

  const base = normalizeSku(avatarSku);
  const item = catalog?.[avatarSku] || catalog?.[base] || null;

  // ✅ якщо бек віддає asset (gendered/single) — використовуємо його
  const asset = item?.asset as AvatarAsset | null | undefined;
  if (asset?.type === "single" && asset.path) return asset.path;

  if (asset?.type === "gendered" && asset.variants) {
    const g = gender === "f" ? "f" : "m";
    const v = (asset.variants as any)?.[g];
    if (typeof v === "string" && v) return v;
    // fallback: якщо немає варіанту — беремо icon
  }

  if (item?.icon) return item.icon;

  // fallback: старий формат
  return `/avatars/${base}.png`;
}

// ─────────────────────────────────────────────────────────────
// Frame helpers
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

/**
 * AUTO FRAME SCALE (v2)
 */
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

        const ctx = canvas.getContext(
          "2d",
          { willReadFrequently: true } as CanvasRenderingContext2DSettings
        );
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

// ─────────────────────────────────────────────────────────────
// Player mini UI
// ─────────────────────────────────────────────────────────────

function PlayerAvatar({
  player,
  catalog,
  size = 36,
}: {
  player: PlayerMiniDTO | null;
  catalog: Record<string, PremiumCatalogItem> | null;
  size?: number;
}) {
  const overlayCandidate = useMemo(() => {
    const sku = player?.equipped_frame_sku || null;
    return getFrameOverlayCandidate(sku, catalog);
  }, [player?.equipped_frame_sku, catalog]);

  const iconCandidate = useMemo(() => {
    const sku = player?.equipped_frame_sku || null;
    return getFrameIconCandidate(sku, catalog);
  }, [player?.equipped_frame_sku, catalog]);

  const frameSrc = useResolvedImageSrc([overlayCandidate, iconCandidate]);
  const frameScale = useAutoFrameScale(frameSrc, 1.24);

  const raceImg = useMemo(() => (player ? getRaceImage(player) : null), [player?.race_key, player?.gender]);

  const avatarCandidates = useMemo(() => {
    const list: (string | null)[] = [];
    const sku = player?.equipped_avatar_sku || null;

    const fromSku = getAvatarCandidate(sku, player?.gender ?? null, catalog);
    if (fromSku) list.push(fromSku);

    if (raceImg) list.push(raceImg);
    return list;
  }, [player?.equipped_avatar_sku, player?.gender, catalog, raceImg]);

  const avatarSrc = useResolvedImageSrc(avatarCandidates);

  return (
    <div className="relative overflow-visible shrink-0" style={{ width: size, height: size }}>
      <div
        className={[
          "absolute inset-0 overflow-hidden bg-slate-800/80",
          frameSrc ? "rounded-none" : "rounded-xl border border-amber-500/40",
        ].join(" ")}
      >
        {avatarSrc ? (
          <Image src={avatarSrc} alt="" fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">🕯️</div>
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

function PlayerName({
  player,
  fallbackName,
  catalog,
}: {
  player: PlayerMiniDTO | null;
  fallbackName: string;
  catalog: Record<string, PremiumCatalogItem> | null;
}) {
  const name = player?.name || fallbackName || "Безіменний";
  const sku = player?.equipped_name_sku || null;
  return <StyledName name={name} nameSku={sku} catalog={catalog} />;
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function RatingsPage() {
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("common");

  const [me, setMe] = useState<ProfileDTO | null>(null);
  const [catalog, setCatalog] = useState<Record<string, PremiumCatalogItem> | null>(null);

  const [players, setPlayers] = useState<Record<number, PlayerMiniDTO>>({});
  const playersRef = useRef<Record<number, PlayerMiniDTO>>({});

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    if (!me?.tg_id) return;
    setPlayers((prev) => ({
      ...prev,
      [me.tg_id]: {
        tg_id: me.tg_id,
        name: me.name,
        race_key: me.race_key ?? null,
        gender: me.gender ?? null,
        equipped_frame_sku: me.equipped_frame_sku ?? null,
        equipped_name_sku: me.equipped_name_sku ?? null,
        equipped_avatar_sku: me.equipped_avatar_sku ?? null,
      },
    }));
  }, [
    me?.tg_id,
    me?.name,
    me?.race_key,
    me?.gender,
    me?.equipped_frame_sku,
    me?.equipped_name_sku,
    me?.equipped_avatar_sku,
  ]);

  const overlayCandidate = useMemo(() => {
    const sku = me?.equipped_frame_sku || null;
    return getFrameOverlayCandidate(sku, catalog);
  }, [me?.equipped_frame_sku, catalog]);

  const iconCandidate = useMemo(() => {
    const sku = me?.equipped_frame_sku || null;
    return getFrameIconCandidate(sku, catalog);
  }, [me?.equipped_frame_sku, catalog]);

  const frameSrc = useResolvedImageSrc([overlayCandidate, iconCandidate]);
  const frameScale = useAutoFrameScale(frameSrc, 1.24);

  const meRaceImg = useMemo(() => (me ? getRaceImage(me) : null), [me?.race_key, me?.gender]);

  const meAvatarCandidates = useMemo(() => {
    const list: (string | null)[] = [];
    const sku = me?.equipped_avatar_sku || null;

    const fromSku = getAvatarCandidate(sku, me?.gender ?? null, catalog);
    if (fromSku) list.push(fromSku);

    if (meRaceImg) list.push(meRaceImg);
    return list;
  }, [me?.equipped_avatar_sku, me?.gender, catalog, meRaceImg]);

  const meAvatarSrc = useResolvedImageSrc(meAvatarCandidates);

  // rating data
  const [common, setCommon] = useState<CommonRow[] | null>(null);
  const [nightTop, setNightTop] = useState<NightWatchRow[] | null>(null);
  const [nightYou, setNightYou] = useState<NightWatchRow | null>(null);
  const [sacTop, setSacTop] = useState<SacrificeRow[] | null>(null);
  const [sacYourFort, setSacYourFort] = useState<SacrificeRow | null>(null);

  const [perunScope, setPerunScope] = useState<PerunScope>("week");
  const [perunTop, setPerunTop] = useState<PerunRow[] | null>(null);
  const [perunYou, setPerunYou] = useState<PerunRow | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getTgIdSafe(): Promise<number | null> {
    initTg();

    try {
      const fromTg = await resolveTgId();
      if (fromTg) return fromTg;
    } catch {}

    try {
      const maybe = await waitTgId(3500);
      if (maybe) return maybe;
    } catch {}

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("tg_id");
        if (raw) {
          const n = Number(raw);
          if (!Number.isNaN(n) && n > 0) return n;
        }
      } catch {}
    }

    return null;
  }

  // 1) tg_id + me profile + catalog
  useEffect(() => {
    let alive = true;

    (async () => {
      const id = await getTgIdSafe();
      if (!alive) return;

      if (!id) {
        setError("Не вдалося визначити ваш Telegram ID. Відкрийте мініап з чату бота.");
        return;
      }

      setTgId(id);

      try {
        if (typeof window !== "undefined") localStorage.setItem("tg_id", String(id));
      } catch {}

      // profile
      try {
        const body = await getJSON<ProfileResponse>("/api/profile", { cache: "no-store" });
        if (!alive) return;
        if (!body?.ok || !body?.player) throw new Error("Bad profile response");
        setMe(body.player);
      } catch (e: any) {
        if (!alive) return;

        if (e instanceof ApiError) {
          const code = e?.detail?.code || e?.detail?.detail?.code || e?.detail?.reason || null;
          if (e.status === 409 && code === "NEED_REGISTER") {
            router.replace(`/register?tg_id=${id}`);
            return;
          }
        }

        const msg = String(e?.message || e);
        if (msg.includes("NEED_REGISTER") || msg.includes("409")) {
          router.replace(`/register?tg_id=${id}`);
          return;
        }
      }

      // catalog
      try {
        const resp = await getJSON<PremiumCatalogResponse>("/api/premium/catalog", { cache: "no-store" });
        if (!alive) return;
        if (resp?.ok && resp.catalog && typeof resp.catalog === "object") setCatalog(resp.catalog);
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  // 2) load ratings
  useEffect(() => {
    if (!tgId) return;

    let alive = true;

    (async () => {
      setError(null);
      setLoading(true);

      try {
        if (tab === "common") {
          const dto = await getJSON<CommonResp>("/api/ratings/common", { cache: "no-store" });
          if (!alive) return;
          setCommon(dto.rows || []);
        } else if (tab === "night") {
          const dto = await getJSON<NightResp>("/api/ratings/nightwatch", { cache: "no-store" });
          if (!alive) return;
          setNightTop(dto.top || []);
          setNightYou(dto.you || null);
        } else if (tab === "sacrifice") {
          const dto = await getJSON<SacrificeResp>("/api/ratings/sacrifice", { cache: "no-store" });
          if (!alive) return;
          setSacTop(dto.top || []);
          setSacYourFort(dto.your_fort || null);
        } else if (tab === "perun") {
          const dto = await getJSON<PerunResp>(`/api/ratings/perun?scope=${perunScope}`, { cache: "no-store" });
          if (!alive) return;
          setPerunScope(dto.scope || perunScope);
          setPerunTop(dto.top || []);
          setPerunYou(dto.you || null);
        }
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError("Не вдалося завантажити рейтинги.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tgId, tab, perunScope]);

  const ratingIds = useMemo(() => {
    const ids: number[] = [];

    if (tab === "common" && common) ids.push(...common.map((r) => Number(r.tg_id)));
    if (tab === "night") {
      if (nightTop) ids.push(...nightTop.map((r) => Number(r.tg_id)));
      if (nightYou) ids.push(Number(nightYou.tg_id));
    }
    if (tab === "perun") {
      if (perunTop) ids.push(...perunTop.map((r) => Number(r.tg_id)));
      if (perunYou) ids.push(Number(perunYou.tg_id));
    }

    return Array.from(new Set(ids.filter((n) => Number.isFinite(n) && n > 0)));
  }, [tab, common, nightTop, nightYou, perunTop, perunYou]);

  useEffect(() => {
    if (!ratingIds.length) return;

    let alive = true;

    const missing = ratingIds.filter((id) => !playersRef.current[id]);
    if (!missing.length) return;

    (async () => {
      try {
        // ✅ БЕК ЧЕКАЄ tg_ids
        const resp = await getJSON<PlayersMiniResponse>(`/api/players/mini?tg_ids=${missing.join(",")}`, {
          cache: "no-store",
        });
        if (!alive) return;

        if (resp?.ok && Array.isArray(resp.players)) {
          setPlayers((prev) => {
            const next = { ...prev };
            for (const p of resp.players) next[p.tg_id] = p;
            return next;
          });
        }
      } catch {
        // тихо
      }
    })();

    return () => {
      alive = false;
    };
  }, [ratingIds]);

  const title = useMemo(() => {
    switch (tab) {
      case "common":
        return "Загальний рейтинг";
      case "night":
        return "Нічна варта";
      case "sacrifice":
        return "Жертва Богам";
      case "perun":
        return "Суд Перуна";
      default:
        return "Рейтинги";
    }
  }, [tab]);

  const safePadStyle = useMemo(
    () => ({
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
    }),
    []
  );

  return (
    <main
      style={safePadStyle}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6"
    >
      <div className="w-full max-w-xl relative">
        <div className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.23),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.25),transparent_60%)]" />

        <motion.header
          className="relative mb-4 flex items-center justify-between gap-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-xl font-semibold tracking-wide flex items-center gap-2">
              <span>🏆</span>
              <span>Рейтинги</span>
            </h1>
            <p className="text-xs text-slate-400">Переглянь, хто тримає вершину Проклятих курганів.</p>
          </div>

          <div className="flex items-center gap-3">
            {me && (
              <MeMiniBadge
                me={me}
                catalog={catalog}
                avatarSrc={meAvatarSrc}
                frameSrc={frameSrc}
                frameScale={frameScale}
              />
            )}

            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs text-slate-400 hover:text-amber-300 underline underline-offset-4"
            >
              ← У місто
            </button>
          </div>
        </motion.header>

        <motion.div
          className="relative mb-3 flex flex-wrap gap-1 rounded-2xl bg-slate-900/80 border border-slate-700/70 p-1 text-xs"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <TabButton tab={tab} setTab={setTab} value="common" label="Загальний" />
          <TabButton tab={tab} setTab={setTab} value="night" label="Нічна варта" />
          <TabButton tab={tab} setTab={setTab} value="sacrifice" label="Жертва Богам" />
          <TabButton tab={tab} setTab={setTab} value="perun" label="Суд Перуна" />
        </motion.div>

        {error && (
          <div className="relative mb-3 text-xs text-red-300 bg-red-950/50 border border-red-700/70 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <motion.section
          className="relative rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-3 shadow-lg text-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold flex items-center gap-2">
              <span>🏅</span>
              <span>{title}</span>
            </h2>
            {loading && <span className="text-[11px] text-slate-400">Оновлення…</span>}
          </div>

          {!loading && tab === "common" && <CommonTop common={common} players={players} catalog={catalog} />}

          {!loading && tab === "night" && (
            <NightWatchTop
              top={nightTop}
              you={nightYou}
              me={me}
              catalog={catalog}
              meAvatarSrc={meAvatarSrc}
              frameSrc={frameSrc}
              frameScale={frameScale}
              players={players}
            />
          )}

          {!loading && tab === "sacrifice" && <SacrificeTop top={sacTop} yourFort={sacYourFort} />}

          {!loading && tab === "perun" && (
            <PerunTop
              scope={perunScope}
              setScope={setPerunScope}
              top={perunTop}
              you={perunYou}
              me={me}
              catalog={catalog}
              meAvatarSrc={meAvatarSrc}
              frameSrc={frameSrc}
              frameScale={frameScale}
              players={players}
            />
          )}

          {loading && <div className="py-6 text-center text-xs text-slate-400">Завантаження таблиці…</div>}
        </motion.section>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// UI pieces
// ─────────────────────────────────────────────────────────────

function TabButton({
  tab,
  setTab,
  value,
  label,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  value: Tab;
  label: string;
}) {
  const active = tab === value;
  return (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={`px-3 py-1.5 rounded-xl transition ${
        active ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-300 hover:bg-slate-800/80"
      }`}
    >
      {label}
    </button>
  );
}

function MeMiniBadge({
  me,
  catalog,
  avatarSrc,
  frameSrc,
  frameScale,
}: {
  me: ProfileDTO;
  catalog: Record<string, PremiumCatalogItem> | null;
  avatarSrc: string | null;
  frameSrc: string | null;
  frameScale: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-900/75 border border-slate-700/60 px-2 py-1">
      <div className="relative h-9 w-9 overflow-visible shrink-0">
        <div
          className={[
            "absolute inset-0 overflow-hidden bg-slate-800/80",
            frameSrc ? "rounded-none" : "rounded-xl border border-amber-500/40",
          ].join(" ")}
        >
          {avatarSrc ? (
            <Image src={avatarSrc} alt="" fill sizes="36px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">🕯️</div>
          )}
        </div>

        {frameSrc && (
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src={frameSrc}
              alt=""
              fill
              sizes="36px"
              className="object-contain"
              style={{ transform: `scale(${frameScale})`, transformOrigin: "center" }}
            />
          </div>
        )}
      </div>

      <div className="leading-tight">
        <div className="text-[11px] text-slate-400">ти</div>
        <div className="text-sm">
          <StyledName name={me.name || "Безіменний"} nameSku={me.equipped_name_sku || null} catalog={catalog} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Blocks (без змін по логіці, тільки використовують PlayerAvatar/PlayerName)
// ─────────────────────────────────────────────────────────────

function CommonTop({
  common,
  players,
  catalog,
}: {
  common: CommonRow[] | null;
  players: Record<number, PlayerMiniDTO>;
  catalog: Record<string, PremiumCatalogItem> | null;
}) {
  if (!common || common.length === 0) {
    return <div className="py-4 text-xs text-slate-400">Поки що загальний рейтинг порожній.</div>;
  }

  return (
    <div className="space-y-1">
      {common.map((row, idx) => {
        const place = idx + 1;
        const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : `${place}.`;

        const tid = Number(row.tg_id);
        const p = Number.isFinite(tid) && tid > 0 ? players[tid] || null : null;
        const key = Number.isFinite(tid) && tid > 0 ? `tg:${tid}` : `${row.name}:${place}`;

        return (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-700/70 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{medal}</span>
              <PlayerAvatar player={p} catalog={catalog} size={36} />

              <div className="flex flex-col leading-tight">
                <div className="text-sm">
                  <PlayerName player={p} fallbackName={row.name} catalog={catalog} />
                </div>
                <span className="text-[11px] text-slate-400">
                  L{row.level} · XP {row.xp}
                </span>
              </div>
            </div>

            <div className="text-xs text-amber-300 font-semibold">💰 {row.chervonci}</div>
          </div>
        );
      })}

      <p className="mt-2 text-[11px] text-slate-500">Сортування: рівень → XP → Червонці.</p>
    </div>
  );
}

function NightWatchTop({
  top,
  you,
  me,
  catalog,
  meAvatarSrc,
  frameSrc,
  frameScale,
  players,
}: {
  top: NightWatchRow[] | null;
  you: NightWatchRow | null;
  me: ProfileDTO | null;
  catalog: Record<string, PremiumCatalogItem> | null;
  meAvatarSrc: string | null;
  frameSrc: string | null;
  frameScale: number;
  players: Record<number, PlayerMiniDTO>;
}) {
  if (!top || top.length === 0) {
    return (
      <div className="py-4 text-xs text-slate-400">
        Ще ніхто не патрулює вулиці цього тижня. Звільни кілька вулиць від потвор — і з&apos;явишся у списку.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {top.map((row) => {
        const medal =
          row.place === 1 ? "🥇" : row.place === 2 ? "🥈" : row.place === 3 ? "🥉" : `${row.place}.`;

        const tid = Number(row.tg_id);
        const p = Number.isFinite(tid) && tid > 0 ? players[tid] || null : null;
        const key = Number.isFinite(tid) && tid > 0 ? `tg:${tid}` : `${row.place}:${row.name}`;

        return (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-700/70 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{medal}</span>
              <PlayerAvatar player={p} catalog={catalog} size={36} />

              <div className="flex flex-col leading-tight">
                <div className="text-sm">
                  <PlayerName player={p} fallbackName={row.name} catalog={catalog} />
                </div>
                <span className="text-[11px] text-slate-400">
                  🏅 {row.medals} · 💔 {row.hp_destroyed} · ☠ {row.kills_total}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {you && (
        <div className="mt-2 rounded-xl border border-emerald-500/70 bg-emerald-900/20 px-3 py-2 text-[11px] text-emerald-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(() => {
                const tid = Number(you.tg_id);
                const youP = Number.isFinite(tid) && tid > 0 ? players[tid] || null : null;

                return me ? (
                  <MeMiniBadge
                    me={me}
                    catalog={catalog}
                    avatarSrc={meAvatarSrc}
                    frameSrc={frameSrc}
                    frameScale={frameScale}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={youP} catalog={catalog} size={36} />
                    <div className="text-sm">
                      <PlayerName player={youP} fallbackName={you.name} catalog={catalog} />
                    </div>
                  </div>
                );
              })()}

              <span className="text-emerald-200/90">— твій внесок</span>
            </div>
            <span className="font-semibold">#{you.place}</span>
          </div>
          <div className="mt-1 text-emerald-100/90">
            🏅 {you.medals} · 💔 {you.hp_destroyed} · ☠ {you.kills_total}
          </div>
        </div>
      )}

      <p className="mt-1 text-[11px] text-slate-500">Виплати за Нічну варту йдуть щонеділі.</p>
    </div>
  );
}

function SacrificeTop({
  top,
  yourFort,
}: {
  top: SacrificeRow[] | null;
  yourFort: SacrificeRow | null;
}) {
  if (!top || top.length === 0) {
    return (
      <div className="py-4 text-xs text-slate-400">
        Ще ніхто не робив пожертв цього місяця. Принеси Червонці через вкладку «Жертва Богам» у Заставі — і застава
        потрапить у рейтинг.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {top.map((row) => {
        const medal =
          row.place === 1 ? "🥇" : row.place === 2 ? "🥈" : row.place === 3 ? "🥉" : `${row.place}.`;
        return (
          <div
            key={row.place + row.fort_name}
            className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-700/70 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{medal}</span>
              <span className="font-semibold">{row.fort_name}</span>
            </div>
            <div className="text-xs text-amber-300 font-semibold">{row.sum} Червонців</div>
          </div>
        );
      })}

      {yourFort && (
        <div className="mt-2 rounded-xl border border-emerald-500/70 bg-emerald-900/20 px-3 py-2 text-[11px] text-emerald-100">
          Твоя застава: {yourFort.place}-е місце, {yourFort.sum} Червонців.
        </div>
      )}

      <p className="mt-1 text-[11px] text-slate-500">Наприкінці місяця топ-3 застави отримують бонуси.</p>
    </div>
  );
}

function PerunTop({
  scope,
  setScope,
  top,
  you,
  me,
  catalog,
  meAvatarSrc,
  frameSrc,
  frameScale,
  players,
}: {
  scope: PerunScope;
  setScope: (s: PerunScope) => void;
  top: PerunRow[] | null;
  you: PerunRow | null;
  me: ProfileDTO | null;
  catalog: Record<string, PremiumCatalogItem> | null;
  meAvatarSrc: string | null;
  frameSrc: string | null;
  frameScale: number;
  players: Record<number, PlayerMiniDTO>;
}) {
  const label = (s: PerunScope) =>
    s === "day" ? "День" : s === "week" ? "Тиждень" : s === "month" ? "Місяць" : "Весь час";

  return (
    <div className="space-y-2">
      <div className="flex gap-1 text-[11px] mb-1">
        {(["day", "week", "month", "all"] as PerunScope[]).map((s) => {
          const active = scope === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`px-2 py-1 rounded-full border ${
                active
                  ? "bg-slate-100 text-slate-900 border-slate-100"
                  : "border-slate-600 text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              {label(s)}
            </button>
          );
        })}
      </div>

      {!top || top.length === 0 ? (
        <div className="py-3 text-xs text-slate-400">У цьому періоді ще не було дуелей. Кинь виклик — і залетиш у таблицю.</div>
      ) : (
        <div className="space-y-1">
          {top.map((row) => {
            const medal =
              row.place === 1 ? "🥇" : row.place === 2 ? "🥈" : row.place === 3 ? "🥉" : `${row.place}.`;
            const wl = `${row.wins}-${row.losses}`;

            const tid = Number(row.tg_id);
            const p = Number.isFinite(tid) && tid > 0 ? players[tid] || null : null;
            const key = Number.isFinite(tid) && tid > 0 ? `tg:${tid}` : `${row.place}:${row.name}`;

            return (
              <div key={key} className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-700/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{medal}</span>
                  <PlayerAvatar player={p} catalog={catalog} size={36} />
                  <div className="flex flex-col leading-tight">
                    <div className="text-sm">
                      <PlayerName player={p} fallbackName={row.name} catalog={catalog} />
                    </div>
                    <span className="text-[11px] text-slate-400">ELO {row.elo} · {wl}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {you && (
        <div className="mt-2 rounded-xl border border-emerald-500/70 bg-emerald-900/20 px-3 py-2 text-[11px] text-emerald-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(() => {
                const tid = Number(you.tg_id);
                const youP = Number.isFinite(tid) && tid > 0 ? players[tid] || null : null;

                return me ? (
                  <MeMiniBadge
                    me={me}
                    catalog={catalog}
                    avatarSrc={meAvatarSrc}
                    frameSrc={frameSrc}
                    frameScale={frameScale}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={youP} catalog={catalog} size={36} />
                    <div className="text-sm">
                      <PlayerName player={youP} fallbackName={you.name} catalog={catalog} />
                    </div>
                  </div>
                );
              })()}
              <span className="text-emerald-200/90">— твоя позиція</span>
            </div>
            <span className="font-semibold">#{you.place}</span>
          </div>
          <div className="mt-1 text-emerald-100/90">
            ELO {you.elo} · {you.wins}-{you.losses}
          </div>
        </div>
      )}

      <p className="mt-1 text-[11px] text-slate-500">Суд Перуна використовує ELO з адаптивним коефіцієнтом K.</p>
    </div>
  );
}