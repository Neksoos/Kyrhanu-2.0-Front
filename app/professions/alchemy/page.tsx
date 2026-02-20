"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Clock3,
  RefreshCw,
  X,
  ChevronDown,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  Droplets,
} from "lucide-react";

import { resolveTgId } from "@/lib/tg";
import { getJSON, postJSON } from "@/lib/api";

// ======================
// types (match backend)
// ======================
type Ingredient = { material_code: string; qty: number; role: string };

type Recipe = {
  code: string;
  name: string;
  prof_key: string;
  level_req: number;
  brew_time_sec: number;
  output_item_code: string;
  output_amount: number;
  ingredients: Ingredient[];
};

type MissingDTO = {
  material_code: string;
  need: number;
  have: number;
  missing: number;
  role: string;
};

type RecipeStatusDTO = {
  recipe: Recipe;
  can_brew: boolean;
  missing: MissingDTO[];
};

type BrewResponse = {
  queue_id: number;
  recipe_code: string;
  status: string;
  started_at: string;
  finish_at: string;
  seconds_left: number;
  output_item_code: string;
  output_amount: number;
};

type QueueItem = {
  id: number;
  tg_id: number;
  recipe_code: string;
  status: string;
  started_at: string;
  finish_at: string;
  seconds_left: number;
  output_item_code?: string | null;
  output_amount: number;
};

type HerbInvDTO = {
  item_code: string;
  name: string;
  emoji?: string | null;
  category: string;
  amount: number;
};

type DryingSlotDTO = {
  slot_index: number;
  tg_id: number;
  input_item_code?: string | null;
  input_amount: number;
  output_material_code?: string | null;
  output_amount: number;
  started_at?: string | null;
  finish_at?: string | null;
  seconds_left: number;
  status: "empty" | "drying" | "done";
};

const DRY_SLOTS = 5;

// ======================
// utils
// ======================
function isPromise<T>(v: any): v is Promise<T> {
  return v && typeof v === "object" && typeof v.then === "function";
}

function formatDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function Pill({
  children,
  tone = "neutral",
  icon,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "emerald" | "amber";
  icon?: React.ReactNode;
}) {
  const cls =
    tone === "ok" || tone === "emerald"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
      : tone === "warn" || tone === "amber"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
      : tone === "bad"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
      : "border-white/12 bg-white/8 text-slate-100";

  return (
    <span className={cx("inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-[11px] border", cls)}>
      {icon ? <span className="opacity-90">{icon}</span> : null}
      {children}
    </span>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-white/5 border border-white/10", className)} />;
}

function byCode<T extends { item_code: string }>(list: T[]) {
  const m = new Map<string, T>();
  for (const x of list) m.set(x.item_code, x);
  return m;
}

/**
 * ✅ IMPORTANT FIX:
 * item_code у бекенді:  alch:potion:healing:t2
 * файл у public/items: potion_healing_t2.png
 */
function potionIconFromItemCode(item_code: string) {
  if (!item_code) return item_code;
  if (item_code.startsWith("alch:potion:")) {
    const parts = item_code.split(":"); // ["alch","potion","healing","t2"]
    if (parts.length >= 4) {
      const effect = parts[2];
      const tier = parts[3];
      return `potion_${effect}_${tier}`;
    }
  }
  return item_code;
}

function itemIconUrl(item_code: string) {
  const iconCode = potionIconFromItemCode(item_code);
  return `/items/${encodeURIComponent(iconCode)}.png?v=${Math.floor(Date.now() / 60000)}`;
}

function materialIconUrl(material_code: string) {
  return `/materials/${encodeURIComponent(material_code)}.png?v=${Math.floor(Date.now() / 60000)}`;
}

function ItemIcon({
  item_code,
  emoji,
  sizeClass = "h-8 w-8",
  roundedClass = "rounded-2xl",
  bgClass = "bg-black/20",
  borderClass = "border border-white/10",
  textClass = "text-xl",
  imgClass = "h-full w-full object-contain",
  ringTone = "neutral",
}: {
  item_code: string;
  emoji?: string | null;
  sizeClass?: string;
  roundedClass?: string;
  bgClass?: string;
  borderClass?: string;
  textClass?: string;
  imgClass?: string;
  ringTone?: "neutral" | "emerald" | "amber" | "rose";
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [item_code]);

  const ring =
    ringTone === "emerald"
      ? "ring-1 ring-emerald-400/20"
      : ringTone === "amber"
      ? "ring-1 ring-amber-400/20"
      : ringTone === "rose"
      ? "ring-1 ring-rose-400/20"
      : "ring-1 ring-white/10";

  return (
    <div
      className={cx(
        sizeClass,
        roundedClass,
        borderClass,
        bgClass,
        ring,
        "relative flex items-center justify-center overflow-hidden"
      )}
    >
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -top-8 -left-8 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl" />
        <div className="absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />
      </div>

      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={itemIconUrl(item_code)}
          alt={item_code}
          className={cx("relative", imgClass)}
          onError={() => setBroken(true)}
          draggable={false}
        />
      ) : (
        <div className={cx("relative", textClass)}>{emoji || "🌿"}</div>
      )}
    </div>
  );
}

function TinyMatIcon({ code }: { code: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [code]);

  return (
    <div className="h-7 w-7 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center overflow-hidden">
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={materialIconUrl(code)}
          alt={code}
          className="h-full w-full object-contain"
          onError={() => setBroken(true)}
          draggable={false}
        />
      ) : (
        <div className="text-[12px] opacity-70">🧪</div>
      )}
    </div>
  );
}

function ingredientIconItemCode(material_code: string) {
  if (material_code.startsWith("alch_dried_")) {
    return "herb_" + material_code.slice("alch_dried_".length);
  }
  return null;
}

function TinyIngIcon({ material_code }: { material_code: string }) {
  const herbItem = ingredientIconItemCode(material_code);
  if (herbItem) {
    return (
      <ItemIcon
        item_code={herbItem}
        sizeClass="h-7 w-7"
        roundedClass="rounded-xl"
        bgClass="bg-black/20"
        borderClass="border border-white/10"
        imgClass="h-full w-full object-contain"
        textClass="text-[14px]"
      />
    );
  }
  return <TinyMatIcon code={material_code} />;
}

// ======================
// page
// ======================
export default function AlchemyPage() {
  const [tgId, setTgId] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);

  // ✅ 2-tap selection for mobile
  const [selectedHerb, setSelectedHerb] = useState<string | null>(null);

  // -------- queue / brew --------
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueSupported, setQueueSupported] = useState(true);

  const [brewing, setBrewing] = useState<Record<string, boolean>>({});
  const [lastBrew, setLastBrew] = useState<BrewResponse | null>(null);

  // recipes/status
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipeStatus, setRecipeStatus] = useState<RecipeStatusDTO[] | null>(null);
  const [recipesFallback, setRecipesFallback] = useState<Recipe[]>([]);
  const [recipeQ, setRecipeQ] = useState("");
  const [onlyCan, setOnlyCan] = useState(false);
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);

  // -------- herbs + drying --------
  const [herbs, setHerbs] = useState<HerbInvDTO[]>([]);
  const [herbsLoading, setHerbsLoading] = useState(false);

  const [drySlots, setDrySlots] = useState<DryingSlotDTO[]>(
    Array.from({ length: DRY_SLOTS }).map((_, i) => ({
      slot_index: i,
      tg_id: 0,
      input_item_code: null,
      input_amount: 0,
      output_material_code: null,
      output_amount: 0,
      started_at: null,
      finish_at: null,
      seconds_left: 0,
      status: "empty",
    }))
  );
  const [dryLoading, setDryLoading] = useState(false);

  const herbMetaCacheRef = useRef<Map<string, { name: string; emoji?: string | null }>>(new Map());

  // local UI timer
  useEffect(() => {
    const t = setInterval(() => {
      setDrySlots((s) =>
        s.map((x) =>
          x.status === "drying" && x.seconds_left > 0
            ? { ...x, seconds_left: x.seconds_left - 1 }
            : x.status === "drying" && x.seconds_left <= 0
            ? { ...x, seconds_left: 0, status: "done" }
            : x
        )
      );
      setQueue((q) => q.map((x) => ({ ...x, seconds_left: Math.max(0, x.seconds_left - 1) })));
      setLastBrew((lb) => (lb ? { ...lb, seconds_left: Math.max(0, lb.seconds_left - 1) } : lb));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // tgId
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let id = 0;

      try {
        const maybe = resolveTgId() as any;
        if (isPromise<number | undefined>(maybe)) {
          const v = await maybe;
          if (typeof v === "number" && v > 0) id = v;
        } else if (typeof maybe === "number" && maybe > 0) {
          id = maybe;
        }
      } catch {}

      if (!id && typeof window !== "undefined") {
        const saved = localStorage.getItem("tg_id");
        const n = Number(saved);
        if (Number.isFinite(n) && n > 0) id = n;
      }

      if (!cancelled) {
        setTgId(id);
        if (id && typeof window !== "undefined") localStorage.setItem("tg_id", String(id));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----------- backend loads -----------
  async function refreshHerbs() {
    if (!tgId) return;
    setHerbsLoading(true);
    try {
      const data = await getJSON<HerbInvDTO[]>(
        `/api/alchemy/herbs?tg_id=${encodeURIComponent(String(tgId))}`
      );
      const filtered = data.filter((x) => x.amount > 0);

      for (const h of filtered) herbMetaCacheRef.current.set(h.item_code, { name: h.name, emoji: h.emoji });
      setHerbs(filtered);

      if (selectedHerb && !filtered.some((x) => x.item_code === selectedHerb)) setSelectedHerb(null);
    } catch (e: any) {
      setHerbs([]);
      setErr(e?.message || "Не вдалося завантажити трави");
    } finally {
      setHerbsLoading(false);
    }
  }

  async function refreshDrying() {
    if (!tgId) return;
    setDryLoading(true);
    try {
      const data = await getJSON<DryingSlotDTO[]>(
        `/api/alchemy/drying?tg_id=${encodeURIComponent(String(tgId))}`
      );

      const by = new Map<number, DryingSlotDTO>();
      for (const x of data) by.set(x.slot_index, x);

      const filled: DryingSlotDTO[] = Array.from({ length: DRY_SLOTS }).map((_, i) => {
        const v = by.get(i);
        return (
          v || {
            slot_index: i,
            tg_id: tgId,
            input_item_code: null,
            input_amount: 0,
            output_material_code: null,
            output_amount: 0,
            started_at: null,
            finish_at: null,
            seconds_left: 0,
            status: "empty",
          }
        );
      });

      setDrySlots(filled);
    } catch (e: any) {
      setErr(e?.message || "Не вдалося завантажити сушіння");
    } finally {
      setDryLoading(false);
    }
  }

  async function refreshQueue() {
    if (!tgId) return;
    setQueueLoading(true);
    try {
      const data = await getJSON<QueueItem[]>(
        `/api/alchemy/queue?tg_id=${encodeURIComponent(String(tgId))}`
      );
      setQueue(data);
      setQueueSupported(true);
    } catch {
      setQueueSupported(false);
    } finally {
      setQueueLoading(false);
    }
  }

  async function refreshRecipes() {
    setRecipesLoading(true);
    setErr(null);
    try {
      if (tgId) {
        try {
          const st = await getJSON<RecipeStatusDTO[]>(
            `/api/alchemy/recipes/status?tg_id=${encodeURIComponent(String(tgId))}`
          );
          setRecipeStatus(st);
          setRecipesFallback([]);
          return;
        } catch {
          // fallback below
        }
      }

      const data = await getJSON<Recipe[]>("/api/alchemy/recipes");
      setRecipesFallback(data);
      setRecipeStatus(null);
    } catch (e: any) {
      setErr(e?.message || "Не вдалося завантажити рецепти");
      setRecipesFallback([]);
      setRecipeStatus(null);
    } finally {
      setRecipesLoading(false);
    }
  }

  useEffect(() => {
    if (!tgId) return;
    refreshHerbs();
    refreshDrying();
    refreshQueue();
    refreshRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgId]);

  useEffect(() => {
    refreshRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // brew / claim
  async function brew(recipe: Recipe) {
    if (!tgId) {
      setErr("Не знайдено Telegram ID. Запусти мініап з бота.");
      return;
    }

    setBrewing((m) => ({ ...m, [recipe.code]: true }));
    setErr(null);

    try {
      const data = await postJSON<BrewResponse>("/api/alchemy/brew", { tg_id: tgId, recipe_code: recipe.code });
      setLastBrew(data);

      setQueue((q) => {
        if (q.some((x) => x.id === data.queue_id)) return q;
        return [
          {
            id: data.queue_id,
            tg_id: tgId,
            recipe_code: data.recipe_code,
            status: data.status,
            started_at: data.started_at,
            finish_at: data.finish_at,
            seconds_left: data.seconds_left,
            output_item_code: data.output_item_code,
            output_amount: data.output_amount,
          },
          ...q,
        ];
      });
    } catch (e: any) {
      setErr(e?.message || "Не вдалося розпочати варку");
    } finally {
      setBrewing((m) => ({ ...m, [recipe.code]: false }));
      if (queueSupported) refreshQueue();
      refreshRecipes();
    }
  }

  async function claim(queueId: number) {
    if (!tgId) return;
    setErr(null);

    try {
      await postJSON<any>(`/api/alchemy/claim/${queueId}?tg_id=${encodeURIComponent(String(tgId))}`, {});
      setQueue((q) => q.filter((x) => x.id !== queueId));
      if (lastBrew?.queue_id === queueId) setLastBrew(null);
    } catch (e: any) {
      setErr(e?.message || "Не вдалося забрати зілля");
    } finally {
      if (queueSupported) refreshQueue();
    }
  }

  // drag & drop (ПК)
  function onHerbDragStart(e: React.DragEvent, item_code: string) {
    e.dataTransfer.setData("text/plain", item_code);
    e.dataTransfer.effectAllowed = "move";
  }

  function onSlotDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function startDrying(slot_index: number, item_code: string) {
    if (!tgId || !item_code) return;

    setErr(null);

    const slot = drySlots.find((s) => s.slot_index === slot_index);
    if (slot && slot.status !== "empty") {
      setErr("Слот зайнятий");
      return;
    }

    try {
      const meta = herbs.find((h) => h.item_code === item_code);
      if (meta) herbMetaCacheRef.current.set(item_code, { name: meta.name, emoji: meta.emoji });

      await postJSON<DryingSlotDTO>("/api/alchemy/drying/start", {
        tg_id: tgId,
        slot_index,
        item_code,
        amount: 1,
      });

      setSelectedHerb(null);
      await Promise.all([refreshHerbs(), refreshDrying(), refreshRecipes()]);
    } catch (e: any) {
      setErr(e?.message || "Не вдалося почати сушіння");
      await Promise.all([refreshHerbs(), refreshDrying(), refreshRecipes()]);
    }
  }

  async function onSlotDrop(e: React.DragEvent, slot_index: number) {
    e.preventDefault();
    const item_code = e.dataTransfer.getData("text/plain");
    if (!item_code) return;
    await startDrying(slot_index, item_code);
  }

  async function cancelSlot(slot_index: number) {
    if (!tgId) return;
    setErr(null);

    try {
      await postJSON<any>(`/api/alchemy/drying/cancel/${slot_index}?tg_id=${encodeURIComponent(String(tgId))}`, {});
      await Promise.all([refreshHerbs(), refreshDrying(), refreshRecipes()]);
    } catch (e: any) {
      setErr(e?.message || "Не вдалося скасувати сушіння");
    }
  }

  async function claimSlot(slot_index: number) {
    if (!tgId) return;
    setErr(null);

    try {
      await postJSON<any>(`/api/alchemy/drying/claim/${slot_index}?tg_id=${encodeURIComponent(String(tgId))}`, {});
      await Promise.all([refreshDrying(), refreshRecipes()]);
    } catch (e: any) {
      setErr(e?.message || "Не вдалося забрати матеріал");
    }
  }

  const herbByCode = useMemo(() => byCode(herbs), [herbs]);

  function herbMeta(item_code: string | null | undefined) {
    if (!item_code) return null;
    const live = herbByCode.get(item_code);
    if (live) return { name: live.name, emoji: live.emoji };
    const cached = herbMetaCacheRef.current.get(item_code);
    if (cached) return cached;
    return { name: item_code, emoji: "🌿" };
  }

  const recipesForUI = useMemo(() => {
    if (recipeStatus) {
      return recipeStatus
        .map((x) => ({ recipe: x.recipe, can_brew: x.can_brew, missing: x.missing }))
        .filter(({ recipe }) => {
          const q = recipeQ.trim().toLowerCase();
          if (!q) return true;
          return (
            recipe.name.toLowerCase().includes(q) ||
            recipe.code.toLowerCase().includes(q) ||
            recipe.output_item_code.toLowerCase().includes(q)
          );
        })
        .filter((x) => (onlyCan ? x.can_brew : true));
    }

    return recipesFallback
      .filter((r) => {
        const q = recipeQ.trim().toLowerCase();
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.output_item_code.toLowerCase().includes(q)
        );
      })
      .map((r) => ({ recipe: r, can_brew: true as boolean, missing: [] as MissingDTO[] }));
  }, [recipeStatus, recipesFallback, recipeQ, onlyCan]);

  const pageStatus = useMemo(() => {
    if (err) return "warn" as const;
    if (!tgId) return "warn" as const;
    return "ok" as const;
  }, [err, tgId]);

  // ======================
  // UI
  // ======================
  return (
    <main className="min-h-[100dvh] text-slate-50 flex justify-center px-4 py-6 bg-[radial-gradient(1200px_600px_at_15%_-10%,rgba(16,185,129,0.20),transparent_60%),radial-gradient(900px_540px_at_100%_10%,rgba(56,189,248,0.16),transparent_58%),radial-gradient(800px_600px_at_20%_120%,rgba(245,158,11,0.10),transparent_60%),linear-gradient(to_bottom,rgba(2,6,23,1),rgba(0,0,0,1))]">
      {/* subtle scan/noise */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 2px)",
        }}
      />

      <div className="w-full max-w-6xl relative space-y-4">
        <div className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,0.25),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(56,189,248,0.22),transparent_60%)]" />

        {/* HERO HEADER */}
        <motion.header
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-[0_24px_90px_-55px_rgba(0,0,0,0.9)]"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" />
          <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center">
                  <FlaskConical className="w-6 h-6 opacity-90" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Алхімія</h1>
                  <p className="text-xs md:text-sm text-slate-300">
                    Сушіння трав → реагенти → варка → черга.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill
                  tone={pageStatus === "ok" ? "ok" : "warn"}
                  icon={pageStatus === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                >
                  {tgId ? "Підключено" : "Немає TG"}
                </Pill>

                <Pill tone="neutral" icon={<Sparkles className="h-3.5 w-3.5" />}>
                  Порада: спочатку суши трави
                </Pill>

                {tgId ? <Pill tone="neutral">tg_id: {tgId}</Pill> : null}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm disabled:opacity-50"
                onClick={() => {
                  refreshHerbs();
                  refreshDrying();
                  refreshQueue();
                  refreshRecipes();
                }}
                disabled={!tgId || herbsLoading || dryLoading || queueLoading || recipesLoading}
                aria-label="reload all"
              >
                <RefreshCw className={cx("w-4 h-4", herbsLoading || dryLoading || queueLoading || recipesLoading ? "animate-spin" : "")} />
                Оновити
              </button>
            </div>
          </div>
        </motion.header>

        {/* Error toast */}
        <AnimatePresence>
          {err && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="rounded-3xl border border-rose-500/35 bg-rose-950/25 backdrop-blur-md p-4 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-rose-200">Помилка</div>
                  <div className="text-sm text-rose-100/90 mt-1">{err}</div>
                </div>
                <button
                  className="px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm"
                  onClick={() => setErr(null)}
                >
                  Закрити
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DRYING */}
        <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-xl shadow-black/50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold flex items-center gap-2">
                <Leaf className="w-4 h-4 opacity-80" />
                Сушіння трав
                <Pill tone={selectedHerb ? "ok" : "neutral"}>{selectedHerb ? "Обрано траву" : "Вибери траву"}</Pill>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5 truncate">
                {selectedHerb ? "Тепер тапни по слоту сушіння 👇" : "Тапни траву в інвентарі (мобіла) або перетягни (ПК)."}
              </div>
            </div>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm disabled:opacity-50"
              onClick={() => {
                refreshHerbs();
                refreshDrying();
                refreshRecipes();
              }}
              disabled={!tgId || herbsLoading || dryLoading}
            >
              <RefreshCw className={cx("w-4 h-4", herbsLoading || dryLoading ? "animate-spin" : "")} />
              Оновити
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {drySlots.map((s) => {
              const meta = herbMeta(s.input_item_code || null);
              const done = s.status === "done" || (s.status === "drying" && s.seconds_left <= 0);
              const empty = s.status === "empty";

              const progress01 =
                s.status === "drying" && s.finish_at && s.started_at
                  ? clamp(
                      1 -
                        s.seconds_left /
                          Math.max(
                            1,
                            (new Date(s.finish_at).getTime() - new Date(s.started_at).getTime()) / 1000
                          ),
                      0,
                      1
                    )
                  : done
                  ? 1
                  : 0;

              return (
                <div key={s.slot_index} className="space-y-2">
                  <div
                    onDragOver={onSlotDragOver}
                    onDrop={(e) => onSlotDrop(e, s.slot_index)}
                    onClick={() => {
                      if (!empty) return;
                      if (!selectedHerb) return;
                      startDrying(s.slot_index, selectedHerb);
                    }}
                    className={cx(
                      "relative aspect-square rounded-3xl border overflow-hidden",
                      "flex items-center justify-center text-center transition",
                      empty
                        ? `border-white/10 bg-black/20 hover:border-white/20 ${selectedHerb ? "cursor-pointer" : ""}`
                        : done
                        ? "border-emerald-400/25 bg-black/25"
                        : "border-emerald-400/15 bg-black/25"
                    )}
                    title={empty ? (selectedHerb ? "Тапни щоб покласти траву" : "Спочатку вибери траву") : undefined}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.18),transparent_55%)]" />

                    {!empty && (
                      <div className="pointer-events-none absolute inset-x-3 bottom-3 h-2 rounded-full bg-black/40 border border-white/10 overflow-hidden">
                        <div
                          className="h-full bg-emerald-300/60"
                          style={{ width: `${Math.round(progress01 * 100)}%` }}
                        />
                      </div>
                    )}

                    {empty ? (
                      <div className="relative text-xs text-slate-300 px-3">
                        <div className="text-2xl mb-1">⬚</div>
                        <div>{selectedHerb ? "Тапни сюди" : "Вибери траву"}</div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <div className="absolute inset-0 p-2">
                          <ItemIcon
                            item_code={s.input_item_code || "unknown"}
                            emoji={meta?.emoji}
                            sizeClass="h-full w-full"
                            roundedClass="rounded-3xl"
                            bgClass="bg-transparent"
                            borderClass="border-0"
                            textClass="text-4xl"
                            imgClass="h-full w-full object-cover"
                            ringTone={done ? "emerald" : "neutral"}
                          />
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                          <div className="text-[11px] text-slate-100 font-semibold truncate">
                            {meta?.name || s.input_item_code}
                          </div>
                          <div className="text-[10px] text-slate-300 font-mono truncate">× {s.input_amount}</div>

                          {done && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                claimSlot(s.slot_index);
                              }}
                              className="mt-2 w-full px-3 py-2 rounded-2xl font-semibold bg-gradient-to-r from-emerald-400/90 to-cyan-400/90 text-black hover:brightness-110 transition"
                            >
                              Забрати
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelSlot(s.slot_index);
                          }}
                          className="absolute top-2 right-2 px-2.5 py-2 rounded-2xl border border-white/10 bg-white/10 hover:bg-white/15 transition"
                          title="Скасувати / повернути траву"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[11px] text-slate-300">
                    {empty ? (
                      <span className="opacity-70">Порожньо</span>
                    ) : done ? (
                      <span className="text-emerald-200 font-semibold">Готово ✅</span>
                    ) : (
                      <>
                        Залишилось: <span className="font-semibold text-slate-100">{formatDuration(s.seconds_left)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* GRID: queue | right side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Queue */}
          <section className="lg:col-span-1">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-xl shadow-black/50">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    <Clock3 className="w-4 h-4 opacity-80" />
                    Черга варки
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 truncate">
                    Активні варки та готові до збору.
                  </div>
                </div>

                <button
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm disabled:opacity-50"
                  onClick={refreshQueue}
                  disabled={!tgId || queueLoading}
                >
                  <RefreshCw className={cx("w-4 h-4", queueLoading ? "animate-spin" : "")} />
                  Оновити
                </button>
              </div>

              <div className="mt-3">
                {!tgId ? (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                    Не вдалося визначити Telegram ID. Запусти мініап з бота.
                  </div>
                ) : !queueSupported ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
                    <div className="font-semibold">Черга тимчасово недоступна</div>
                  </div>
                ) : queueLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                ) : queue.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
                    <div className="font-semibold">Порожньо</div>
                    <div className="text-xs text-slate-300 mt-1">Обери рецепт справа та натисни «Варити».</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((q) => {
                      const done = q.seconds_left <= 0;
                      return (
                        <div
                          key={q.id}
                          className="rounded-3xl border border-white/10 bg-black/25 p-3 hover:border-emerald-400/25 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">
                                {q.output_item_code ? q.output_item_code : q.recipe_code}
                              </div>
                              <div className="text-xs text-slate-300 mt-0.5">
                                {done ? (
                                  <span className="text-emerald-200">Готово до збору</span>
                                ) : (
                                  <>Залишилось: {formatDuration(q.seconds_left)}</>
                                )}
                              </div>
                            </div>

                            {done ? (
                              <button
                                className="px-3 py-2 rounded-2xl font-semibold bg-gradient-to-r from-emerald-400/90 to-cyan-400/90 text-black hover:brightness-110 transition"
                                onClick={() => claim(q.id)}
                              >
                                Забрати
                              </button>
                            ) : (
                              <Pill tone="neutral">Вариться</Pill>
                            )}
                          </div>

                          <div className="mt-2 text-[11px] text-slate-300">
                            Вихід:{" "}
                            <span className="font-semibold text-slate-100">
                              {q.output_item_code || "?"} × {q.output_amount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right side */}
          <section className="lg:col-span-2 space-y-4">
            {/* Herbs inventory */}
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-xl shadow-black/50">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    <Leaf className="w-4 h-4 opacity-80" />
                    Трави в інвентарі
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 truncate">
                    {selectedHerb ? "Вибрано — тапни слот сушіння" : "Тапни траву (мобіла) або перетягни (ПК)."}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedHerb && (
                    <button
                      className="px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm"
                      onClick={() => setSelectedHerb(null)}
                    >
                      Скасувати
                    </button>
                  )}

                  <button
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm disabled:opacity-50"
                    onClick={refreshHerbs}
                    disabled={!tgId || herbsLoading}
                  >
                    <RefreshCw className={cx("w-4 h-4", herbsLoading ? "animate-spin" : "")} />
                    Оновити
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {!tgId ? (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                    Нема TG — не можу підтягнути інвентар.
                  </div>
                ) : herbsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-24" />
                  </div>
                ) : herbs.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
                    Нема трав в інвентарі.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                    {herbs.map((h) => {
                      const selected = selectedHerb === h.item_code;
                      return (
                        <div
                          key={h.item_code}
                          draggable
                          onDragStart={(e) => onHerbDragStart(e, h.item_code)}
                          onClick={() => setSelectedHerb(h.item_code)}
                          className={cx(
                            "aspect-square rounded-2xl border bg-black/25 hover:border-emerald-400/25 transition",
                            "p-2 flex flex-col items-center justify-center text-center cursor-pointer",
                            selected ? "border-emerald-400/60 ring-2 ring-emerald-400/25" : "border-white/10"
                          )}
                          title="Тапни щоб вибрати (мобіла) / перетягни (ПК)"
                        >
                          <ItemIcon item_code={h.item_code} emoji={h.emoji} ringTone={selected ? "emerald" : "neutral"} />
                          <div className="mt-1 text-[10px] text-slate-200 font-semibold truncate w-full">{h.name}</div>
                          <div className="text-[9px] text-slate-400 truncate w-full">× {h.amount}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recipes */}
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-xl shadow-black/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    <Droplets className="w-4 h-4 opacity-80" />
                    Рецепти
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 truncate">
                    {recipeStatus ? "Показуємо доступність + що бракує." : "Без TG показуємо базовий список."}
                  </div>
                </div>

                <button
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm disabled:opacity-50"
                  onClick={refreshRecipes}
                  disabled={recipesLoading}
                >
                  <RefreshCw className={cx("w-4 h-4", recipesLoading ? "animate-spin" : "")} />
                  Оновити
                </button>
              </div>

              <div className="mt-3 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                <div className="relative w-full md:max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
                  <input
                    value={recipeQ}
                    onChange={(e) => setRecipeQ(e.target.value)}
                    placeholder="Пошук рецепта…"
                    className="w-full pl-9 pr-3 py-2 rounded-2xl border border-white/10 bg-black/20 outline-none focus:border-emerald-400/25"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className={cx(
                      "px-3 py-2 rounded-2xl border text-sm transition",
                      onlyCan ? "border-emerald-400/35 bg-emerald-400/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                    )}
                    onClick={() => setOnlyCan((v) => !v)}
                    disabled={!recipeStatus}
                    title={!recipeStatus ? "Фільтр працює тільки з /recipes/status" : "Показувати тільки доступні"}
                  >
                    {onlyCan ? "✅ Лише доступні" : "Усі"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {recipesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                  </div>
                ) : recipesForUI.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
                    Нічого не знайдено.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recipesForUI.slice(0, 12).map(({ recipe: r, can_brew, missing }) => {
                      const opened = openRecipe === r.code;
                      const can = recipeStatus ? can_brew : true;

                      return (
                        <div
                          key={r.code}
                          className="rounded-3xl border border-white/10 bg-black/25 overflow-hidden hover:border-emerald-400/20 transition"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenRecipe((cur) => (cur === r.code ? null : r.code))}
                            className="w-full p-4 text-left hover:bg-white/5 transition flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0 flex items-start gap-3">
                              <ItemIcon
                                item_code={r.output_item_code}
                                sizeClass="h-11 w-11"
                                roundedClass="rounded-3xl"
                                bgClass="bg-black/25"
                                borderClass="border border-white/10"
                                imgClass="h-full w-full object-contain"
                                textClass="text-2xl"
                                ringTone={can ? "emerald" : "rose"}
                              />

                              <div className="min-w-0">
                                <div className="font-semibold truncate">{r.name}</div>
                                <div className="text-[11px] text-slate-300 font-mono mt-1 truncate">{r.code}</div>
                                <div className="mt-2 flex flex-wrap gap-2 items-center">
                                  <Pill tone="neutral">lvl {r.level_req}</Pill>
                                  <Pill tone="neutral">{formatDuration(r.brew_time_sec)}</Pill>
                                  {recipeStatus && (
                                    <Pill
                                      tone={can_brew ? "ok" : "warn"}
                                      icon={can_brew ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                    >
                                      {can_brew ? "Можна" : "Бракує"}
                                    </Pill>
                                  )}
                                </div>
                              </div>
                            </div>

                            <ChevronDown className={cx("w-5 h-5 opacity-80 mt-1 transition", opened && "rotate-180")} />
                          </button>

                          <AnimatePresence initial={false}>
                            {opened && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-4"
                              >
                                <div className="mt-1">
                                  <div className="text-[11px] text-slate-300 mb-2">Інгредієнти</div>

                                  <div className="flex flex-wrap gap-2">
                                    {r.ingredients.map((ing) => {
                                      const miss = missing?.find(
                                        (m) => m.material_code === ing.material_code && m.role === ing.role
                                      );
                                      const isMissing = !!miss && miss.missing > 0;

                                      return (
                                        <div
                                          key={`${ing.material_code}:${ing.role}`}
                                          className={cx(
                                            "flex items-center gap-2 rounded-2xl border px-2 py-1",
                                            isMissing ? "border-rose-400/25 bg-rose-400/10" : "border-white/10 bg-black/20"
                                          )}
                                          title={`${ing.role}: ${ing.material_code} × ${ing.qty}${
                                            isMissing ? ` (бракує ${miss!.missing})` : ""
                                          }`}
                                        >
                                          <TinyIngIcon material_code={ing.material_code} />
                                          <div className="min-w-0">
                                            <div className="text-[11px] text-slate-100 font-semibold leading-4 truncate max-w-[160px]">
                                              {ing.role}
                                            </div>
                                            <div className="text-[10px] text-slate-300 font-mono leading-4 truncate max-w-[160px]">
                                              {ing.material_code} × {ing.qty}
                                              {isMissing ? <span className="text-rose-200"> (−{miss!.missing})</span> : null}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                  <Pill tone="neutral">Вихід: {r.output_amount}×</Pill>

                                  <button
                                    className="px-4 py-2 rounded-2xl font-semibold bg-gradient-to-r from-emerald-400/90 to-cyan-400/90 text-black hover:brightness-110 transition disabled:opacity-60"
                                    onClick={() => brew(r)}
                                    disabled={!!brewing[r.code] || (recipeStatus ? !can_brew : false)}
                                    title={recipeStatus && !can_brew ? "Не вистачає інгредієнтів" : "Варити"}
                                  >
                                    {brewing[r.code] ? "Варимо…" : "Варити"}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}