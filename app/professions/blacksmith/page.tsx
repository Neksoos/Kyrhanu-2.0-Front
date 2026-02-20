"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  Anvil,
  ChevronDown,
  Flame,
  PackageOpen,
  Shield,
  Sword,
  Shirt,
  Hand,
  HardHat,
  Footprints,
  RefreshCw,
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { resolveTgId } from "@/lib/tg";
import { getJSON, postJSON } from "@/lib/api";

// ---------------------------------------------
// Types (frontend-friendly; backend can match)
// ---------------------------------------------
type Ingredient = {
  material_code: string; // item_code
  qty: number;
  role?: string;
};

type Recipe = {
  code: string;
  name: string;
  slot: "weapon" | "helmet" | "armor" | "gloves" | "boots" | "shield" | "other";
  level_req: number;
  forge_hits?: number;
  base_progress_per_hit?: number;
  heat_sensitivity?: number; // 0..1
  rhythm_window_ms?: [number, number]; // [min,max]
  output_item_code: string;
  output_amount: number;
  ingredients: Ingredient[];
};

type MissingDTO = {
  material_code: string;
  need: number;
  have: number;
  missing: number;
  role?: string;
};

type RecipeStatusDTO = {
  recipe: Recipe;
  can_forge: boolean;
  missing: MissingDTO[];
};

type ForgeStartResponse = {
  forge_id: number;
  recipe_code: string;
  required_hits: number;
  base_progress_per_hit: number;
  heat_sensitivity: number;
  rhythm_window_ms: [number, number];
};

type ForgeCancelResponse = {
  ok: boolean;
  refunded?: boolean;
};

// ---------------------------------------------
// Smelt types
// ---------------------------------------------
type SmeltRecipe = {
  code: string;
  name: string;
  output_item_code: string;
  output_amount: number;
  ingredients: Ingredient[];
};

type SmeltStatusDTO = {
  recipe: SmeltRecipe;
  can_smelt: boolean;
  missing: MissingDTO[];
};

type SmeltStartResponse = {
  ok: boolean;
  recipe_code: string;
  item_code: string;
  amount: number;
};

// ---------------------------------------------
// Items brief (names dictionary)
// ---------------------------------------------
type ItemBrief = { code: string; name: string };

// craft_materials responses in your backend can be:
type CraftListDTO =
  | ItemBrief[]
  | { ok: boolean; items: Array<{ code: string; name: string }> };

// ---------------------------------------------
// UI helpers
// ---------------------------------------------
const SLOT_META: Record<Recipe["slot"], { label: string; icon: React.ReactNode }> = {
  weapon: { label: "Зброя", icon: <Sword className="h-4 w-4" /> },
  helmet: { label: "Шолом", icon: <HardHat className="h-4 w-4" /> },
  armor: { label: "Броня", icon: <Shirt className="h-4 w-4" /> },
  gloves: { label: "Рукавиці", icon: <Hand className="h-4 w-4" /> },
  boots: { label: "Чоботи", icon: <Footprints className="h-4 w-4" /> },
  shield: { label: "Щит", icon: <Shield className="h-4 w-4" /> },
  other: { label: "Інше", icon: <PackageOpen className="h-4 w-4" /> },
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
function fmtPct(v01: number) {
  return `${Math.round(clamp(v01, 0, 1) * 100)}%`;
}
function safeAudioPlay(a?: HTMLAudioElement | null) {
  if (!a) return;
  try {
    a.currentTime = 0;
    void a.play();
  } catch {}
}

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

// ✅ debug-friendly unknown
function itemLabel(code: string, itemNames: Record<string, string>) {
  return itemNames[code] || `Невідомий предмет (${code})`;
}

// ✅ show output item name for recipe selection
function recipeDisplayName(r: Recipe, itemNames: Record<string, string>) {
  return itemLabel(r.output_item_code, itemNames);
}

function Pill({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: "neutral" | "good" | "warn" | "bad" | "amber" | "emerald";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "good" || tone === "emerald"
      ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-200"
      : tone === "warn" || tone === "amber"
      ? "border-amber-700/50 bg-amber-950/30 text-amber-200"
      : tone === "bad"
      ? "border-rose-800/60 bg-rose-950/30 text-rose-200"
      : "border-zinc-800 bg-zinc-950/40 text-zinc-300";

  return (
    <div className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", toneClass)}>
      {icon ? <span className="opacity-90">{icon}</span> : null}
      <span className="leading-none">{children}</span>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-zinc-900/70 border border-zinc-800/60", className)} />;
}

function ItemIcon({
  code,
  size = 56,
  className = "",
  label,
  ringTone = "neutral",
}: {
  code: string;
  size?: number;
  className?: string;
  label?: string;
  ringTone?: "neutral" | "amber" | "emerald" | "rose";
}) {
  const srcA = `/items/${code}.png`;
  const srcB = `/icons/items/${code}.png`;
  const srcC = `/items/_unknown.png`; // ✅ add this file to public/items/_unknown.png
  const [src, setSrc] = useState(srcA);

  useEffect(() => setSrc(srcA), [code]);

  const ring =
    ringTone === "amber"
      ? "ring-1 ring-amber-300/20"
      : ringTone === "emerald"
      ? "ring-1 ring-emerald-300/20"
      : ringTone === "rose"
      ? "ring-1 ring-rose-300/20"
      : "ring-1 ring-white/10";

  return (
    <div
      className={cx(
        "relative rounded-2xl bg-zinc-950/35 border border-zinc-800 flex items-center justify-center overflow-hidden",
        ring,
        className
      )}
      style={{ width: size, height: size }}
      title={label || code}
    >
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -top-8 -left-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
        <div className="absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label || code}
        width={size}
        height={size}
        className="relative object-contain p-2"
        onError={() => {
          if (src === srcA) setSrc(srcB);
          else if (src === srcB) setSrc(srcC);
        }}
      />
    </div>
  );
}

function SegmentedTab({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "amber" | "emerald";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "rounded-2xl px-4 py-3 text-sm font-medium transition focus:outline-none",
        active
          ? tone === "amber"
            ? "bg-amber-500/12 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.28)]"
            : "bg-emerald-500/12 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.26)]"
          : "text-zinc-300 hover:bg-zinc-900/60"
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------
// Page
// ---------------------------------------------
export default function BlacksmithPage() {
  const [tgId, setTgId] = useState<number | null>(null);

  // Tabs
  const [tab, setTab] = useState<"forge" | "smelt">("smelt");

  // Forge states
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<RecipeStatusDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Smelt states
  const [smeltLoading, setSmeltLoading] = useState(false);
  const [smeltStatuses, setSmeltStatuses] = useState<SmeltStatusDTO[]>([]);
  const [smeltBusyCode, setSmeltBusyCode] = useState<string | null>(null);

  // Items dictionary (code -> uk name)
  const [itemNames, setItemNames] = useState<Record<string, string>>({});

  // Selection (forge)
  const [slot, setSlot] = useState<Recipe["slot"]>("weapon");
  const [openSlot, setOpenSlot] = useState(false);
  const [recipeCode, setRecipeCode] = useState<string>("");
  const [openRecipe, setOpenRecipe] = useState(false);

  // Forge mode
  const [forgeMode, setForgeMode] = useState<"idle" | "ready" | "forging" | "done">("idle");
  const [forgeId, setForgeId] = useState<number | null>(null);
  const [requiredHits, setRequiredHits] = useState<number>(60);
  const [hits, setHits] = useState<number>(0);
  const [progress01, setProgress01] = useState<number>(0);

  // Heat & rhythm
  const [heat01, setHeat01] = useState<number>(0);
  const lastTapRef = useRef<number>(0);
  const heatDecayRef = useRef<number | null>(null);

  // Server tuning
  const baseProgressPerHitRef = useRef<number>(1 / 60);
  const heatSensitivityRef = useRef<number>(0.65);
  const rhythmWindowRef = useRef<[number, number]>([120, 220]);

  // Sound toggle
  const [soundOn, setSoundOn] = useState(true);
  const hammerARef = useRef<HTMLAudioElement | null>(null);
  const hammerBRef = useRef<HTMLAudioElement | null>(null);
  const sizzleRef = useRef<HTMLAudioElement | null>(null);
  const finishRef = useRef<HTMLAudioElement | null>(null);

  // Animation refs
  const [hitPulse, setHitPulse] = useState(0);

  // Backend/demofallback hint
  const [usingDemo, setUsingDemo] = useState(false);

  // Derived (forge)
  const bySlot = useMemo(() => {
    const m = new Map<Recipe["slot"], RecipeStatusDTO[]>();
    for (const s of statuses) {
      const arr = m.get(s.recipe.slot) || [];
      arr.push(s);
      m.set(s.recipe.slot, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => a.recipe.level_req - b.recipe.level_req);
      m.set(k, arr);
    }
    return m;
  }, [statuses]);

  const slotStatuses = bySlot.get(slot) || [];

  const selectedStatus = useMemo(() => {
    return statuses.find((s) => s.recipe.code === recipeCode) || null;
  }, [statuses, recipeCode]);

  const selectedRecipe = selectedStatus?.recipe || null;
  const canForgeNow = selectedStatus?.can_forge ?? false;

  function autoSelectFirstRecipeIfNeeded() {
    const arr = slotStatuses;
    if (!arr.length) {
      setRecipeCode("");
      setForgeMode("idle");
      return;
    }
    if (!recipeCode || !arr.some((x) => x.recipe.code === recipeCode)) {
      setRecipeCode(arr[0].recipe.code);
      setForgeMode("ready");
    } else {
      setForgeMode("ready");
    }
  }

  // ---------------------------------------------
  // LOADERS
  // ---------------------------------------------
  async function loadForge() {
    setLoading(true);
    setError(null);
    try {
      const id = resolveTgId();
      setTgId(id);

      const data = await getJSON<RecipeStatusDTO[]>(`/api/blacksmith/recipes/status?tg_id=${id}`);
      setStatuses(Array.isArray(data) ? data : []);
      setUsingDemo(false);
    } catch {
      // demo fallback (forge)
      const demo: RecipeStatusDTO[] = [
        {
          recipe: {
            code: "smith_knife_iron_1",
            name: "Залізний ніж ремісника",
            slot: "weapon",
            level_req: 1,
            forge_hits: 45,
            output_item_code: "knife_iron_01",
            output_amount: 1,
            ingredients: [
              { material_code: "smith_ingot_zalizna", qty: 2, role: "metal" },
              { material_code: "leather_strip", qty: 1, role: "binding" },
            ],
          },
          can_forge: true,
          missing: [],
        },
      ];
      setStatuses(demo);
      setUsingDemo(true);
      setError("Бекенд ковальства недоступний — показую демо-рецепти.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSmelt() {
    setSmeltLoading(true);
    setError(null);
    try {
      const id = resolveTgId();
      setTgId(id);

      const data = await getJSON<SmeltStatusDTO[]>(`/api/blacksmith/smelt/recipes/status?tg_id=${id}`);
      setSmeltStatuses(Array.isArray(data) ? data : []);
      setUsingDemo(false);
    } catch {
      // demo fallback (smelt)
      const demo: SmeltStatusDTO[] = [
        {
          recipe: {
            code: "smelt_fuel_1",
            name: "Паливо: ковалівське вугілля",
            output_item_code: "smith_fuel_vuhilna_zhyla",
            output_amount: 1,
            ingredients: [{ material_code: "ore_vuhilna_zhyla", qty: 2, role: "ore" }],
          },
          can_smelt: true,
          missing: [],
        },
        {
          recipe: {
            code: "smelt_iron_1",
            name: "Плавка: залізний чушок",
            output_item_code: "smith_ingot_zalizna",
            output_amount: 1,
            ingredients: [
              { material_code: "ore_ruda_zalizna", qty: 3, role: "ore" },
              { material_code: "smith_fuel_vuhilna_zhyla", qty: 1, role: "fuel" },
            ],
          },
          can_smelt: false,
          missing: [{ material_code: "ore_ruda_zalizna", need: 3, have: 1, missing: 2, role: "ore" }],
        },
      ];
      setSmeltStatuses(demo);
      setUsingDemo(true);
      setError("Бекенд плавки недоступний — показую демо.");
    } finally {
      setSmeltLoading(false);
    }
  }

  // ✅ loads BOTH items and craft_materials dictionaries
  async function loadItemNames() {
    try {
      const map: Record<string, string> = {};

      // items
      const items = await getJSON<ItemBrief[]>(`/api/items/brief`);
      for (const it of items || []) {
        if (it?.code && it?.name) map[it.code] = it.name;
      }

      // craft_materials
      try {
        const crafts = await getJSON<ItemBrief[]>(`/api/craft_materials/brief`);
        for (const it of crafts || []) {
          if (it?.code && it?.name) map[it.code] = it.name;
        }
      } catch {
        const crafts2 = await getJSON<CraftListDTO>(`/api/craft_materials/list`);
        if (Array.isArray(crafts2)) {
          for (const it of crafts2) {
            if (it?.code && it?.name) map[it.code] = it.name;
          }
        } else if ((crafts2 as any)?.ok && Array.isArray((crafts2 as any).items)) {
          for (const it of (crafts2 as any).items) {
            if (it?.code && it?.name) map[it.code] = it.name;
          }
        }
      }

      setItemNames((prev) => ({ ...prev, ...map }));
    } catch {
      setItemNames((prev) => ({
        ...prev,
        ingot_iron: "Залізний злиток",
        rivet_set: "Набір заклепок",
        smith_reagent: "Ковальський реагент",
        smith_quench_mix: "Гартувальна суміш",
      }));
    }
  }

  async function loadAll() {
    await Promise.all([loadSmelt(), loadForge()]);
    await loadItemNames();
  }

  // init
  useEffect(() => {
    hammerARef.current = new Audio("/sounds/hammer_1.mp3");
    hammerBRef.current = new Audio("/sounds/hammer_2.mp3");
    sizzleRef.current = new Audio("/sounds/sizzle.mp3");
    finishRef.current = new Audio("/sounds/forge_finish.mp3");
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // slot change => keep recipe selection valid
  useEffect(() => {
    if (!loading) autoSelectFirstRecipeIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, slot, statuses]);

  // Heat decay loop
  useEffect(() => {
    if (forgeMode !== "forging") return;

    const tick = () => {
      setHeat01((h) => clamp(h - 0.02, 0, 1));
      heatDecayRef.current = window.setTimeout(tick, 80);
    };
    heatDecayRef.current = window.setTimeout(tick, 80);

    return () => {
      if (heatDecayRef.current) window.clearTimeout(heatDecayRef.current);
      heatDecayRef.current = null;
    };
  }, [forgeMode]);

  // ---------------------------------------------
  // FORGE actions
  // ---------------------------------------------
  async function startForge() {
    if (!selectedRecipe) return;
    setError(null);

    setForgeMode("forging");
    setForgeId(null);
    setHits(0);
    setProgress01(0);
    setHeat01(0);
    lastTapRef.current = 0;

    try {
      if (!tgId) throw new Error("tg_id missing");

      const resp = await postJSON<ForgeStartResponse>(`/api/blacksmith/forge/start?tg_id=${tgId}`, {
        recipe_code: selectedRecipe.code,
      });

      setForgeId(resp.forge_id);
      setRequiredHits(resp.required_hits);
      baseProgressPerHitRef.current = resp.base_progress_per_hit;
      heatSensitivityRef.current = resp.heat_sensitivity;
      rhythmWindowRef.current = resp.rhythm_window_ms;
    } catch {
      const rh = selectedRecipe.forge_hits ?? 30 + selectedRecipe.level_req * 18;
      setRequiredHits(rh);
      baseProgressPerHitRef.current = selectedRecipe.base_progress_per_hit ?? 1 / rh;
      heatSensitivityRef.current = selectedRecipe.heat_sensitivity ?? 0.65;
      rhythmWindowRef.current = selectedRecipe.rhythm_window_ms ?? [120, 220];
    }
  }

  function hitForge() {
    if (forgeMode !== "forging") return;
    if (!selectedRecipe) return;
    if (progress01 >= 1) return;

    const now = Date.now();
    const prev = lastTapRef.current;
    lastTapRef.current = now;

    const dt = prev ? now - prev : 999;

    const heatAdd = clamp((220 - dt) / 220, 0, 1) * 0.09;
    setHeat01((h) => clamp(h + heatAdd, 0, 1));

    const heat = heat01;
    const heatPenalty = clamp((heat - 0.65) / 0.35, 0, 1) * (0.35 + heatSensitivityRef.current * 0.35);
    const eff = 1 - heatPenalty;

    const [minW, maxW] = rhythmWindowRef.current;
    const rhythmBonus = dt >= minW && dt <= maxW ? 0.18 : 0;

    const base = baseProgressPerHitRef.current;
    const add = base * clamp(eff + rhythmBonus, 0.25, 1.25);

    setHits((h) => h + 1);
    setProgress01((p) => {
      const np = clamp(p + add, 0, 1);
      if (np >= 1) {
        if (soundOn) safeAudioPlay(finishRef.current);
        setForgeMode("done");
      }
      return np;
    });

    setHitPulse((x) => x + 1);
    if (soundOn) {
      const a = Math.random() < 0.5 ? hammerARef.current : hammerBRef.current;
      safeAudioPlay(a);
      if (progress01 > 0.25 && Math.random() < 0.08) safeAudioPlay(sizzleRef.current);
    }
  }

  async function claimForge() {
    if (!selectedRecipe) return;
    setError(null);
    if (!tgId) {
      setError("tg_id відсутній.");
      return;
    }

    try {
      await postJSON(`/api/blacksmith/forge/claim?tg_id=${tgId}`, {
        forge_id: forgeId,
        recipe_code: selectedRecipe.code,
        client_report: { hits },
      });

      await loadAll();
      setForgeMode("ready");
      setForgeId(null);
      setHits(0);
      setProgress01(0);
      setHeat01(0);
    } catch {
      setError("Не вдалося забрати виріб.");
    }
  }

  async function cancelForge() {
    if (!selectedRecipe || !tgId || !forgeId) {
      setForgeMode("ready");
      setForgeId(null);
      setHits(0);
      setProgress01(0);
      setHeat01(0);
      return;
    }

    setError(null);
    try {
      const resp = await postJSON<ForgeCancelResponse>(`/api/blacksmith/forge/cancel?tg_id=${tgId}`, {
        forge_id: forgeId,
        recipe_code: selectedRecipe.code,
        client_report: { hits },
      });
      if (!resp?.ok) throw new Error("cancel failed");
      await loadAll();
    } catch {
      setError("Не вдалося скасувати кування.");
    } finally {
      setForgeMode("ready");
      setForgeId(null);
      setHits(0);
      setProgress01(0);
      setHeat01(0);
    }
  }

  // ---------------------------------------------
  // SMELT actions
  // ---------------------------------------------
  async function doSmelt(recipe_code: string) {
    if (!tgId) {
      setError("tg_id відсутній.");
      return;
    }
    setError(null);
    setSmeltBusyCode(recipe_code);
    try {
      const resp = await postJSON<SmeltStartResponse>(`/api/blacksmith/smelt/start?tg_id=${tgId}`, { recipe_code });
      if (!resp?.ok) throw new Error("smelt failed");
      await loadAll();
    } catch {
      setError("Не вдалося переплавити (можливо бек ще не підключено).");
    } finally {
      setSmeltBusyCode(null);
    }
  }

  const stage = useMemo(() => {
    if (progress01 < 0.33) return 0;
    if (progress01 < 0.72) return 1;
    return 2;
  }, [progress01]);

  const rhythmHint = useMemo(() => {
    const [a, b] = rhythmWindowRef.current;
    return `${a}–${b}мс`;
  }, []);

  const headerStatus = useMemo(() => {
    if (error) return "warn" as const;
    if (usingDemo) return "warn" as const;
    return "good" as const;
  }, [error, usingDemo]);

  const canHit = forgeMode === "forging";
  const heatGlow = clamp(heat01, 0, 1);
  const progressGlow = clamp(progress01, 0, 1);

  return (
    <div className="min-h-[100dvh] text-zinc-100 px-4 py-6 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(245,158,11,0.18),transparent_60%),radial-gradient(900px_500px_at_100%_10%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(900px_700px_at_30%_120%,rgba(244,63,94,0.10),transparent_60%),linear-gradient(to_bottom,rgba(9,9,11,1),rgba(3,7,18,1))]">
      {/* CSS "noise" without assets */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 2px)",
        }}
      />

      {/* ✅ wider container */}
      <div className="mx-auto max-w-2xl space-y-4">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-950/35 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_90px_-50px_rgba(0,0,0,0.9)]">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-500/12 blur-3xl" />
          <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 blur-xl bg-amber-400/10 rounded-full" />
                  <Anvil className="relative h-5 w-5 text-zinc-200" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight">Ковальня</h1>
              </div>
              <p className="text-sm text-zinc-400 mt-1">Переплавляй руду в злитки — і куй спорядження. Ритм дає бонус, перегрів карає.</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill
                  tone={headerStatus === "good" ? "good" : "warn"}
                  icon={
                    headerStatus === "good" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {headerStatus === "good" ? "Підключено" : usingDemo ? "Демо-режим" : "Є попередження"}
                </Pill>

                <Pill tone="neutral" icon={<Sparkles className="h-3.5 w-3.5" />}>
                  Ритм: {rhythmHint}
                </Pill>

                {tgId ? <Pill tone="neutral">tg_id: {tgId}</Pill> : <Pill tone="bad">tg_id не знайдено</Pill>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                className="rounded-2xl border border-zinc-800 bg-zinc-950/35 px-3 py-2 text-sm hover:bg-zinc-900/55 transition"
                onClick={() => setSoundOn((s) => !s)}
                aria-label="toggle sound"
              >
                {soundOn ? (
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <span className="text-zinc-300">Звук</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <VolumeX className="h-4 w-4" />
                    <span className="text-zinc-500">Звук</span>
                  </div>
                )}
              </button>

              <button
                className="rounded-2xl border border-zinc-800 bg-zinc-950/35 px-3 py-2 text-sm hover:bg-zinc-900/55 transition"
                onClick={loadAll}
                aria-label="reload"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className={`${loading || smeltLoading ? "animate-spin" : ""} h-4 w-4`} />
                  <span className="text-zinc-300">Оновити</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/35 p-1 grid grid-cols-2 gap-1">
          <SegmentedTab active={tab === "smelt"} onClick={() => setTab("smelt")} tone="amber">
            Переплавка
          </SegmentedTab>
          <SegmentedTab active={tab === "forge"} onClick={() => setTab("forge")} tone="emerald">
            Кування
          </SegmentedTab>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl border border-amber-900/50 bg-amber-950/25 p-3 text-sm text-amber-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* SMELT TAB */}
        {tab === "smelt" ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/35">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-200 font-semibold">Переплавка</div>
                  <div className="text-xs text-zinc-500 mt-1">Ру́да → злитки. Паливо робиться з вугільної жили.</div>
                </div>
                <Pill tone="amber">Крок 1</Pill>
              </div>
            </div>

            <div className="p-3 space-y-2">
              {smeltLoading ? (
                <div className="grid gap-2">
                  <Skeleton className="h-[110px]" />
                  <Skeleton className="h-[110px]" />
                  <Skeleton className="h-[110px]" />
                </div>
              ) : null}

              {!smeltLoading &&
                (smeltStatuses || []).map((s) => {
                  const ok = s.can_smelt;
                  const outName = itemLabel(s.recipe.output_item_code, itemNames);

                  return (
                    <div key={s.recipe.code} className="relative rounded-3xl border border-zinc-800 bg-zinc-950/25 p-3 overflow-hidden">
                      <div className="absolute -top-16 -left-20 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
                      <div className="absolute -bottom-20 -right-16 h-52 w-52 rounded-full bg-rose-500/8 blur-3xl" />

                      <div className="relative flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-zinc-200 font-semibold truncate">{s.recipe.name}</div>
                            <Pill tone={ok ? "good" : "bad"}>{ok ? "Можна" : "Немає"}</Pill>
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            Вихід: <span className="text-zinc-300">{outName}</span> ×{s.recipe.output_amount}
                          </div>
                        </div>
                        <ItemIcon code={s.recipe.output_item_code} size={48} ringTone={ok ? "amber" : "neutral"} label={outName} />
                      </div>

                      <div className="relative mt-3 space-y-2">
                        <div className="text-xs text-zinc-500">Інгредієнти</div>

                        {(s.missing?.length
                          ? s.missing
                          : s.recipe.ingredients.map((i) => ({
                              material_code: i.material_code,
                              need: i.qty,
                              have: i.qty,
                              missing: 0,
                              role: i.role,
                            }))
                        ).map((m) => {
                          const name = itemLabel(m.material_code, itemNames);
                          return (
                            <div
                              key={m.material_code}
                              className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/30 px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ItemIcon code={m.material_code} size={40} label={name} />
                                <div className="min-w-0">
                                  <div className="text-sm text-zinc-200 truncate">{name}</div>
                                  <div className="text-xs text-zinc-500">
                                    {m.role ? `${m.role} • ` : ""}
                                    {m.have}/{m.need}
                                  </div>
                                </div>
                              </div>

                              {m.missing > 0 ? (
                                <div className="text-xs px-2 py-1 rounded-full border border-rose-900/60 bg-rose-950/30 text-rose-200">
                                  -{m.missing}
                                </div>
                              ) : (
                                <div className="text-xs text-zinc-400">×{m.need}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="relative mt-3">
                        <button
                          onClick={() => doSmelt(s.recipe.code)}
                          disabled={!ok || !!smeltBusyCode}
                          className={cx(
                            "w-full rounded-2xl px-4 py-3 font-semibold transition border",
                            ok
                              ? "border-amber-800/50 bg-amber-950/25 hover:bg-amber-950/40 text-amber-200"
                              : "border-zinc-800 bg-zinc-900/35 text-zinc-500 cursor-not-allowed"
                          )}
                        >
                          {smeltBusyCode === s.recipe.code ? "Плавимо..." : "Переплавити"}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {!smeltLoading && !smeltStatuses?.length ? <div className="text-sm text-zinc-500 p-3">Немає рецептів плавки.</div> : null}
            </div>
          </div>
        ) : null}

        {/* FORGE TAB */}
        {tab === "forge" ? (
          <>
            {/* Controls */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 overflow-hidden">
              <div className="p-4 border-b border-zinc-800 bg-zinc-950/35">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-zinc-200 font-semibold">Кування</div>
                    <div className="text-xs text-zinc-500 mt-1">Злитки → екіп. Влучай у ритм, не перегрівай метал.</div>
                  </div>
                  <Pill tone="emerald">Крок 2</Pill>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {/* ✅ make "recipe" wider than "slot" */}
                <div className="grid grid-cols-[0.9fr_1.4fr] gap-3">
                  {/* Slot dropdown */}
                  <div className="relative">
                    <button
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/35 px-3 py-3 text-left hover:bg-zinc-900/55 transition"
                      onClick={() => {
                        setOpenSlot((v) => !v);
                        setOpenRecipe(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-300">{SLOT_META[slot].icon}</span>
                          <span className="text-sm text-zinc-200 font-medium">{SLOT_META[slot].label}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      </div>
                    </button>

                    <AnimatePresence>
                      {openSlot && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute z-20 mt-2 w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-2 shadow-[0_24px_60px_-35px_rgba(0,0,0,0.9)]"
                        >
                          {(Object.keys(SLOT_META) as Array<Recipe["slot"]>).map((k) => (
                            <button
                              key={k}
                              onClick={() => {
                                setSlot(k);
                                setOpenSlot(false);
                              }}
                              className={cx(
                                "w-full rounded-2xl px-3 py-3 text-left hover:bg-zinc-900/60 transition",
                                k === slot && "bg-zinc-900/55"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-300">{SLOT_META[k].icon}</span>
                                <span className="text-sm text-zinc-200 font-medium">{SLOT_META[k].label}</span>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Recipe dropdown */}
                  <div className="relative">
                    <button
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/35 px-3 py-3 text-left hover:bg-zinc-900/55 transition disabled:opacity-50"
                      disabled={!slotStatuses.length || forgeMode === "forging"}
                      onClick={() => {
                        setOpenRecipe((v) => !v);
                        setOpenSlot(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs text-zinc-500">Предмет</div>

                          {/* ✅ show output item name, allow wrap */}
                          <div className="text-sm text-zinc-200 font-medium whitespace-normal leading-snug break-words">
                            {selectedRecipe ? recipeDisplayName(selectedRecipe, itemNames) : "—"}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                      </div>
                    </button>

                    <AnimatePresence>
                      {openRecipe && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute z-20 mt-2 w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-2 shadow-[0_24px_60px_-35px_rgba(0,0,0,0.9)] max-h-[380px] overflow-auto"
                        >
                          {slotStatuses.map((s) => {
                            const outName = recipeDisplayName(s.recipe, itemNames);
                            return (
                              <button
                                key={s.recipe.code}
                                onClick={() => {
                                  setRecipeCode(s.recipe.code);
                                  setOpenRecipe(false);
                                  setForgeMode("ready");
                                }}
                                className={cx(
                                  "w-full rounded-2xl px-3 py-3 text-left hover:bg-zinc-900/60 transition",
                                  s.recipe.code === recipeCode && "bg-zinc-900/55"
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  {/* ✅ ONLY item name + optional icon, allow wrap */}
                                  <div className="min-w-0 flex items-start gap-2">
                                    <ItemIcon
                                      code={s.recipe.output_item_code}
                                      size={44}
                                      label={outName}
                                      ringTone={s.can_forge ? "emerald" : "neutral"}
                                    />

                                    <div className="min-w-0">
                                      <div className="text-sm text-zinc-200 font-semibold whitespace-normal leading-snug break-words">
                                        {outName}
                                      </div>
                                      <div className="text-xs text-zinc-500 mt-1">Рівень: {s.recipe.level_req}</div>
                                    </div>
                                  </div>

                                  <Pill tone={s.can_forge ? "good" : "bad"}>{s.can_forge ? "Готово" : "Немає"}</Pill>
                                </div>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Recipe details */}
                <div className="relative rounded-3xl border border-zinc-800 bg-zinc-950/25 p-3 overflow-hidden">
                  <div className="absolute -top-16 -left-20 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />
                  <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-16" />
                    </div>
                  ) : selectedRecipe ? (
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {/* ✅ show output item name here too */}
                          <div className="text-sm text-zinc-200 font-semibold whitespace-normal leading-snug break-words">
                            {recipeDisplayName(selectedRecipe, itemNames)}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            Вимога рівня: {selectedRecipe.level_req}
                            {" • "}
                            Удари: {selectedRecipe.forge_hits ?? 30 + selectedRecipe.level_req * 18}
                            {" • "}
                            Ритм: {rhythmWindowRef.current[0]}–{rhythmWindowRef.current[1]}мс
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Pill
                            tone={canForgeNow ? "good" : "bad"}
                            icon={canForgeNow ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                          >
                            {canForgeNow ? "Готово" : "Немає матеріалів"}
                          </Pill>
                          <ItemIcon
                            code={selectedRecipe.output_item_code}
                            size={48}
                            ringTone={canForgeNow ? "emerald" : "neutral"}
                            label={itemLabel(selectedRecipe.output_item_code, itemNames)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-zinc-500">Матеріали</div>

                        <div className="space-y-2">
                          {selectedStatus?.missing?.length
                            ? selectedStatus.missing.map((m) => {
                                const name = itemLabel(m.material_code, itemNames);
                                return (
                                  <div
                                    key={m.material_code}
                                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/30 px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <ItemIcon code={m.material_code} size={40} ringTone="rose" label={name} />
                                      <div className="min-w-0">
                                        <div className="text-sm text-zinc-200 truncate">{name}</div>
                                        <div className="text-xs text-zinc-500">
                                          {m.have}/{m.need}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-xs px-2 py-1 rounded-full border border-rose-900/60 bg-rose-950/30 text-rose-200">
                                      -{m.missing}
                                    </div>
                                  </div>
                                );
                              })
                            : selectedRecipe.ingredients.map((i) => {
                                const name = itemLabel(i.material_code, itemNames);
                                return (
                                  <div
                                    key={i.material_code}
                                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/30 px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <ItemIcon code={i.material_code} size={40} ringTone="neutral" label={name} />
                                      <div className="min-w-0">
                                        <div className="text-sm text-zinc-200 truncate">{name}</div>
                                        <div className="text-xs text-zinc-500">{i.role ? `${i.role} • ` : ""}×{i.qty}</div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-zinc-400">×{i.qty}</div>
                                  </div>
                                );
                              })}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {forgeMode !== "forging" && forgeMode !== "done" ? (
                          <button
                            onClick={startForge}
                            disabled={!canForgeNow}
                            className={cx(
                              "flex-1 rounded-2xl px-4 py-3 font-semibold transition border",
                              canForgeNow
                                ? "border-emerald-800/50 bg-emerald-950/25 hover:bg-emerald-950/40 text-emerald-200"
                                : "border-zinc-800 bg-zinc-900/35 text-zinc-500 cursor-not-allowed"
                            )}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Hammer className="h-4 w-4" />
                              <span>Почати кування</span>
                            </div>
                          </button>
                        ) : null}

                        {forgeMode === "done" ? (
                          <button
                            onClick={claimForge}
                            className="flex-1 rounded-2xl px-4 py-3 font-semibold transition border border-amber-800/50 bg-amber-950/25 hover:bg-amber-950/40 text-amber-200"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <PackageOpen className="h-4 w-4" />
                              <span>Забрати виріб</span>
                            </div>
                          </button>
                        ) : null}

                        {forgeMode === "forging" ? (
                          <button
                            onClick={cancelForge}
                            className="rounded-2xl px-4 py-3 font-semibold transition border border-zinc-800 bg-zinc-950/35 hover:bg-zinc-900/55 text-zinc-200"
                          >
                            Скасувати
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500">Немає рецептів для цього слоту.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Forge Panel */}
            <div className="relative rounded-3xl border border-zinc-800 bg-zinc-950/30 overflow-hidden">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(700px 380px at 50% 35%, rgba(245,158,11,${0.10 + 0.22 * progressGlow}), transparent 60%),
                                    radial-gradient(600px 320px at 55% 55%, rgba(244,63,94,${0.06 + 0.22 * heatGlow}), transparent 62%)`,
                }}
              />

              <div className="relative p-4 border-b border-zinc-800 bg-zinc-950/35">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-500">Ковадло</div>
                    <div className="text-sm text-zinc-200 font-semibold truncate">
                      {forgeMode === "forging"
                        ? "Куй ударами по заготівці"
                        : forgeMode === "done"
                        ? "Виріб готовий"
                        : "Готовий до роботи"}
                    </div>
                  </div>

                  <div className="text-xs text-zinc-400">
                    {forgeMode === "forging" || forgeMode === "done" ? (
                      <>
                        Удари: <span className="text-zinc-200 font-semibold">{hits}</span>/{requiredHits}
                      </>
                    ) : (
                      <>—</>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Прогрес</span>
                      <span className="text-zinc-300 font-medium">{fmtPct(progress01)}</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-zinc-950/60 border border-zinc-800 overflow-hidden">
                      <div className="h-full bg-zinc-200/70" style={{ width: `${clamp(progress01, 0, 1) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-2">
                        <Flame className="h-3.5 w-3.5" />
                        Перегрів
                      </span>
                      <span className="text-zinc-300 font-medium">{fmtPct(heat01)}</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-zinc-950/60 border border-zinc-800 overflow-hidden">
                      <div className="h-full bg-rose-200/70" style={{ width: `${clamp(heat01, 0, 1) * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Pill tone="neutral">Ритм: {rhythmWindowRef.current[0]}–{rhythmWindowRef.current[1]}мс</Pill>
                    <Pill tone={heat01 > 0.72 ? "bad" : heat01 > 0.55 ? "warn" : "neutral"}>
                      {heat01 > 0.72 ? "Перегрів: зроби паузу" : heat01 > 0.55 ? "Гаряче" : "Норма"}
                    </Pill>
                    <Pill tone={progress01 >= 1 ? "good" : "neutral"}>{progress01 >= 1 ? "Готово до видачі" : "Працюємо…"}</Pill>
                  </div>
                </div>
              </div>

              <div className="relative p-4">
                <div className="flex justify-center">
                  <motion.button
                    onClick={hitForge}
                    disabled={!canHit}
                    className={cx(
                      "relative w-[268px] h-[268px] rounded-[36px] border transition overflow-hidden select-none",
                      canHit ? "border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/55" : "border-zinc-800 bg-zinc-950/25 opacity-70 cursor-not-allowed"
                    )}
                    whileTap={canHit ? { scale: 0.985 } : {}}
                    aria-label="forge hit"
                  >
                    <div className="absolute inset-0 opacity-70">
                      <div
                        className="absolute -top-14 -left-14 w-56 h-56 rounded-full blur-3xl"
                        style={{ background: `rgba(245,158,11,${0.08 + 0.22 * progressGlow})` }}
                      />
                      <div
                        className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full blur-3xl"
                        style={{ background: `rgba(244,63,94,${0.06 + 0.22 * heatGlow})` }}
                      />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_40%)]" />
                    </div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <AnimatePresence mode="wait">
                        {forgeMode !== "done" ? (
                          <motion.div
                            key={`ingot-${stage}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex flex-col items-center gap-2"
                          >
                            <motion.div
                              animate={{
                                rotate: (hitPulse % 2 === 0 ? -1 : 1) * (canHit ? 0.7 : 0),
                                y: canHit ? [0, -2, 0] : 0,
                              }}
                              transition={{ duration: 0.1 }}
                            >
                              {(() => {
                                const metalCode =
                                  selectedRecipe?.ingredients.find((i) => i.role === "metal")?.material_code || "smith_ingot_zalizna";
                                const metalName = itemLabel(metalCode, itemNames);
                                return (
                                  <ItemIcon
                                    code={metalCode}
                                    size={102}
                                    label={metalName}
                                    ringTone={stage === 0 ? "neutral" : stage === 1 ? "rose" : "amber"}
                                    className={cx(stage === 2 && "shadow-[0_0_70px_-30px_rgba(245,158,11,0.55)]")}
                                  />
                                );
                              })()}
                            </motion.div>

                            <div className="text-sm text-zinc-200 font-semibold">
                              {stage === 0 ? "Формуємо заготовку" : stage === 1 ? "Тримаємо жар" : "Вибиваємо форму"}
                            </div>
                            <div className="text-xs text-zinc-500">{canHit ? "Тапай по металу — тримай ритм." : "Обери рецепт і почни кування."}</div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-3"
                          >
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.22 }}
                              className="relative"
                            >
                              <div className="absolute inset-0 rounded-2xl blur-xl bg-amber-200/10" />
                              <ItemIcon
                                code={selectedRecipe?.output_item_code || "item"}
                                size={116}
                                label={selectedRecipe ? itemLabel(selectedRecipe.output_item_code, itemNames) : "Виріб"}
                                ringTone="amber"
                                className="relative shadow-[0_0_90px_-40px_rgba(245,158,11,0.65)]"
                              />
                            </motion.div>
                            <div className="text-sm text-amber-200 font-semibold">Виріб готовий</div>
                            <div className="text-xs text-zinc-500">Натисни “Забрати виріб”.</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                      <div className="rounded-full border border-zinc-800 bg-zinc-950/45 px-3 py-1 text-xs text-zinc-400">
                        {canHit ? "Удар молотка" : forgeMode === "done" ? "Готово" : "Кування недоступне"}
                      </div>
                    </div>
                  </motion.button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-3 text-zinc-400">
                    <div className="text-zinc-200 font-semibold mb-1">Ритм</div>
                    <div>Тримай інтервал {rhythmWindowRef.current[0]}–{rhythmWindowRef.current[1]}мс — прогрес швидший.</div>
                  </div>
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-950/30 p-3 text-zinc-400">
                    <div className="text-zinc-200 font-semibold mb-1">Перегрів</div>
                    <div>Спам → штраф. Зроби паузу — жар спадає.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-6" />
          </>
        ) : null}
      </div>
    </div>
  );
}