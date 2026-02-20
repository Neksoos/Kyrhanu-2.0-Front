"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import useSWR from "swr";

import { resolveTgId } from "@/lib/tg";
import { getJSON, postJSON } from "@/lib/api";

// fallback, якщо бекенд раптом не надішле costs
const DEFAULT_SECOND_PROFESSION_COST_KLEY = 200;
const DEFAULT_CHANGE_PROFESSION_COST_KLEY = 350;

// ---------- API типи ----------

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

type Costs = {
  second: number;
  change: number;
};

type MeResponse = {
  ok: boolean;
  player_level: number;
  professions: PlayerProfessionDTO[];
  limits: Limits;
  costs: Costs;
};

type ListProfessionsResponse = {
  ok: boolean;
  professions: ProfessionApi[];
};

type GenericResponse = {
  ok: boolean;
  detail?: string | null;
};

// ---------- FETCHER-и ----------

const listFetcher = (url: string): Promise<ListProfessionsResponse> =>
  getJSON<ListProfessionsResponse>(url);

const meFetcher = async (key: [string, number]): Promise<MeResponse> => {
  const [url] = key;
  // tgId у ключі лишаємо, щоб SWR рефетчив при зміні tgId,
  // але сам бекенд бере tg_id з X-Init-Data
  return await getJSON<MeResponse>(url);
};

// ---------- Локальний UI-шар по code ----------

type ProfessionUiMeta = {
  short: string;
  description: string;
  icon: string;
};

const PROF_UI_META: Record<string, ProfessionUiMeta> = {
  herbalist: {
    short: "Збирає лікувальні трави",
    description:
      "Шукає цілющі зілляні трави на болотах, узліссях і в закинутих садах знахарів.",
    icon: "🌿",
  },
  miner: {
    short: "Добуває руду та метали",
    description:
      "Лізе у печери й покинуті шахти, шукаючи металеві жили й рідкісні руди.",
    icon: "⛏",
  },
  stonemason: {
    short: "Добуває камінь і мінерали",
    description:
      "Рубає скелі, збирає особливий камінь для будівництва, рун і фортифікацій.",
    icon: "🪨",
  },
  blacksmith: {
    short: "Кує зброю та броню",
    description:
      "Перетворює метал і вугілля на мечі, кіраси та інше спорядження для війни.",
    icon: "⚒️",
  },
  jeweler: {
    short: "Крафтить амулети та кільця",
    description:
      "Обробляє дорогоцінні камені та метали, створюючи сильні обереги й прикраси.",
    icon: "💎",
  },
  alchemist: {
    short: "Варить зілля та еліксири",
    description:
      "Мішaє трави, гриби й рідкісні інгредієнти, створюючи лікувальні та бойові зілля.",
    icon: "⚗️",
  },
  weaver: {
    short: "Тче тканину й легку броню",
    description:
      "Працює з нитками, волокнами і шкірою, створюючи мантії, накидки та легке спорядження.",
    icon: "🧵",
  },
};

// ---------- Переходи на сторінки професій ----------
const PROF_PAGES: Record<string, string> = {
  alchemist: "/professions/alchemy",
  blacksmith: "/professions/blacksmith",
  jeweler: "/professions/jeweler",
  weaver: "/professions/weaver",
};

// ------------------------------------------------------------

export default function ProfessionsPage() {
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  // === TG ID (для UI/ключів; бекенд все одно читає X-Init-Data) ===
  useEffect(() => {
    let id = resolveTgId();
    if (!id && typeof window !== "undefined") {
      const saved = localStorage.getItem("tg_id");
      if (saved) {
        const n = Number(saved);
        if (!Number.isNaN(n) && n > 0) id = n;
      }
    }
    if (id) {
      setTgId(id);
      if (typeof window !== "undefined") {
        localStorage.setItem("tg_id", String(id));
      }
    }
  }, []);

  // === GET /api/professions ===
  const {
    data: listData,
    error: listError,
    isLoading: listLoading,
  } = useSWR<ListProfessionsResponse>("/api/professions", listFetcher);

  // === GET /api/professions/me ===
  const {
    data: meData,
    error: meError,
    isLoading: meLoading,
    mutate: mutateMe,
  } = useSWR<MeResponse>(tgId ? ["/api/professions/me", tgId] : null, meFetcher);

  const loading = listLoading || meLoading || !listData || !meData;

  // map code -> player profession
  const ownedByCode = useMemo(() => {
    const map: Record<string, PlayerProfessionDTO> = {};
    if (meData?.professions) {
      for (const p of meData.professions) {
        map[p.profession.code] = p;
      }
    }
    return map;
  }, [meData]);

  const totalProfCount = meData?.professions?.length ?? 0;
  const hasAnyProfession = totalProfCount > 0;
  const playerLevel = meData?.player_level ?? 1;

  const limits = meData?.limits;
  const secondCost =
    meData?.costs?.second ?? DEFAULT_SECOND_PROFESSION_COST_KLEY;
  const changeCost =
    meData?.costs?.change ?? DEFAULT_CHANGE_PROFESSION_COST_KLEY;

  // === handlers ===
  const handleChoose = async (code: string, name: string) => {
    setBusyCode(code);
    setActionMessage(null);
    setActionError(null);

    try {
      await postJSON<GenericResponse>("/api/professions/choose", {
        profession_code: code,
      });
      setActionMessage(`Професія «${name}» обрана.`);
      await mutateMe();
    } catch (e: any) {
      setActionError(e?.message || "Не вдалося обрати професію.");
    } finally {
      setBusyCode(null);
    }
  };

  const handleAbandon = async (code: string, name: string) => {
    setBusyCode(code);
    setActionMessage(null);
    setActionError(null);

    try {
      await postJSON<GenericResponse>("/api/professions/abandon", {
        profession_code: code,
      });
      setActionMessage(`Професію «${name}» скинуто.`);
      await mutateMe();
    } catch (e: any) {
      setActionError(e?.message || "Не вдалося скинути професію.");
    } finally {
      setBusyCode(null);
    }
  };

  // === RENDER ===

  if (!tgId) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="text-sm text-center">
          Не вдалося визначити Telegram ID. Запусти мініап із бота.
        </div>
      </main>
    );
  }

  if (listError || meError) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-red-400 font-bold mb-2">Помилка</div>
          <div className="text-sm">{String(listError || meError)}</div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-300">Завантаження професій…</div>
      </main>
    );
  }

  const professions = listData!.professions;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl relative">
        <div className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,0.28),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(56,189,248,0.28),transparent_60%)]" />

        {/* back (top link) */}
        <motion.button
          type="button"
          onClick={() => router.push("/")}
          className="relative mb-2 text-xs text-slate-400 hover:text-amber-300 transition"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ← Повернутися до міста
        </motion.button>

        {/* header */}
        <motion.header
          className="relative mb-4 rounded-2xl bg-slate-950/80 border border-slate-700/70 px-4 py-3 shadow-[0_0_20px_rgba(15,23,42,0.9)]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">🛠️</div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80">
                Шлях ремесла
              </div>
              <h1 className="text-lg font-semibold tracking-wide">
                Професії героя
              </h1>
            </div>
          </div>

          <p className="mt-2 text-sm text-slate-200">
            Обирай ремесло, яке пасує твоєму стилю гри. Збиральні професії дають
            ресурси, крафтові — перетворюють їх на спорядження, зілля та обереги.
          </p>

          <div className="mt-2 text-[11px] text-slate-300">
            Перша професія відкривається <b>безкоштовно</b>. Друга одночасна
            професія коштує <b>{secondCost} клейнодів</b>. Скинути професію та
            обрати іншу — <b>{changeCost} клейнодів</b>.
          </div>

          {limits && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-slate-900/80 border border-emerald-500/50 px-2 py-1.5">
                <div className="text-emerald-300 mb-0.5">
                  Збиральні професії
                </div>
                <div className="text-slate-200">
                  {limits.gathering.current}/{limits.gathering.max} обрано
                </div>
              </div>
              <div className="rounded-lg bg-slate-900/80 border border-sky-500/50 px-2 py-1.5">
                <div className="text-sky-300 mb-0.5">Крафтові професії</div>
                <div className="text-slate-200">
                  {limits.craft.current}/{limits.craft.max} обрано
                </div>
              </div>
            </div>
          )}

          {hasAnyProfession && limits && (
            <div className="mt-3 text-[11px] text-amber-300">
              Ліміт професій: збиральні до <b>{limits.gathering.max}</b>, крафтові до <b>{limits.craft.max}</b>.
            </div>
          )}
        </motion.header>

        {/* action messages */}
        {(actionMessage || actionError) && (
          <motion.div
            className={`relative mb-3 rounded-xl px-3 py-2 text-sm ${
              actionError
                ? "bg-red-900/50 border border-red-500/70 text-red-100"
                : "bg-emerald-900/40 border border-emerald-500/70 text-emerald-100"
            }`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {actionError || actionMessage}
          </motion.div>
        )}

        {/* professions list */}
        <motion.section
          className="relative mb-3 rounded-2xl bg-slate-900/80 border border-slate-700/70 px-4 py-3 shadow-md"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
            Доступні професії
          </h2>

          <ul className="space-y-3">
            {professions.map((p) => {
              const owned = ownedByCode[p.code];
              const busy = busyCode === p.code;
              const ui = PROF_UI_META[p.code] || {
                short: p.descr,
                description: p.descr,
                icon: "📜",
              };

              const isGather = p.kind === "gathering";
              const total = totalProfCount;

              let chooseLabel = "Обрати професію";
              let disabled = busy;
              const levelLocked = playerLevel < p.min_level;

              if (owned) {
                disabled = true;
              } else if (total === 0) {
                chooseLabel = "Обрати (безкоштовно)";
              } else if (total === 1) {
                chooseLabel = `Обрати за ${secondCost} клейнодів`;
              } else if (total >= 2) {
                chooseLabel = "Досягнуто максимум професій";
                disabled = true;
              }

              if (levelLocked) {
                chooseLabel = `Замкнено до рівня ${p.min_level}`;
                disabled = true;
              }

              if (busy) chooseLabel = "Вибір…";

              const detailsHref = PROF_PAGES[p.code];

              return (
                <li
                  key={p.code}
                  className="rounded-xl border border-slate-700/60 bg-slate-950/60 hover:border-amber-400/70 hover:bg-slate-900/80 hover:shadow-[0_0_16px_rgba(251,191,36,0.35)] transition"
                >
                  <div className="px-3 py-2 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{ui.icon}</span>

                        <div className="flex flex-col">
                          <span className="text-sm font-semibold flex items-center gap-1">
                            {p.name}
                            {owned && (
                              <span className="text-[10px] text-emerald-300 border border-emerald-400/60 rounded-full px-2 py-[1px]">
                                Обрана
                              </span>
                            )}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            {ui.short}
                          </span>
                        </div>
                      </div>

                      <span
                        className={
                          "text-[11px] px-2 py-0.5 rounded-full border text-slate-100 " +
                          (isGather
                            ? "border-emerald-400/70 bg-emerald-500/10"
                            : "border-sky-400/70 bg-sky-500/10")
                        }
                      >
                        {isGather ? "Збиральна професія" : "Крафтова професія"}
                      </span>
                      {levelLocked && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-rose-400/60 bg-rose-500/10 text-rose-100">
                          🔒 Рівень {p.min_level}
                        </span>
                      )}
                    </div>

                    <p className="text-[12px] text-slate-300">{ui.description}</p>

                    {owned && (
                      <div className="mt-1">
                        <div className="text-[11px] text-slate-300">Рівень {owned.level} · XP {owned.xp}</div>
                        <div className="mt-1 h-1.5 rounded bg-slate-800">
                          <div
                            className="h-1.5 rounded bg-emerald-400"
                            style={{ width: `${Math.max(5, Math.min(100, Math.round((owned.xp % 100) )))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {!owned && (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleChoose(p.code, p.name)}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-amber-500/90 hover:bg-amber-400 disabled:opacity-60 text-black text-xs font-semibold px-3 py-1.5 transition shadow-sm"
                        >
                          {chooseLabel}
                        </button>
                      )}

                      {owned && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAbandon(p.code, p.name)}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/70 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 text-red-100 text-[11px] font-medium px-3 py-1.5 transition"
                        >
                          {busy
                            ? "Скидання…"
                            : `Скинути професію за ${changeCost} клейнодів`}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (detailsHref) router.push(detailsHref);
                          else setActionMessage("Сторінка цієї професії ще не готова.");
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-600/70 text-slate-300 text-[11px] px-3 py-1.5 hover:border-slate-300 hover:text-slate-50 transition"
                      >
                        Перейти
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.section>

        {/* нижня велика кнопка назад у місто */}
        <motion.button
          type="button"
          onClick={() => router.push("/")}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/85 border border-slate-700/80 px-4 py-3 text-sm font-semibold text-slate-100 hover:border-amber-400/80 hover:bg-slate-900 hover:text-amber-200 shadow-md transition"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>⬅</span>
          <span>Повернутися у місто</span>
        </motion.button>
      </div>
    </main>
  );
}
