"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { BareFetcher } from "swr";
import { motion, AnimatePresence } from "framer-motion";

import { endpoints, getJSON, postJSON } from "@/lib/api";
import { resolveAreaBg } from "./areaBackgrounds";

// ───────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────
type Area = {
  key?: string;
  id?: number;
  name?: string;
  min_level?: number | null;
};

type AreasResponse = { areas?: Area[] } | Area[];

type ProfessionApi = {
  id: number;
  code: string;
  name: string;
  descr: string;
  kind: "gathering" | "craft";
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

type MeResponse = {
  ok: boolean;
  player_level: number;
  professions: PlayerProfessionDTO[];
  limits: Limits;
};

type GatheringState = {
  ok: boolean;
  active: boolean;
  area_key?: string | null;
  profession_code?: string | null;
  eta_seconds?: number | null;
};

const fetchAreas: BareFetcher<AreasResponse> = (url: string) => getJSON(url);
const fetchProfessions: BareFetcher<MeResponse> = (url: string) => getJSON(url);
const fetchGatherState: BareFetcher<GatheringState> = (url: string) => getJSON(url);

// mobs list (для енкаунтерів)
type MobItem = {
  id: number;
  name: string;
  level: number;
  base_hp: number;
  base_attack: number;
  area_key: string;
};

type MobListResponse = {
  area_key: string;
  area_name: string;
  items: MobItem[];
};

// quick gathering (ресурс під час мандрів)
type QuickGatherReq = {
  area_key: string;
  source_type: "herb" | "ore" | "ks";
  risk?: "low" | "medium" | "high";
};

type QuickGatherResp = {
  ok: boolean;
  drops: { code: string; name: string; qty: number; rarity?: string | null }[];
};

// ───────────────────────────────────────────────────
// Мін. рівні локацій
// ───────────────────────────────────────────────────
const DEFAULT_LEVELS: Record<string, number> = {
  slums: 1,
  suburbs: 11,
  swamp: 21,
  ruins: 31,
  quarry: 41,
  ridge: 51,
  crown: 61,
};

function getAreaMinLevel(areaKey: string, apiMin?: number | null): number {
  const key = String(areaKey || "").toLowerCase();
  if (DEFAULT_LEVELS[key] != null) return DEFAULT_LEVELS[key];
  return typeof apiMin === "number" && apiMin > 0 ? apiMin : 1;
}

// ───────────────────────────────────────────────────
// Travel state (persisted) — БЕЗ log, без модалок
// ───────────────────────────────────────────────────
type TravelState = {
  version: 2;
  area_key: string;
  stage_index: number;
  steps_in_stage: number;
  steps_to_unlock_next: number;

  last_resource_step_abs?: number;
  step_abs?: number;

  next_unlocked?: boolean;
  next_prompted?: boolean;
};

type TravelLogKind = "system" | "walk" | "combat" | "loot";

type TravelLogItem = {
  id: string;
  kind: TravelLogKind;
  text: string;
  ts: number;
};

// ✅ новий ключ, щоб старе сміття не ламало
const LS_KEY = "travel_state:v2_topbtn_only";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

function saveTravel(st: TravelState | null) {
  try {
    if (!st) {
      localStorage.removeItem(LS_KEY);
      return;
    }

    const payload: TravelState = {
      version: 2,
      area_key: st.area_key,
      stage_index: st.stage_index,
      steps_in_stage: st.steps_in_stage,
      steps_to_unlock_next: st.steps_to_unlock_next,
      last_resource_step_abs: st.last_resource_step_abs,
      step_abs: st.step_abs,
      next_unlocked: Boolean(st.next_unlocked),
      next_prompted: Boolean(st.next_prompted),
    };

    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {}
}

function loadTravel(): TravelState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;

    const st = JSON.parse(raw) as Partial<TravelState> | null;
    if (!st || st.version !== 2) return null;

    if (typeof st.area_key !== "string") return null;
    if (typeof st.stage_index !== "number") return null;
    if (typeof st.steps_in_stage !== "number") return null;
    if (typeof st.steps_to_unlock_next !== "number") return null;

    return {
      version: 2,
      area_key: st.area_key,
      stage_index: st.stage_index,
      steps_in_stage: st.steps_in_stage,
      steps_to_unlock_next: st.steps_to_unlock_next,
      last_resource_step_abs:
        typeof st.last_resource_step_abs === "number"
          ? st.last_resource_step_abs
          : undefined,
      step_abs: typeof st.step_abs === "number" ? st.step_abs : 0,
      next_unlocked: Boolean(st.next_unlocked),
      next_prompted: Boolean(st.next_prompted),
    };
  } catch {
    return null;
  }
}

function stepsRoll(key: string) {
  if (key === "slums") return rand(3, 5);
  if (key === "suburbs") return rand(4, 6);
  if (key === "swamp") return rand(5, 7);
  if (key === "ruins") return rand(5, 8);
  if (key === "quarry") return rand(6, 9);
  if (key === "ridge") return rand(6, 9);
  if (key === "crown") return rand(7, 10);
  return rand(4, 7);
}

// шанс бою
function encounterChance(areaKey: string): number {
  const k = (areaKey || "").toLowerCase();
  if (k === "slums") return 0.28;
  if (k === "suburbs") return 0.3;
  if (k === "swamp") return 0.34;
  if (k === "ruins") return 0.36;
  if (k === "quarry") return 0.38;
  if (k === "ridge") return 0.4;
  if (k === "crown") return 0.42;
  return 0.33;
}

// шанс ресурсу (нижчий за бій)
function resourceChance(areaKey: string): number {
  const k = (areaKey || "").toLowerCase();
  if (k === "slums") return 0.1;
  if (k === "suburbs") return 0.14;
  if (k === "swamp") return 0.18;
  if (k === "ruins") return 0.2;
  if (k === "quarry") return 0.22;
  if (k === "ridge") return 0.22;
  if (k === "crown") return 0.24;
  return 0.16;
}

function pickMobForLevel(mobs: MobItem[], heroLevel: number): MobItem | null {
  if (!mobs?.length) return null;

  const maxAllowed = heroLevel + 2;
  const suitable = mobs.filter((m) => (m.level ?? 1) <= maxAllowed);
  const pool = suitable.length ? suitable : mobs;

  const weighted: MobItem[] = [];
  for (const m of pool) {
    const lvl = Number(m.level || 1);
    const dist = Math.max(0, Math.abs(lvl - heroLevel));
    const w = Math.max(1, 6 - dist);
    for (let i = 0; i < w; i++) weighted.push(m);
  }

  return weighted[rand(0, weighted.length - 1)] ?? pool[0] ?? null;
}

// ───────────────────────────────────────────────────
// Footsteps (MP3 files in /public/audio)
// ───────────────────────────────────────────────────
function useFootstepsFiles() {
  const audiosRef = useRef<HTMLAudioElement[] | null>(null);
  const timerRef = useRef<number | null>(null);
  const idxRef = useRef(0);
  const unlockedRef = useRef(false);

  const ensure = () => {
    if (audiosRef.current) return audiosRef.current;

    const list = [new Audio("/audio/step1.mp3"), new Audio("/audio/step2.mp3")];

    for (const a of list) {
      a.preload = "auto";
      a.volume = 0.55;
    }

    audiosRef.current = list;
    return list;
  };

  const unlock = async () => {
    if (unlockedRef.current) return;
    const list = ensure();

    try {
      const a = list[0];
      a.currentTime = 0;
      await a.play();
      a.pause();
      a.currentTime = 0;
      unlockedRef.current = true;
    } catch {}
  };

  const playOnce = () => {
    const list = ensure();
    if (!list.length) return;

    idxRef.current = (idxRef.current + 1) % list.length;
    const a = list[idxRef.current];

    try {
      a.pause();
      a.currentTime = 0;
      void a.play();
    } catch {}
  };

  const start = async () => {
    await unlock();
    if (timerRef.current != null) return;

    playOnce();

    const tick = () => {
      playOnce();
      const base = 420;
      const jitter = Math.floor(Math.random() * 110);
      timerRef.current = window.setTimeout(tick, base + jitter) as unknown as number;
    };

    timerRef.current = window.setTimeout(tick, 420) as unknown as number;
  };

  const stop = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const list = audiosRef.current || [];
    for (const a of list) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    }
  };

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { start, stop, unlock };
}

// ───────────────────────────────────────────────────
// profession -> source_type для quick gather
// ───────────────────────────────────────────────────
function profToSourceType(code: string): "herb" | "ore" | "ks" | null {
  const p = (code || "").toLowerCase();
  if (p.includes("herbalist") || p.includes("herb")) return "herb";
  if (p.includes("miner") || p.includes("ore")) return "ore";
  if (p.includes("stonemason") || p.includes("stone") || p.includes("ks")) return "ks";
  return null;
}

function pushLog(
  setLog: React.Dispatch<React.SetStateAction<TravelLogItem[]>>,
  item: TravelLogItem
) {
  setLog((prev) => [item, ...prev].slice(0, 12));
}

// ───────────────────────────────────────────────────
// Page
// ───────────────────────────────────────────────────
export default function AreasPage() {
  const router = useRouter();

  const { data } = useSWR<AreasResponse>(endpoints.areas, fetchAreas);
  const { data: profData } = useSWR<MeResponse>("/api/professions/me", fetchProfessions);
  const { data: gatherState } = useSWR<GatheringState>("/api/gathering/state", fetchGatherState);

  useEffect(() => {
    if (gatherState?.ok && gatherState.active) router.replace("/gathering");
  }, [gatherState, router]);

  const areas = useMemo(() => {
    const arr = Array.isArray(data) ? data : data?.areas ?? [];
    return (arr || []).filter(Boolean);
  }, [data]);

  const playerLevel = profData?.player_level ?? 1;

  const route = useMemo(() => {
    return areas
      .map((a) => {
        const key = String(a.key || a.id || "").toLowerCase();
        return {
          key,
          name: a.name || a.key || key,
          minLevel: getAreaMinLevel(key, a.min_level),
        };
      })
      .filter((x) => x.key)
      .sort((a, b) => a.minLevel - b.minLevel);
  }, [areas]);

  // активна збиральна професія
  const gatherProfCode = useMemo(() => {
    const list = profData?.professions ?? [];
    const g = list.find((x) => x?.profession?.kind === "gathering");
    return g?.profession?.code ?? "";
  }, [profData]);

  const gatherSourceType = useMemo(() => profToSourceType(gatherProfCode), [gatherProfCode]);

  const [travel, setTravel] = useState<TravelState | null>(null);
  const [log, setLog] = useState<TravelLogItem[]>([]);

  const [isWalking, setIsWalking] = useState(false);
  const [walkMs, setWalkMs] = useState(1800);

  const footsteps = useFootstepsFiles();

  const encounterLockRef = useRef(false);
  const walkLockRef = useRef(false);

  // ✅ якщо відео не підхопилось — падаємо в чорний фон
  const [useVideo, setUseVideo] = useState(true);

  useEffect(() => {
    if (!route.length) return;

    const saved = loadTravel();
    if (saved) {
      const ok = route.some((r) => r.key === saved.area_key);
      const idxOk = saved.stage_index >= 0 && saved.stage_index < route.length;

      if (ok && idxOk) {
        setTravel(saved);
        setLog([{ id: makeId(), kind: "system", text: "Ти знову на шляху.", ts: Date.now() }]);
        return;
      }

      saveTravel(null);
    }

    const first = route.find((r) => playerLevel >= r.minLevel) || route[0];
    const firstIndex = Math.max(0, route.findIndex((r) => r.key === first.key));

    const st: TravelState = {
      version: 2,
      area_key: first.key,
      stage_index: firstIndex,
      steps_in_stage: 0,
      steps_to_unlock_next: stepsRoll(first.key),
      step_abs: 0,
      last_resource_step_abs: -9999,
      next_unlocked: false,
      next_prompted: false,
    };

    setTravel(st);
    saveTravel(st);

    setLog([
      {
        id: makeId(),
        kind: "system",
        text: `Ти виходиш за місто. Попереду — ${first.name}.`,
        ts: Date.now(),
      },
    ]);
  }, [route, playerLevel]);

  useEffect(() => {
    if (isWalking) footsteps.start();
    else footsteps.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWalking]);

  // коли змінюється зона — пробуємо знову відео
  useEffect(() => {
    if (!travel) return;
    setUseVideo(true);
  }, [travel?.area_key]);

  if (!travel) return null;

  // ✅ страховка від битого stage_index
  const safeIndex = Math.max(0, Math.min(travel.stage_index, Math.max(0, route.length - 1)));
  const current = route[safeIndex];
  const next = route[safeIndex + 1];

  const bgKey = (travel.area_key || current?.key || "slums").toLowerCase();
  const bg = resolveAreaBg(bgKey);

  const nextAllowed = !!next && playerLevel >= (next?.minLevel ?? 9999);
  const nextUnlocked =
    !!next && (Boolean(travel.next_unlocked) || travel.steps_in_stage >= travel.steps_to_unlock_next);

  const showNextButton = !!next && nextUnlocked && nextAllowed;

  async function tryEncounter(areaKey: string): Promise<boolean> {
    if (encounterLockRef.current) return false;
    encounterLockRef.current = true;

    try {
      const chance = encounterChance(areaKey);
      if (Math.random() > chance) return false;

      const resp = await getJSON<MobListResponse>(`/api/areas/${areaKey}/mobs`);
      const mob = pickMobForLevel(resp.items || [], playerLevel);
      if (!mob) return false;

      pushLog(setLog, {
        id: makeId(),
        kind: "combat",
        text: `Засідка! На шляху з’являється: ${mob.name} (Lv ${mob.level}).`,
        ts: Date.now(),
      });

      router.push(`/battle/${mob.id}?from=travel`);
      return true;
    } finally {
      setTimeout(() => {
        encounterLockRef.current = false;
      }, 900);
    }
  }

  async function tryResourceFind(
    areaKey: string,
    st: TravelState
  ): Promise<QuickGatherResp["drops"] | null> {
    if (!gatherSourceType) return null;

    const stepAbs = st.step_abs ?? 0;
    const last = st.last_resource_step_abs ?? -9999;
    if (stepAbs - last < 2) return null;

    const chance = resourceChance(areaKey);
    if (Math.random() > chance) return null;

    const payload: QuickGatherReq = {
      area_key: areaKey,
      source_type: gatherSourceType,
      risk: "low",
    };

    try {
      const data = await postJSON<QuickGatherResp>("/api/gathering/quick", payload);
      if (!data?.ok || !data?.drops?.length) return null;
      return data.drops;
    } catch {
      return null;
    }
  }

  const step = async () => {
    if (walkLockRef.current) return;

    await footsteps.unlock();
    walkLockRef.current = true;

    const ms = rand(1600, 2200);
    setWalkMs(ms);
    setIsWalking(true);

    await sleep(ms);

    const stepAbsNext = (travel.step_abs ?? 0) + 1;

    pushLog(setLog, {
      id: makeId(),
      kind: "walk",
      text: "Ти просуваєшся далі шляхом.",
      ts: Date.now(),
    });

    const stepsNext = travel.steps_in_stage + 1;
    const reached = stepsNext >= travel.steps_to_unlock_next;

    let st: TravelState = {
      ...travel,
      step_abs: stepAbsNext,
      steps_in_stage: stepsNext,
      next_unlocked: Boolean(travel.next_unlocked) || reached,
    };

    if (reached && !travel.next_prompted) {
      const nextName = next?.name ? `: ${next.name}` : "";
      pushLog(setLog, {
        id: makeId(),
        kind: "system",
        text: `Перехід відкрито${nextName}. Доступно кнопкою ↗ зверху.`,
        ts: Date.now(),
      });
      st = { ...st, next_prompted: true };
    }

    setTravel(st);
    saveTravel(st);

    setIsWalking(false);

    // 1) бій
    const startedCombat = await tryEncounter(st.area_key);
    if (startedCombat) {
      walkLockRef.current = false;
      return;
    }

    // 2) ресурс
    const drops = await tryResourceFind(st.area_key, st);
    if (drops?.length) {
      const text = drops
        .slice(0, 3)
        .map((d) => `+${d.qty} ${d.name}`)
        .join(", ");

      pushLog(setLog, {
        id: makeId(),
        kind: "loot",
        text: `Ти помічаєш придатне місце й швидко збираєш: ${text}.`,
        ts: Date.now(),
      });

      const st2: TravelState = {
        ...st,
        last_resource_step_abs: st.step_abs ?? stepAbsNext,
      };

      setTravel(st2);
      saveTravel(st2);
    }

    walkLockRef.current = false;
  };

  const goNext = () => {
    if (!next) return;

    if (!nextAllowed) {
      pushLog(setLog, {
        id: makeId(),
        kind: "system",
        text: `Далі не пускає. Потрібен рівень ${next.minLevel}.`,
        ts: Date.now(),
      });
      return;
    }

    if (!nextUnlocked) {
      pushLog(setLog, {
        id: makeId(),
        kind: "system",
        text: "Ще не пройдено достатньо шляху, щоб перейти далі.",
        ts: Date.now(),
      });
      return;
    }

    pushLog(setLog, {
      id: makeId(),
      kind: "system",
      text: `Ти переходиш далі. Ти вже в: ${next.name}.`,
      ts: Date.now(),
    });

    const st: TravelState = {
      ...travel,
      area_key: next.key,
      stage_index: safeIndex + 1,
      steps_in_stage: 0,
      steps_to_unlock_next: stepsRoll(next.key),
      next_unlocked: false,
      next_prompted: false,
    };

    setTravel(st);
    saveTravel(st);
  };

  const reset = () => {
    saveTravel(null);
    router.push("/");
  };

  const walkDisabled = isWalking;

  return (
    <main className="min-h-screen relative overflow-hidden text-slate-50 flex justify-center px-4 py-6">
      {/* BACKGROUND (VIDEO) */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        {useVideo && bg.video ? (
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setUseVideo(false)}
            aria-hidden="true"
          >
            <source src={bg.video} type="video/mp4" />
          </video>
        ) : (
          <div className="h-full w-full bg-black" aria-hidden="true" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/65" />
      </div>

      {/* ✅ єдина кнопка переходу — зверху справа */}
      <div className="fixed top-4 right-4 z-[60]">
        <button
          type="button"
          onClick={goNext}
          disabled={!showNextButton}
          className={
            "h-9 px-3 rounded-full text-xs font-semibold border transition " +
            (showNextButton
              ? "bg-emerald-500/25 text-emerald-200 border-emerald-400/25 active:scale-[0.99]"
              : "bg-black/25 text-slate-400 border-white/10")
          }
          title={
            !next
              ? "Немає наступної зони"
              : !nextAllowed
              ? `Потрібен рівень ${next?.minLevel}`
              : !nextUnlocked
              ? "Спершу пройди потрібну кількість кроків"
              : "Перейти далі"
          }
        >
          ↗ Пройти далі
        </button>
      </div>

      <motion.div
        animate={isWalking ? { y: [0, -2, 0, -1, 0] } : { y: 0 }}
        transition={
          isWalking
            ? { duration: Math.max(0.8, walkMs / 1000), ease: "easeInOut" }
            : { duration: 0.2 }
        }
        className="w-full max-w-xl relative z-10"
      >
        {/* HEADER */}
        <div className="mb-3 px-1">
          <div className="text-xs opacity-80">Ти вже в:</div>
          <div className="text-xl font-semibold">{current?.name || "Місцевість"}</div>
          <div className="text-xs opacity-75 mt-1">
            Кроки: {travel.steps_in_stage}/{travel.steps_to_unlock_next}
          </div>

          {gatherSourceType && (
            <div className="text-[11px] opacity-70 mt-1">
              Професія збору:{" "}
              <span className="opacity-90">
                {gatherSourceType === "herb"
                  ? "травник"
                  : gatherSourceType === "ore"
                  ? "шахтар"
                  : "каменяр"}
              </span>
            </div>
          )}
        </div>

        {/* ACTION */}
        <div className="grid grid-cols-1 gap-2 mb-3">
          <button
            onClick={step}
            disabled={walkDisabled}
            className={
              "h-12 rounded-2xl font-semibold transition relative overflow-hidden " +
              (walkDisabled ? "bg-black/35 text-slate-400" : "bg-amber-500/90 text-black")
            }
          >
            <span className="relative z-10">{isWalking ? "🚶 Йдеш…" : "🚶 Йти далі"}</span>

            <AnimatePresence>
              {isWalking && (
                <motion.span
                  className="absolute left-0 top-0 bottom-0 bg-black/15"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: walkMs / 1000, ease: "linear" }}
                />
              )}
            </AnimatePresence>
          </button>

          {isWalking && (
            <div className="text-xs opacity-75 px-1">Ти проходиш кілька десятків кроків…</div>
          )}
        </div>

        {/* LOG */}
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {log.map((l) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm px-3 py-2 rounded-xl bg-black/22 border border-white/10"
              >
                {l.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-4">
          <button
            onClick={reset}
            className="w-full h-12 rounded-2xl border border-white/10 bg-black/22"
          >
            🏙 Повернутися в місто
          </button>
        </div>
      </motion.div>
    </main>
  );
}