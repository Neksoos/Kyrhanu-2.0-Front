"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getJSON, postJSON } from "@/lib/api";
import { initTg, waitTgId, resolveTgId } from "@/lib/tg";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type FortListItem = {
  id: number;
  name: string;
  level: number;
  member_count: number;
};

type FortListResponse = {
  ok: boolean;
  forts: FortListItem[];
};

type JoinResponse = {
  ok: boolean;
  error?: string;
};

type ProfileDTO = {
  tg_id: number;
  name: string;
  race_key?: string | null;
  gender?: string | null;
  equipped_frame_sku?: string | null;
  equipped_name_sku?: string | null;
  equipped_avatar_sku?: string | null;
};

type ProfileResponse = { ok: boolean; player: ProfileDTO };

type PremiumCatalogItem = {
  kind?: "frame" | "name" | "avatar";
  css?: { type?: "solid" | "gradient"; value?: string } | null;
  icon?: string;
  overlay?: string;
  asset_m?: string;
  asset_f?: string;
};

type PremiumCatalogResponse = {
  ok: boolean;
  catalog: Record<string, PremiumCatalogItem>;
};

// ─────────────────────────────────────────────────────────────
// Cosmetics helpers (скорочено)
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

function uniq(arr: (string | null | undefined)[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    if (!x) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
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

function normalizeAvatarBaseSku(sku: string) {
  let s = (sku || "").trim();
  if (!s) return s;
  if (s.startsWith("/") || s.startsWith("http")) return s;
  s = s.replace(/\.png$/i, "").replace(/\.webp$/i, "");
  return s;
}

function getAvatarCandidates(
  avatarSku?: string | null,
  gender?: string | null,
  catalog?: Record<string, PremiumCatalogItem> | null
): string[] {
  if (!avatarSku) return [];
  if (avatarSku.startsWith("/") || avatarSku.startsWith("http")) return [avatarSku];

  const base = normalizeAvatarBaseSku(avatarSku);
  const c = catalog?.[avatarSku] || catalog?.[base] || null;

  const list: (string | null)[] = [];
  if (c?.asset_m) list.push(c.asset_m);
  if (c?.asset_f) list.push(c.asset_f);
  if (c?.icon) list.push(c.icon);

  const endsWithGender = base.endsWith("_m") || base.endsWith("_f");
  if (endsWithGender) {
    list.push(`/avatars/${base}.png`);
  } else {
    if (gender === "f") {
      list.push(`/avatars/${base}_f.png`);
      list.push(`/avatars/${base}_m.png`);
    } else if (gender === "m") {
      list.push(`/avatars/${base}_m.png`);
      list.push(`/avatars/${base}_f.png`);
    } else {
      list.push(`/avatars/${base}_m.png`);
      list.push(`/avatars/${base}_f.png`);
    }
  }
  list.push(`/avatars/${base}.png`);
  return uniq(list);
}

function normalizeFrameBaseSku(sku: string) {
  let s = (sku || "").trim();
  if (!s) return s;
  if (s.startsWith("/") || s.startsWith("http")) return s;
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

function getFrameOverlayCandidate(frameSku?: string | null, catalog?: Record<string, PremiumCatalogItem> | null) {
  if (!frameSku) return null;
  if (frameSku.startsWith("/") || frameSku.startsWith("http")) return toOverlayPath(frameSku);
  const base = normalizeFrameBaseSku(frameSku);
  const c = catalog?.[frameSku] || catalog?.[base] || null;
  const fromCatalog = c?.overlay || c?.icon;
  if (fromCatalog) return toOverlayPath(fromCatalog);
  return `/premium/${base}_overlay.png`;
}

function getFrameIconCandidate(frameSku?: string | null, catalog?: Record<string, PremiumCatalogItem> | null) {
  if (!frameSku) return null;
  if (frameSku.startsWith("/") || frameSku.startsWith("http")) return toIconPath(frameSku);
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
        } catch {}
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
// Page
// ─────────────────────────────────────────────────────────────

export default function ZastavyListPage() {
  const router = useRouter();

  const [forts, setForts] = useState<FortListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [joinLoadingId, setJoinLoadingId] = useState<number | null>(null);

  // ✅ me cosmetics (для хедера)
  const [me, setMe] = useState<ProfileDTO | null>(null);
  const [catalog, setCatalog] = useState<Record<string, PremiumCatalogItem> | null>(null);

  async function getTgIdSafe(): Promise<number | null> {
    initTg();

    try {
      const fromTg = await resolveTgId();
      if (fromTg) return Number(fromTg);
    } catch {}

    try {
      const maybe = await waitTgId(2500);
      if (maybe) return Number(maybe);
    } catch {}

    // fallback localStorage
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

  async function loadMeAndCatalog() {
    try {
      const p = await getJSON<ProfileResponse>("/api/profile", { cache: "no-store" });
      if (p?.ok && p.player) setMe(p.player);
    } catch {}

    try {
      const c = await getJSON<PremiumCatalogResponse>("/api/premium/catalog", { cache: "no-store" });
      if (c?.ok && c.catalog) setCatalog(c.catalog);
    } catch {}
  }

  async function loadForts(search?: string) {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const params = new URLSearchParams();
      if (search && search.trim().length > 0) {
        params.set("q", search.trim());
      }
      const url = "/api/zastavy/list" + (params.toString() ? `?${params.toString()}` : "");
      const data = (await getJSON(url)) as FortListResponse;

      if (!data.ok) throw new Error("Помилка завантаження списку застав");
      setForts(data.forts);
    } catch (e: any) {
      setError(e.message || "Сталася помилка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadForts();
    loadMeAndCatalog();
  }, []);

  const onSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadForts(q);
  };

  const meRaceImg = useMemo(() => (me ? getRaceImage(me) : null), [me?.race_key, me?.gender]);

  const meAvatarCandidates = useMemo(() => {
    const list: (string | null)[] = [];
    list.push(...getAvatarCandidates(me?.equipped_avatar_sku ?? null, me?.gender ?? null, catalog));
    if (meRaceImg) list.push(meRaceImg);
    return uniq(list);
  }, [me?.equipped_avatar_sku, me?.gender, catalog, meRaceImg]);

  const meAvatarSrc = useResolvedImageSrc(meAvatarCandidates);

  const meFrameSrc = useResolvedImageSrc([
    getFrameOverlayCandidate(me?.equipped_frame_sku ?? null, catalog),
    getFrameIconCandidate(me?.equipped_frame_sku ?? null, catalog),
  ]);

  async function handleJoin(fortId: number) {
    setError(null);
    setInfo(null);

    const tgId = me?.tg_id || (await getTgIdSafe());
    if (!tgId) {
      setError("Не вдалося визначити Telegram ID. Відкрий мініап з чату бота й спробуй ще раз.");
      return;
    }

    try {
      setJoinLoadingId(fortId);
      const resp = (await postJSON("/api/zastavy/join", {
        tg_id: tgId,
        fort_id: fortId,
      })) as JoinResponse;

      if (!resp.ok) {
        throw new Error(resp.error || "Не вдалося подати заявку до застави.");
      }

      setInfo("Заявку на вступ до застави надіслано. Гетьман має її розглянути.");
    } catch (e: any) {
      setError(e.message || "Сталася помилка при поданні заявки до застави");
    } finally {
      setJoinLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-stretch">
      {/* Хедер */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200">
          ← Назад
        </button>

        <h1 className="mx-auto text-lg font-semibold">Список застав</h1>

        {/* ✅ "ти" з преміум косметикою */}
        {me ? (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900/75 border border-slate-700/60 px-2 py-1">
            <div className="relative h-8 w-8 overflow-visible shrink-0">
              <div
                className={[
                  "absolute inset-0 overflow-hidden bg-slate-800/80",
                  meFrameSrc ? "rounded-none" : "rounded-xl border border-amber-500/40",
                ].join(" ")}
              >
                {meAvatarSrc ? (
                  <Image src={meAvatarSrc} alt="" fill sizes="32px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">🕯️</div>
                )}
              </div>

              {meFrameSrc && (
                <div className="absolute inset-0 pointer-events-none">
                  <Image src={meFrameSrc} alt="" fill sizes="32px" className="object-contain" />
                </div>
              )}
            </div>

            <div className="leading-tight">
              <div className="text-[10px] text-slate-400">ти</div>
              <div className="text-xs">
                <StyledName
                  name={me.name || "Безіменний"}
                  nameSku={me.equipped_name_sku || null}
                  catalog={catalog}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Пошук */}
      <form onSubmit={onSearchSubmit} className="px-4 pb-2">
        <input
          className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
          placeholder="Пошук за назвою..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      {/* Повідомлення */}
      {error && !loading && <div className="text-center text-sm text-red-400 mt-2 px-4">{error}</div>}
      {info && !loading && <div className="text-center text-sm text-emerald-400 mt-2 px-4">{info}</div>}

      {/* Контент */}
      <div className="flex-1 px-4 pb-4">
        {loading && <div className="text-center text-sm text-slate-400 mt-6">Завантаження...</div>}

        {!loading && !error && forts.length === 0 && (
          <div className="text-center text-sm text-slate-400 mt-6">Застав поки немає.</div>
        )}

        {!loading && !error && forts.length > 0 && (
          <div className="space-y-3 mt-2">
            {forts.map((fort) => (
              <div
                key={fort.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{fort.name}</div>
                  <div className="text-xs text-slate-400">Рівень {fort.level}</div>
                </div>
                <div className="text-xs text-slate-400">Учасників: {fort.member_count}</div>

                <button
                  type="button"
                  onClick={() => handleJoin(fort.id)}
                  className="mt-2 w-full rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 text-sm font-medium py-2 disabled:opacity-60 disabled:hover:bg-emerald-500/90"
                  disabled={joinLoadingId === fort.id}
                >
                  {joinLoadingId === fort.id ? "Надсилаємо заявку…" : "Подати заявку до застави"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}