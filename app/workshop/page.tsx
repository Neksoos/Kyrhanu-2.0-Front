"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";

import {
  Hammer,
  FlaskConical,
  Gem,
  ChevronLeft,
  ShoppingBag,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";

import { resolveTgId } from "@/lib/tg";

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

type MeResponse = {
  ok: boolean;
  player_level: number;
  professions: PlayerProfessionDTO[];
  limits: Limits;
};

const meFetcher = async (key: [string, number]): Promise<MeResponse> => {
  const [url, tgId] = key;

  const res = await fetch(`/api/proxy${url}`, {
    headers: { "X-Tg-Id": String(tgId) },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.detail || data?.error || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return (await res.json()) as MeResponse;
};

// ---------- helpers ----------
function professionRoute(code: string): string {
  const map: Record<string, string> = {
    alchemist: "/professions/alchemy",
    blacksmith: "/professions/blacksmith",
    jeweler: "/professions/jeweler",
  };
  return map[code] || "/professions";
}

function professionEmoji(code: string): string {
  const map: Record<string, string> = {
    alchemist: "🧪",
    blacksmith: "🔨",
    jeweler: "💎",
  };
  return map[code] || "🛠️";
}

function professionIcon(code: string) {
  const map: Record<string, JSX.Element> = {
    alchemist: <FlaskConical className="h-5 w-5" />,
    blacksmith: <Hammer className="h-5 w-5" />,
    jeweler: <Gem className="h-5 w-5" />,
  };
  return map[code] || <Sparkles className="h-5 w-5" />;
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
  tone?: "neutral" | "ok" | "warn" | "bad";
  icon?: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
      : tone === "warn"
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
  return <div className={cx("animate-pulse rounded-2xl bg-white/5 border border-white/10", className)} />;
}

// ------------------------------------------------------------
export default function WorkshopPage() {
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"menu" | "shop">("menu");

  // === TG ID ===
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const id = await resolveTgId();
        if (!cancelled && id) {
          setTgId(id);
          localStorage.setItem("tg_id", String(id));
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // === GET /api/professions/me ===
  const { data: meData, error: meErr, isLoading } = useSWR<MeResponse>(
    tgId ? ["/api/professions/me", tgId] : null,
    meFetcher
  );

  const craftProfs = useMemo(
    () => meData?.professions.filter((p) => p.profession.kind === "craft") ?? [],
    [meData]
  );

  const owned = useMemo(() => new Set(craftProfs.map((p) => p.profession.code)), [craftProfs]);

  // ✅ “каталог” крафтових професій (щоб показувати і заблоковані теж)
  const craftCatalog = useMemo(
    () => [
      {
        code: "blacksmith",
        title: "Ковальство",
        emoji: professionEmoji("blacksmith"),
        desc: "Крафт зброї та спорядження з металів і заготовок.",
        accent: "emerald",
      },
      {
        code: "alchemist",
        title: "Алхімія",
        emoji: professionEmoji("alchemist"),
        desc: "Сушіння трав, реагенти та варка зілля.",
        accent: "cyan",
      },
      {
        code: "jeweler",
        title: "Ювелір",
        emoji: professionEmoji("jeweler"),
        desc: "Камені, вставки, прикраси та апгрейди.",
        accent: "amber",
      },
    ],
    []
  );

  // ---------- handlers ----------
  // ✅ ВАЖЛИВО: більше НІКОЛИ не автоперекидаємо у ковальство
  const handleCraftClick = () => {
    setError(null);
    setView("shop"); // завжди показуємо вибір
  };

  const handlePickProfession = (code: string) => {
    setError(null);
    router.push(professionRoute(code));
  };

  const handleWorkshopShop = () => {
    setError(null);
    router.push("/workshop/shop");
  };

  const topStatus = useMemo(() => {
    if (!tgId) return { tone: "warn" as const, text: "Немає TG", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    if (meErr) return { tone: "warn" as const, text: "Проблема з профілем", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    return { tone: "ok" as const, text: "Підключено", icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
  }, [tgId, meErr]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <main className="min-h-[100dvh] text-slate-50 flex justify-center px-4 py-6 bg-[radial-gradient(1200px_600px_at_15%_-10%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(900px_540px_at_100%_10%,rgba(56,189,248,0.14),transparent_58%),radial-gradient(800px_600px_at_20%_120%,rgba(245,158,11,0.10),transparent_60%),linear-gradient(to_bottom,rgba(2,6,23,1),rgba(0,0,0,1))]">
      {/* subtle scan */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 2px)",
        }}
      />

      <div className="w-full max-w-3xl relative space-y-4">
        <div className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,0.25),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(56,189,248,0.22),transparent_60%)]" />

        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-[0_24px_90px_-55px_rgba(0,0,0,0.9)]"
        >
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" />
          <div className="absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center">
                  <Hammer className="h-6 w-6 opacity-90" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-semibold tracking-tight">🏚️ Майстерня</h1>
                  <p className="text-xs md:text-sm text-slate-300">Крафт, професії та реміснича лавка.</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone={topStatus.tone} icon={topStatus.icon}>
                  {topStatus.text}
                </Pill>

                <Pill tone="neutral" icon={<Sparkles className="h-3.5 w-3.5" />}>
                  Крафтові професії ще допилюються
                </Pill>

                {tgId ? <Pill tone="neutral">tg_id: {tgId}</Pill> : null}
              </div>
            </div>

            <button
              onClick={() => router.push("/city")}
              className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Місто
            </button>
          </div>
        </motion.header>

        {/* ERROR */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="rounded-3xl border border-rose-500/35 bg-rose-950/25 backdrop-blur-md p-4 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-rose-200">Помилка</div>
                  <div className="text-sm text-rose-100/90 mt-1">{error}</div>
                </div>
                <button
                  className="px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm"
                  onClick={() => setError(null)}
                >
                  Закрити
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ================= MENU ================= */}
          {view === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-xl shadow-black/50"
            >
              <div className="mb-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                ⚠️ Крафтові професії на етапі розробки — ще не все готово.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleCraftClick}
                  className="w-full rounded-2xl px-4 py-3 bg-gradient-to-r from-emerald-400/90 to-cyan-400/90 text-black font-semibold hover:brightness-110 transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Hammer className="h-5 w-5" />
                    Крафт
                  </span>
                  <ArrowRight className="h-5 w-5 opacity-80" />
                </button>

                <button
                  onClick={handleWorkshopShop}
                  className="w-full rounded-2xl px-4 py-3 bg-gradient-to-r from-amber-400/90 to-orange-400/90 text-black font-semibold hover:brightness-110 transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Реміснича лавка
                  </span>
                  <ArrowRight className="h-5 w-5 opacity-80" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                {tgId ? (
                  <>
                    Твої крафтові професії:{" "}
                    <span className="text-slate-100 font-semibold">{craftProfs.length}</span>
                    {meData?.player_level != null ? (
                      <>
                        {" "}
                        • Рівень героя: <span className="text-slate-100 font-semibold">{meData.player_level}</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>Запусти мініап з бота, щоб підтягнути професії.</>
                )}
              </div>
            </motion.div>
          )}

          {/* ================= PICK PROFESSION ================= */}
          {view === "shop" && (
            <motion.div
              key="shop"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-xl shadow-black/50"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Обери професію</h2>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Вибір відкривається завжди (без автопереходу).
                  </p>
                </div>

                <button
                  onClick={() => setView("menu")}
                  className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </button>
              </div>

              {!tgId ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                  Не вдалося визначити Telegram ID. Запусти мініап з бота.
                </div>
              ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {craftCatalog.map((opt) => {
                      const isOwned = owned.has(opt.code);
                      const level = craftProfs.find((p) => p.profession.code === opt.code)?.level ?? 1;

                      const glow =
                        opt.accent === "emerald"
                          ? "bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.18),transparent_55%)]"
                          : opt.accent === "cyan"
                          ? "bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.16),transparent_55%)]"
                          : "bg-[radial-gradient(circle_at_20%_10%,rgba(245,158,11,0.14),transparent_55%)]";

                      return (
                        <button
                          key={opt.code}
                          onClick={() => {
                            setError(null);
                            if (!isOwned) {
                              setError("🔒 У тебе немає цієї професії. Відкрий її в ремісничій лавці.");
                              return;
                            }
                            handlePickProfession(opt.code);
                          }}
                          className={cx(
                            "relative overflow-hidden rounded-3xl border p-4 text-left transition",
                            "bg-black/20 hover:bg-black/30",
                            isOwned ? "border-white/10 hover:border-emerald-400/20" : "border-white/10 hover:border-amber-400/20 opacity-80"
                          )}
                        >
                          <div className={cx("pointer-events-none absolute inset-0 opacity-70", glow)} />

                          <div className="relative flex items-start gap-3">
                            <div className="h-11 w-11 rounded-2xl border border-white/10 bg-black/25 flex items-center justify-center">
                              {professionIcon(opt.code)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-xl">{opt.emoji}</div>
                                <div className="font-semibold truncate">{opt.title}</div>

                                {isOwned ? (
                                  <Pill tone="ok" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                                    Доступно
                                  </Pill>
                                ) : (
                                  <Pill tone="warn" icon={<Lock className="h-3.5 w-3.5" />}>
                                    Заблок.
                                  </Pill>
                                )}
                              </div>

                              <div className="text-xs text-slate-300 mt-1 line-clamp-2">{opt.desc}</div>

                              <div className="mt-3 flex items-center justify-between">
                                {isOwned ? (
                                  <span className="text-[11px] text-slate-300">
                                    Рівень: <span className="text-slate-100 font-semibold">Lv {level}</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-amber-200/90">Відкрий у лавці</span>
                                )}

                                <span className="text-[11px] text-slate-300 inline-flex items-center gap-1">
                                  Перейти <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleWorkshopShop}
                      className="w-full rounded-2xl px-4 py-3 bg-gradient-to-r from-amber-400/90 to-orange-400/90 text-black font-semibold hover:brightness-110 transition"
                    >
                      🛒 Відкрити лавку
                    </button>

                    <button
                      onClick={() => setView("menu")}
                      className="w-full rounded-2xl px-4 py-3 bg-slate-700 hover:bg-slate-600 transition"
                    >
                      ⬅ Назад
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}