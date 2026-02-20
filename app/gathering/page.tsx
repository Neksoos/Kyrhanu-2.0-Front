// app/gathering/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { resolveTgId } from "@/lib/tg";

export const dynamic = "force-dynamic";

type RiskMode = "careful" | "normal" | "risky";
type Phase = "risk" | "loading" | "step";

type StoryOptionKind = "continue" | "fight" | "escape" | "finish";

type StoryOption = {
  id: string;
  kind: StoryOptionKind;
  label: string;
};

type StoryStepDTO = {
  ok?: boolean;
  area_key: string;
  risk: RiskMode;
  step: number;
  text: string;
  options: StoryOption[];
  mob_name?: string | null;
  combat_result?: string | null;
  finished: boolean;
  drops?: { material_id: number; code: string; name: string; rarity?: string | null; qty: number }[] | null;
};

// бек приймає herb/ore/stone + аліаси herbalist/miner/stonemason
type SourceType = "herb" | "ore" | "stone" | "herbalist" | "miner" | "stonemason";

type StoryStartBody = {
  tg_id: number;
  area_key: string;
  risk: RiskMode;
  source_type: SourceType;
};

type StoryChoiceBody = {
  tg_id: number;
  choice_id: string;
};

const AREA_NAMES: Record<string, string> = {
  slums: "Нетриця",
  suburbs: "Передмістя",
  swamp: "Болота Чорнолісся",
  ruins: "Руїни Форпосту",
  quarry: "Занедбаний Карʼєр",
  ridge: "Вітряний Хребет",
  crown: "Крижана Корона",
};

const AREA_KEY_TO_DB: Record<string, string> = {
  slums: "netrytsia",
  suburbs: "peredmistia",
  peredmistya: "peredmistia",
};

function normalizeAreaKeyForDb(areaKey: string): string {
  const k = (areaKey || "").trim();
  return AREA_KEY_TO_DB[k] ?? k;
}

// мапа професій/коду -> source_type під бек
function profToSourceType(prof: string): SourceType {
  const p = (prof || "").toLowerCase();

  // важливо: у БД professions.code = herbalist/miner/stonemason
  if (p.includes("herbalist") || p.includes("herb") || p.includes("зіл") || p.includes("трав")) return "herbalist";
  if (p.includes("miner") || p.includes("ore") || p.includes("руд") || p.includes("шах") || p.includes("mine"))
    return "miner";
  if (p.includes("stonemason") || p.includes("камен") || p.includes("каменяр")) return "stonemason";

  // фолбек — краще не травник
  return "stonemason";
}

async function fetchMyProfessionCode(tgId: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/proxy/api/professions/me?tg_id=${tgId}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    // очікуємо щось типу { code: "stonemason", ... }
    const code = typeof data?.code === "string" ? data.code : null;
    return code;
  } catch {
    return null;
  }
}

function GatheringInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const areaKeyRaw = useMemo(() => searchParams.get("area_key") ?? searchParams.get("area") ?? "slums", [searchParams]);
  const areaKeyDb = useMemo(() => normalizeAreaKeyForDb(areaKeyRaw), [areaKeyRaw]);

  // prof може не прийти з урла (кнопка околиці веде одразу сюди) — тоді підтягнемо з бекенду
  const profFromUrl = useMemo(() => searchParams.get("prof") ?? "", [searchParams]);
  const [prof, setProf] = useState<string>(profFromUrl);

  const [phase, setPhase] = useState<Phase>("risk");
  const [riskMode, setRiskMode] = useState<RiskMode | null>(null);
  const [step, setStep] = useState<StoryStepDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profLoading, setProfLoading] = useState(false);

  const prettyAreaName = AREA_NAMES[areaKeyRaw] ?? areaKeyRaw;

  // якщо prof не передали — забираємо з /professions/me
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (profFromUrl) {
        setProf(profFromUrl);
        return;
      }

      setProfLoading(true);
      try {
        const tgId = await resolveTgId();
        const code = await fetchMyProfessionCode(tgId);
        if (cancelled) return;

        if (!code) {
          setError("Не вдалося визначити професію. Повернись у профіль і обери професію ще раз.");
          setProf("");
          return;
        }

        setProf(code);
      } finally {
        if (!cancelled) setProfLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [profFromUrl]);

  // старт сторі
  useEffect(() => {
    if (!riskMode) return;
    if (!prof) {
      setError("Не визначена професія. Повернись у профіль і обери професію ще раз.");
      setPhase("risk");
      setRiskMode(null);
      setStep(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setPhase("loading");
      setError(null);

      try {
        const tgId = await resolveTgId();

        const body: StoryStartBody = {
          tg_id: tgId,
          area_key: areaKeyDb,
          risk: riskMode,
          source_type: profToSourceType(prof),
        };

        const res = await fetch("/api/proxy/api/gathering/story/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = await res.json();
            msg = j?.detail || j?.error || j?.message || msg;
          } catch {}
          throw new Error(msg);
        }

        const data: StoryStepDTO = await res.json();
        if (cancelled) return;

        setStep(data);
        setPhase("step");
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Не вдалося завантажити пригоду. Спробуй пізніше.");
        setPhase("risk");
        setRiskMode(null);
        setStep(null);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [riskMode, areaKeyDb, prof]);

  const handleSelectRisk = (mode: RiskMode) => {
    if (phase !== "risk") return;
    setRiskMode(mode);
  };

  const handleChoice = async (opt: StoryOption) => {
    if (!step || step.finished) return;

    setPhase("loading");
    setError(null);

    try {
      const tgId = await resolveTgId();
      const body: StoryChoiceBody = { tg_id: tgId, choice_id: opt.id };

      const res = await fetch("/api/proxy/api/gathering/story/choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          msg = j?.detail || j?.error || j?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const data: StoryStepDTO = await res.json();
      setStep(data);
      setPhase("step");
    } catch (e: any) {
      setError(e?.message || "Щось пішло не так із вибором. Спробуй ще раз.");
      setPhase("step");
    }
  };

  const handleRestart = () => {
    setPhase("risk");
    setRiskMode(null);
    setStep(null);
    setError(null);
  };

  const handleBack = () => router.back();

  const hasCombatResult =
    !!step?.combat_result && (step.combat_result === "win" || step.combat_result === "lose");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl relative">
        <div className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,0.28),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(56,189,248,0.28),transparent_60%)]" />

        <div className="relative rounded-2xl bg-slate-950/90 border border-slate-700/70 px-4 py-4 shadow-[0_0_25px_rgba(15,23,42,1)] flex flex-col gap-4">
          <header>
            <div className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80 mb-1">Похід за ресурсами</div>
            <h1 className="text-lg font-semibold">
              {(profLoading ? "..." : prof || "невідома професія")}: {prettyAreaName}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Замість нудного таймера – маленька пригода. Обери ризик, а далі вирішуй, як діяти у ситуаціях дорогою.
            </p>
          </header>

          {error && (
            <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          {phase === "risk" && (
            <section className="space-y-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-1">Обери стиль походу</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handleSelectRisk("careful")}
                  className="group rounded-xl border border-emerald-400/40 bg-emerald-500/5 hover:bg-emerald-500/15 px-3 py-3 text-left transition"
                  disabled={profLoading}
                >
                  <div className="text-sm font-semibold text-emerald-200 flex items-center gap-1">🛡 Обережний</div>
                  <p className="mt-1 text-[11px] text-emerald-100/80">Мінімальний ризик, стабільна здобич.</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRisk("normal")}
                  className="group rounded-xl border border-sky-400/40 bg-sky-500/5 hover:bg-sky-500/15 px-3 py-3 text-left transition"
                  disabled={profLoading}
                >
                  <div className="text-sm font-semibold text-sky-200 flex items-center gap-1">⚖ Звичайний</div>
                  <p className="mt-1 text-[11px] text-sky-100/80">Баланс між небезпекою та трофеями.</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRisk("risky")}
                  className="group rounded-xl border border-rose-400/60 bg-rose-500/5 hover:bg-rose-500/20 px-3 py-3 text-left transition"
                  disabled={profLoading}
                >
                  <div className="text-sm font-semibold text-rose-200 flex items-center gap-1">☠ Ризиковий</div>
                  <p className="mt-1 text-[11px] text-rose-100/80">Вища ймовірність засідки й рідкісних ресурсів.</p>
                </button>
              </div>
            </section>
          )}

          {phase === "loading" && (
            <section className="flex flex-col items-center justify-center py-6 text-sm text-slate-300 gap-2">
              <motion.div
                className="w-8 h-8 rounded-full border-2 border-slate-600 border-t-emerald-400"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
              />
              <div>{step ? "Доля вирішує наслідки твого вибору…" : "Пошук пригоди в цих краях…"}</div>
            </section>
          )}

          {phase === "step" && step && (
            <motion.section
              key={`${step.area_key}-${step.step}-${step.combat_result ?? "none"}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-3 space-y-3"
            >
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Пригода {prettyAreaName}</div>
              <p className="text-sm text-slate-200 whitespace-pre-line">{step.text}</p>

              {step.mob_name && !step.finished && (
                <p className="text-[11px] text-slate-400">
                  Десь поблизу відчувається присутність:{" "}
                  <span className="text-slate-200 font-semibold">{step.mob_name}</span>.
                </p>
              )}

              {hasCombatResult && (
                <p className="text-[11px] text-emerald-300/80">
                  Підсумок сутички: {step.combat_result === "win" ? "перемога" : "важкий відступ"}.
                </p>
              )}

              {step.finished && step.drops && step.drops.length > 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-emerald-200/80 mb-1">Здобич</div>
                  <ul className="text-xs text-emerald-50/90 space-y-1">
                    {step.drops.map((d) => (
                      <li key={`${d.material_id}-${d.code}`}>
                        +{d.qty} {d.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!step.finished && step.options.length > 0 && (
                <div className="mt-2 grid gap-2">
                  {step.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleChoice(opt)}
                      className="w-full inline-flex items-start justify-between gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/5 hover:bg-emerald-500/15 text-left text-xs px-3 py-2 transition"
                    >
                      <span className="font-semibold text-emerald-100">{opt.label}</span>

                      {opt.kind === "fight" && (
                        <span className="text-[10px] text-rose-300/80 uppercase tracking-wide">Бій</span>
                      )}
                      {opt.kind === "escape" && (
                        <span className="text-[10px] text-sky-300/80 uppercase tracking-wide">Втеча</span>
                      )}
                      {opt.kind === "finish" && (
                        <span className="text-[10px] text-slate-300/80 uppercase tracking-wide">Завершити</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {step.finished && (
                <p className="text-[11px] text-emerald-200/80">
                  Поход завершено. Можеш повернутись до міста або почати нову пригоду з іншим ризиком.
                </p>
              )}
            </motion.section>
          )}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-lg border border-slate-600 bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-200 px-3 py-1.5 transition"
            >
              ← Повернутися
            </button>

            {(phase === "step" || phase === "loading") && (
              <button
                type="button"
                onClick={handleRestart}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-100 px-3 py-1.5 transition"
              >
                ↻ Нова пригода
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function GatheringPage() {
  return (
    <Suspense
      fallback={<main className="min-h-screen bg-black text-slate-200 flex items-center justify-center">Завантаження…</main>}
    >
      <GatheringInner />
    </Suspense>
  );
}