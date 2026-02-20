// app/profile/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { initTg, waitTgId, resolveTgId } from "@/lib/tg";
import { getJSON, postJSON, ApiError } from "@/lib/api";

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

  // ✅ avatars
  equipped_avatar_sku?: string | null;

  // ✅ premium subs (from /api/profile)
  premium_water_until?: string | null;
  premium_molfar_until?: string | null;
  active_premium_tier?: string | null;
};

type ProfileResponse = {
  ok: boolean;
  player: ProfileDTO;
};

type ProfessionKind = "gathering" | "craft";
type ProfessionApi = {
  id: number;
  code: string;
  name: string;
  descr: string;
  kind: ProfessionKind;
  min_level: number;
  icon?: string | null;
};
type PlayerProfessionDTO = {
  profession: ProfessionApi;
  level: number;
  xp: number;
};
type Limits = {
  gathering: { max: number; current: number };
  craft: { max: number; current: number };
};
type ProfessionsMeResponse = {
  ok: boolean;
  player_level: number;
  professions: PlayerProfessionDTO[];
  limits: Limits;
};

// Achievements
type RewardDTO = {
  chervontsi: number;
  kleynody: number;
  badge?: string | null;
  title?: string | null;
};
type TierStatusDTO = {
  tier: number;
  target: number;
  reward: RewardDTO;
  achieved: boolean;
  claimed: boolean;
};
type AchievementStatusDTO = {
  code: string;
  name: string;
  category: string;
  description: string;
  metric_key: string;
  current_value: number;
  tiers: TierStatusDTO[];
};
type ClaimResponse = {
  ok: boolean;
  achievement_code: string;
  tier: number;
  granted: RewardDTO;
};

// Premium catalog (backend /api/premium/catalog)
type PremiumCatalogItem = {
  kind?: "frame" | "name" | "avatar";
  title?: string;
  price_kleynody?: number;

  // маленька іконка
  icon?: string;

  // оверлей під аватар (для рамок)
  overlay?: string;

  css?: { type?: "solid" | "gradient"; value?: string } | null;
};

type PremiumCatalogResponse = {
  ok: boolean;
  catalog: Record<string, PremiumCatalogItem>;
  owned_skus?: string[];
  equipped?: { frame_sku?: string | null; name_sku?: string | null; avatar_sku?: string | null };
};

// ─────────────────────────────────────────────────────────────
// Localization / assets
// ─────────────────────────────────────────────────────────────

const RACE_LABELS: Record<string, string> = {
  human: "людина",
  vovkulak: "вовкулак",
  naviy: "навій",
  mavchyn: "мавчин рід",
  chugaister: "чугайстерів рід",
  upyr: "опир",
};

const CLASS_LABELS: Record<string, string> = {
  molfar: "мольфар",
  kozak: "козак",
  kharyk: "характерник",
  vatazhok: "ватажок",
};

const RACE_IMAGE_BASE: Record<string, string> = {
  human: "race_human",
  vovkulak: "race_vovkulak",
  naviy: "race_naviy",
  mavchyn: "race_mavchyn",
  chugaister: "race_chugaister",
  upyr: "race_upyr",
};

const CLASS_ICONS: Record<string, string> = {
  molfar: "/classes/class_molfar.png",
  kozak: "/classes/class_kozak.png",
  kharyk: "/classes/class_kharyk.png",
  vatazhok: "/classes/class_vatazhok.png",
};

// Fallback name styles
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

// ─────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ✅ premium helpers (remaining time)
function remainingMs(untilISO?: string | null) {
  if (!untilISO) return 0;
  const t = new Date(untilISO).getTime();
  if (!Number.isFinite(t)) return 0;
  const diff = t - Date.now();
  return diff > 0 ? diff : 0;
}

function formatRemaining(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes <= 0) return "менше хвилини";

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes - days * 24 * 60 - hours * 60;

  if (days > 0) return `${days} дн. ${hours} год.`;
  if (hours > 0) return `${hours} год. ${minutes} хв.`;
  return `${minutes} хв.`;
}

/**
 * AUTO FRAME SCALE (v2)
 * Щільніше підганяє PNG-рамку до контейнера, ігнорує слабку альфу по краях.
 */
const FRAME_SCALE_CACHE = new Map<string, number>();

function useAutoFrameScale(frameSrc: string | null, extra = 1.22) {
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

        // Зменшуємо для аналізу: достатньо точно + швидко
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

          // ігноруємо 1px край
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

        // кілька порогів: вищі прибирають “пил” і дають щільніший bbox
        const thresholds = [10, 28, 52, 78];
        const candidates: number[] = [];

        for (const t of thresholds) {
          const bb = bboxFor(t);
          if (!bb) continue;

          // не даємо bbox стати надто маленьким
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

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
      <motion.div
        className="h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

function getRaceImage(player: ProfileDTO): string | null {
  const key = player.race_key || "";
  const base = RACE_IMAGE_BASE[key];
  if (!base) return null;
  const suffix = player.gender === "f" ? "_f" : "_m";
  return `/races/${base}${suffix}.png`;
}

function getClassIcon(player: ProfileDTO): string | null {
  const key = player.class_key || "";
  return CLASS_ICONS[key] || null;
}

function rewardText(r: RewardDTO) {
  const parts: string[] = [];
  if (r.chervontsi > 0) parts.push(`🪙 ${r.chervontsi}`);
  if (r.kleynody > 0) parts.push(`💎 ${r.kleynody}`);
  if (r.title) parts.push(`🏷️ ${r.title}`);
  if (r.badge) parts.push(`🏅 ${r.badge}`);
  return parts.length ? parts.join(" • ") : "—";
}

function nextTarget(a: AchievementStatusDTO) {
  const sorted = [...(a.tiers || [])].sort((x, y) => x.tier - y.tier);
  const next = sorted.find((t) => !t.claimed);
  return next || null;
}

function prettyCategory(cat: string) {
  const c = (cat || "").toLowerCase();
  if (c === "combat") return "Бій";
  if (c === "craft") return "Ремесло";
  if (c === "tutorial") return "Навчання";
  return cat || "Інше";
}

// ─────────────────────────────────────────────────────────────
// Avatar helpers (equipped_avatar_sku -> /avatars/*)
// ─────────────────────────────────────────────────────────────

function normalizeAvatarBaseSku(sku: string) {
  let s = (sku || "").trim();
  if (!s) return s;

  // якщо вже URL/path — не чіпаємо
  if (s.startsWith("/") || s.startsWith("http://") || s.startsWith("https://")) return s;

  // прибираємо розширення
  s = s.replace(/\.png$/i, "").replace(/\.webp$/i, "");
  return s;
}

function getAvatarCandidate(
  avatarSku?: string | null,
  catalog?: Record<string, PremiumCatalogItem> | null
) {
  if (!avatarSku) return null;

  // якщо бек уже віддає /avatars/..png
  if (avatarSku.startsWith("/") || avatarSku.startsWith("http")) return avatarSku;

  const base = normalizeAvatarBaseSku(avatarSku);

  // якщо колись покладеш аватар в premium catalog як item.icon
  const c = catalog?.[avatarSku] || catalog?.[base] || null;
  const fromCatalog = c?.icon;
  if (fromCatalog) return fromCatalog;

  // дефолт: /public/avatars/<file>.png
  return `/avatars/${base}.png`;
}

// ─────────────────────────────────────────────────────────────
// Frame src helpers (overlay > icon) + нормалізація sku
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

  if (!style) {
    return <div className="text-lg font-semibold">{name || "Безіменний"}</div>;
  }

  if (style.type === "solid") {
    return (
      <div className="text-lg font-semibold" style={{ color: style.value }}>
        {name || "Безіменний"}
      </div>
    );
  }

  return (
    <div
      className="text-lg font-semibold"
      style={{
        backgroundImage: style.value,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {name || "Безіменний"}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);

  const [data, setData] = useState<ProfileDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [professions, setProfessions] = useState<PlayerProfessionDTO[] | null>(null);
  const [profError, setProfError] = useState<string | null>(null);
  const [profLoading, setProfLoading] = useState(false);

  const [premiumCatalog, setPremiumCatalog] = useState<Record<string, PremiumCatalogItem> | null>(
    null
  );

  const [achOpen, setAchOpen] = useState(true);
  const [achLoading, setAchLoading] = useState(false);
  const [achError, setAchError] = useState<string | null>(null);
  const [ach, setAch] = useState<AchievementStatusDTO[] | null>(null);
  const [claimBusy, setClaimBusy] = useState<string | null>(null);

  // ✅ tick раз на хвилину, щоб “діє ще …” підкручувалось
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setClockTick((x) => x + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  async function getTgId(): Promise<number | null> {
    initTg();

    try {
      const fromTg = await resolveTgId();
      if (fromTg) return fromTg;
    } catch {}

    try {
      const maybe = await waitTgId(5000);
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

  useEffect(() => {
    let alive = true;

    (async () => {
      const id = await getTgId();

      if (!alive) return;

      if (!id) {
        setError("Не вдалося визначити ваш Telegram ID. Відкрийте мініап з чату бота.");
        setLoading(false);
        return;
      }

      setTgId(id);

      try {
        if (typeof window !== "undefined") localStorage.setItem("tg_id", String(id));
      } catch {}

      try {
        setLoading(true);
        setError(null);

        const body = await getJSON<ProfileResponse>("/api/profile", { cache: "no-store" });

        if (!alive) return;

        if (!body?.ok || !body?.player) throw new Error("Bad response");
        setData(body.player);
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

        setError(`Помилка завантаження профілю: ${msg}`);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!tgId) return;

    let alive = true;

    (async () => {
      try {
        const resp = await getJSON<PremiumCatalogResponse>("/api/premium/catalog", {
          cache: "no-store",
        });
        if (!alive) return;
        if (resp?.ok && resp.catalog && typeof resp.catalog === "object") {
          setPremiumCatalog(resp.catalog);
        }
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, [tgId]);

  useEffect(() => {
    if (!tgId) return;

    let alive = true;

    (async () => {
      try {
        setProfLoading(true);
        setProfError(null);

        const res = await fetch("/api/proxy/api/professions/me", {
          method: "GET",
          cache: "no-store",
          headers: {
            "X-Tg-Id": tgId.toString(),
            "Content-Type": "application/json",
          },
        });

        const json: ProfessionsMeResponse = await res.json();
        if (!res.ok || !json?.ok) {
          const msg = (json as any)?.detail || (json as any)?.error || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        if (!alive) return;
        setProfessions(json.professions || []);
      } catch (e: any) {
        if (!alive) return;
        setProfError(String(e?.message || e));
      } finally {
        if (alive) setProfLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tgId]);

  async function loadAchievements() {
    try {
      setAchLoading(true);
      setAchError(null);

      const list = await getJSON<AchievementStatusDTO[]>("/api/achievements/status", {
        cache: "no-store",
      });

      if (!Array.isArray(list)) throw new Error("Bad achievements response");
      setAch(list);
    } catch (e: any) {
      setAchError(String(e?.message || e));
    } finally {
      setAchLoading(false);
    }
  }

  useEffect(() => {
    if (!tgId) return;
    loadAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgId]);

  async function claimTier(achievement_code: string, tier: number) {
    const key = `${achievement_code}:${tier}`;
    if (claimBusy) return;

    try {
      setClaimBusy(key);

      const resp = await postJSON<ClaimResponse>("/api/achievements/claim", {
        achievement_code,
        tier,
      });

      if (!resp?.ok) throw new Error("Claim failed");

      await loadAchievements();

      try {
        const body = await getJSON<ProfileResponse>("/api/profile", { cache: "no-store" });
        if (body?.ok && body.player) setData(body.player);
      } catch {}
    } catch (e: any) {
      setAchError(String(e?.message || e));
    } finally {
      setClaimBusy(null);
    }
  }

  const xpText = useMemo(() => {
    if (!data) return "";
    return `${data.xp} / ${data.xp_needed}`;
  }, [data]);

  const raceLabel = (data?.race_key && RACE_LABELS[data.race_key]) || data?.race_key || "—";
  const classLabel = (data?.class_key && CLASS_LABELS[data.class_key]) || data?.class_key || "—";
  const raceImg = data ? getRaceImage(data) : null;
  const classIcon = data ? getClassIcon(data) : null;

  const mainProfession = professions && professions[0];

  const carryPct = useMemo(() => {
    if (!data) return 0;
    const cap = Math.max(1, data.carry_capacity || 1);
    return clamp((data.carry_weight / cap) * 100, 0, 100);
  }, [data]);

  const carryColorClass =
    carryPct >= 95 ? "text-red-300" : carryPct >= 80 ? "text-amber-300" : "text-emerald-300";

  const safePadStyle = useMemo(
    () => ({
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
    }),
    []
  );

  // ✅ Premium line (molfar has priority)
  const premiumLine = useMemo(() => {
    if (!data) return null;

    // dependency to re-render each minute
    void clockTick;

    const mMs = remainingMs(data.premium_molfar_until || null);
    if (mMs > 0) {
      return `Благословення мольфара діє ще: ${formatRemaining(mMs)}`;
    }

    const wMs = remainingMs(data.premium_water_until || null);
    if (wMs > 0) {
      return `Жива вода діє ще: ${formatRemaining(wMs)}`;
    }

    return null;
  }, [data, clockTick]);

  // ✅ Avatar candidates: equipped_avatar_sku -> race fallback
  const avatarCandidates = useMemo(() => {
    const list: (string | null)[] = [];
    const sku = data?.equipped_avatar_sku || null;
    const fromSku = getAvatarCandidate(sku, premiumCatalog);
    if (fromSku) list.push(fromSku);

    if (raceImg) list.push(raceImg);

    return list;
  }, [data?.equipped_avatar_sku, premiumCatalog, raceImg]);

  const avatarSrc = useResolvedImageSrc(avatarCandidates);

  // frame candidates: overlay -> icon
  const overlayCandidate = useMemo(() => {
    const sku = data?.equipped_frame_sku || null;
    return getFrameOverlayCandidate(sku, premiumCatalog);
  }, [data?.equipped_frame_sku, premiumCatalog]);

  const iconCandidate = useMemo(() => {
    const sku = data?.equipped_frame_sku || null;
    return getFrameIconCandidate(sku, premiumCatalog);
  }, [data?.equipped_frame_sku, premiumCatalog]);

  // pick the first that реально вантажиться
  const frameSrc = useResolvedImageSrc([overlayCandidate, iconCandidate]);

  // ✅ сильніше “дотягуємо” рамку до країв фото
  const frameScale = useAutoFrameScale(frameSrc, 1.24);

  return (
    <div
      style={safePadStyle}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4"
    >
      <div className="w-full max-w-xl relative">
        <div className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,0.26),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(56,189,248,0.26),transparent_60%)]" />

        {/* Top bar */}
        <motion.div
          className="relative mb-4 rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-3 shadow-lg flex items-center justify-between gap-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-800/90 flex items-center justify-center ring-1 ring-amber-400/70">
              <span className="text-xl">🧙‍♂️</span>
            </div>
            <div>
              <div className="font-semibold tracking-wide">Твій образ</div>
              <p className="text-xs text-slate-300/90">
                Перевір характеристики героя перед виходом у околиці.
              </p>
            </div>
          </div>
          <div className="h-6 w-6" aria-hidden />
        </motion.div>

        {/* States */}
        {loading && (
          <motion.div
            className="relative rounded-2xl bg-slate-900/80 border border-slate-700/70 px-4 py-4 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Завантаження профілю…
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
            className="relative rounded-2xl bg-red-950/60 border border-red-700/70 px-4 py-4 text-sm text-red-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.div>
        )}

        {!loading && !error && data && (
          <main className="relative space-y-4 pb-24">
            {/* Hero card */}
            <motion.section
              className="rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-4 shadow-lg space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-visible">
                  {/* Photo (clipped) */}
                  <div
                    className={[
                      "absolute inset-0 overflow-hidden bg-slate-800/80",
                      frameSrc ? "rounded-none" : "rounded-2xl border border-amber-500/40",
                    ].join(" ")}
                  >
                    {avatarSrc ? (
                      <Image
                        src={avatarSrc}
                        alt={raceLabel}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🕯️
                      </div>
                    )}
                  </div>

                  {/* Frame overlay */}
                  {frameSrc && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      <Image
                        src={frameSrc}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-contain will-change-transform"
                        style={{ transform: `scale(${frameScale})`, transformOrigin: "center" }}
                      />
                    </div>
                  )}

                  {/* Class icon */}
                  {classIcon && (
                    <div className="absolute -bottom-1 -right-1 z-20 h-10 w-10 rounded-full bg-slate-950/90 border border-emerald-400/70 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                      <Image
                        src={classIcon}
                        alt={classLabel}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm uppercase tracking-[0.16em] text-slate-400">Герой</div>

                      <StyledName
                        name={data.name || "Безіменний"}
                        nameSku={data.equipped_name_sku || null}
                        catalog={premiumCatalog}
                      />
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-amber-300 font-semibold">Рівень {data.level}</div>
                      <div className="text-xs text-slate-300">XP {xpText}</div>
                    </div>
                  </div>

                  <ProgressBar value={data.xp} max={data.xp_needed} />

                  {/* ✅ premium status line */}
                  {premiumLine && (
                    <div className="mt-2 rounded-xl bg-cyan-500/10 border border-cyan-400/25 px-3 py-2 text-xs text-cyan-100">
                      {premiumLine}
                    </div>
                  )}

                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm">
                    <div>
                      🧬 Раса: <span className="font-semibold">{raceLabel}</span>
                    </div>
                    <div>
                      ⚔️ Клас: <span className="font-semibold">{classLabel}</span>
                    </div>

                    <div className="sm:col-span-2">
                      🛠️ Професія:{" "}
                      {profLoading ? (
                        <span className="text-xs text-slate-400">завантаження…</span>
                      ) : profError ? (
                        <span className="text-xs text-red-400">помилка завантаження</span>
                      ) : mainProfession ? (
                        <span className="font-semibold">
                          {mainProfession.profession.name}{" "}
                          <span className="text-slate-400">(рів. {mainProfession.level})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">не обрана</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Stats */}
            <motion.section
              className="rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-3 shadow-md grid grid-cols-2 gap-2 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div>
                ❤️ HPmax: <span className="font-semibold">{data.hp_max}</span>
              </div>
              <div>
                🔵 MPmax: <span className="font-semibold">{data.mp_max}</span>
              </div>
              <div>
                ⚡ Наснага:{" "}
                <span className="font-semibold text-yellow-300">
                  {data.energy}/{data.energy_max}
                </span>
              </div>
              <div>
                🗡️ ATK: <span className="font-semibold">{data.atk}</span>
              </div>
              <div>
                🛡️ DEF: <span className="font-semibold">{data.defense}</span>
              </div>

              {/* Weight */}
              <div className="col-span-2 mt-1 rounded-xl bg-black/30 border border-slate-700/60 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>🎒 Вага</span>
                  <span className={"font-semibold " + carryColorClass}>
                    {data.carry_weight} / {data.carry_capacity}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                  <motion.div
                    className="h-2 bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${carryPct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
                {carryPct >= 95 && (
                  <div className="mt-1 text-[11px] text-red-300">
                    Перевантаження близько — скинь речі або продай/переклади.
                  </div>
                )}
              </div>
            </motion.section>

            {/* Money */}
            <motion.section
              className="rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-3 shadow-md grid grid-cols-2 gap-2 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div>
                🪙 Червонці:{" "}
                <span className="font-semibold text-amber-300">{data.chervontsi}</span>
              </div>

              {/* ✅ only change: add kleynod image next to balance */}
              <div>
                💎 Клейноди:{" "}
                <span className="font-semibold text-cyan-300 inline-flex items-center gap-1">
                  <Image
                    src="/kleynods/kleynod.png"
                    alt="Клейнод"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                  {data.kleynody}
                </span>
              </div>
            </motion.section>

            {/* Actions */}
            <motion.section
              className="rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-3 shadow-md grid grid-cols-3 gap-2 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ProfileActionButton label="Пошта" icon="✉️" onClick={() => router.push("/profile/mail")} />
              <ProfileActionButton label="Інвентар" icon="🎒" onClick={() => router.push("/inventory")} />
              <ProfileActionButton label="Спорядження" icon="🛡️" onClick={() => router.push("/equipment")} />
            </motion.section>

            {/* Achievements */}
            <motion.section
              className="rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-3 shadow-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <button
                type="button"
                onClick={() => setAchOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <div className="text-left">
                    <div className="font-semibold">Досягнення</div>
                    <div className="text-xs text-slate-400">
                      {achLoading ? "завантаження…" : achError ? "помилка" : ach ? `${ach.length} шт.` : "—"}
                    </div>
                  </div>
                </div>
                <span className="text-slate-300">{achOpen ? "▴" : "▾"}</span>
              </button>

              <AnimatePresence initial={false}>
                {achOpen && (
                  <motion.div
                    className="mt-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {achLoading && (
                      <div className="rounded-xl bg-black/30 border border-slate-700/60 px-3 py-3 text-sm">
                        Завантаження…
                      </div>
                    )}

                    {achError && !achLoading && (
                      <div className="rounded-xl bg-red-950/60 border border-red-700/70 px-3 py-3 text-sm text-red-200">
                        Не вдалося завантажити: {achError}
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={loadAchievements}
                            className="rounded-xl bg-slate-800/80 border border-slate-600/80 px-3 py-2 text-xs font-semibold hover:border-amber-400/80 transition"
                          >
                            Оновити
                          </button>
                        </div>
                      </div>
                    )}

                    {!achLoading && !achError && ach && ach.length === 0 && (
                      <div className="rounded-xl bg-black/30 border border-slate-700/60 px-3 py-3 text-sm text-slate-300">
                        Поки що немає досягнень.
                      </div>
                    )}

                    {!achLoading && !achError && ach && ach.length > 0 && (
                      <div className="space-y-2">
                        {ach.map((a) => {
                          const n = nextTarget(a);
                          const maxTarget = n?.target ?? (a.tiers?.[a.tiers.length - 1]?.target ?? 1);
                          const pct = clamp((a.current_value / Math.max(1, maxTarget)) * 100, 0, 100);

                          return (
                            <div
                              key={a.code}
                              className="rounded-xl bg-black/30 border border-slate-700/60 px-3 py-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-xs text-slate-400">{prettyCategory(a.category)}</div>
                                  <div className="font-semibold">{a.name}</div>
                                  <div className="text-xs text-slate-300 mt-0.5">{a.description}</div>
                                </div>
                                <div className="text-right text-xs text-slate-300">
                                  <div className="font-semibold text-amber-200">{a.current_value}</div>
                                  <div className="text-slate-500">{n ? `ціль: ${n.target}` : "все забрано"}</div>
                                </div>
                              </div>

                              <div className="mt-2 h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                                <motion.div
                                  className="h-2 bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-200"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                                />
                              </div>

                              <div className="mt-2 space-y-2">
                                {(a.tiers || [])
                                  .slice()
                                  .sort((x, y) => x.tier - y.tier)
                                  .map((t) => {
                                    const canClaim = t.achieved && !t.claimed;
                                    const busy = claimBusy === `${a.code}:${t.tier}`;

                                    return (
                                      <div
                                        key={`${a.code}:${t.tier}`}
                                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/30 border border-slate-700/50 px-2 py-2"
                                      >
                                        <div className="text-xs">
                                          <div className="text-slate-200">
                                            Рівень {t.tier}:{" "}
                                            <span className="text-slate-400">
                                              {a.current_value}/{t.target}
                                            </span>
                                          </div>
                                          <div className="text-slate-400 mt-0.5">{rewardText(t.reward)}</div>
                                        </div>

                                        {t.claimed ? (
                                          <span className="text-xs text-emerald-300 font-semibold">✓ Забрано</span>
                                        ) : canClaim ? (
                                          <button
                                            type="button"
                                            onClick={() => claimTier(a.code, t.tier)}
                                            disabled={!!claimBusy}
                                            className="rounded-xl bg-amber-400/15 border border-amber-400/60 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/20 transition disabled:opacity-60"
                                          >
                                            {busy ? "..." : "Забрати"}
                                          </button>
                                        ) : (
                                          <span className="text-xs text-slate-500">—</span>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          </main>
        )}

        {/* Bottom nav */}
        <div className="fixed left-0 right-0 bottom-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          <div className="mx-auto max-w-xl">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-4 shadow-lg text-sm font-semibold hover:border-amber-400/70 hover:text-amber-200 transition"
            >
              ← Повернутися у місто
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-xl bg-slate-800/80 border border-slate-600/80 px-2 py-2 text-xs sm:text-sm font-medium hover:border-amber-400/80 hover:bg-slate-900/90 hover:text-amber-200 transition shadow-sm shadow-black/40"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="text-lg mb-1">{icon}</span>
      <span className="truncate">{label}</span>
    </motion.button>
  );
}