"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

import { resolveTgId } from "@/lib/tg";
import { getJSON, ApiError } from "@/lib/api";

// ---------------------------------------------
// CONFIG
// ---------------------------------------------
const APP_VERSION = (
  process.env.NEXT_PUBLIC_APP_VERSION ||
  process.env.NEXT_PUBLIC_VERSION ||
  "dev"
).trim();

function patronsSeenKeyForToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `patrons_seen_day:${yyyy}-${mm}-${dd}:v:${APP_VERSION}`;
}

// ---------------------------------------------
// TYPES
// ---------------------------------------------
type CityTheme =
  | "areas"
  | "quests"
  | "tavern"
  | "zastava"
  | "workshop"
  | "professions"
  | "ratings"
  | "perun"
  | "kleynody"
  | "profile"
  | "forum"
  | "settings"
  | "invite"
  | "guide";

type CityAction = {
  id: string;
  label: string;
  icon: string;
  href?: string;
  theme?: CityTheme;
};

type ProfileDTO = {
  tg_id: number;
  name: string;

  level: number;
  xp: number;
  xp_needed: number;

  race_key?: string | null;
  class_key?: string | null;
  gender?: string | null;

  hp_max: number;
  mp_max: number;
  atk: number;
  defense: number;

  chervontsi: number;
  kleynody: number;

  hp: number;
  mp: number;
  energy: number;
  energy_max: number;
};

type EntryState = {
  regen_hp: number;
  regen_mp: number;
  regen_energy: number;
};

type DailyLoginResponse = {
  xp_gain: number;
  coins_gain: number;
  got_kleynod: boolean;
};

type ProfileResponse = {
  ok?: boolean;
  player?: ProfileDTO;
  profile?: ProfileDTO;
  me?: ProfileDTO;
  user?: ProfileDTO;
  character?: ProfileDTO;
  data?: {
    player?: ProfileDTO;
    profile?: ProfileDTO;
    me?: ProfileDTO;
    user?: ProfileDTO;
    character?: ProfileDTO;
    entry?: EntryState;
    entry_state?: EntryState;
    daily_login?: DailyLoginResponse | null;
  };
  entry?: EntryState;
  entry_state?: EntryState;
  daily_login?: DailyLoginResponse | null;
  dailyLogin?: DailyLoginResponse | null;
};

function looksLikeProfile(v: unknown): v is ProfileDTO {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.tg_id === "number" ||
    (typeof o.level === "number" &&
      typeof o.hp === "number" &&
      typeof o.mp === "number" &&
      typeof o.energy === "number")
  );
}

// ---------------------------------------------
// THEMING
// ---------------------------------------------
const BAR: Record<CityTheme, string> = {
  areas: "from-emerald-400 to-cyan-400",
  quests: "from-amber-300 to-orange-500",
  tavern: "from-yellow-300 to-amber-600",
  zastava: "from-slate-300 to-slate-500",
  workshop: "from-orange-400 to-rose-500",
  professions: "from-indigo-400 to-violet-500",
  ratings: "from-yellow-300 to-amber-500",
  perun: "from-sky-400 to-blue-600",
  kleynody: "from-fuchsia-400 to-cyan-400",
  profile: "from-emerald-300 to-teal-500",
  forum: "from-slate-300 to-slate-500",
  settings: "from-slate-300 to-slate-600",
  invite: "from-cyan-300 to-sky-500",
  guide: "from-lime-300 to-emerald-500",
};

function describeAction(theme?: CityTheme): string {
  switch (theme) {
    case "areas":
      return "Подорожі, пригоди, бої";
    case "quests":
      return "Завдання, нагороди, сюжет";
    case "tavern":
      return "Відпочинок, бафи, NPC";
    case "zastava":
      return "Оборона та сутички";
    case "workshop":
      return "Крафт і покращення";
    case "professions":
      return "Ремесла та розвиток";
    case "ratings":
      return "Рейтинг гравців";
    case "perun":
      return "Суд і справедливість";
    case "kleynody":
      return "Преміум-магазин";
    case "profile":
      return "Твій персонаж";
    case "forum":
      return "Спільнота і чати";
    case "invite":
      return "Запроси друзів";
    case "settings":
      return "Налаштування гри";
    case "guide":
      return "Довідка, FAQ, підказки";
    default:
      return "";
  }
}

// ---------------------------------------------
// MENU MODEL
// ---------------------------------------------
const primaryAction: CityAction = {
  id: "areas",
  label: "Мандрувати",
  icon: "🌍",
  href: "/areas",
  theme: "areas",
};

const premiumAction: CityAction = {
  id: "kleynody",
  label: "Скарбниця",
  icon: "💎",
  href: "/premium",
  theme: "kleynody",
};

const patronsAction: CityAction = {
  id: "patrons",
  label: "Підтримати гру",
  icon: "💖",
  href: "/patrons",
};

const guideAction: CityAction = {
  id: "guide",
  label: "Довідка / FAQ",
  icon: "❓",
  href: "/guide",
  theme: "guide",
};

const mainActions: CityAction[] = [
  { id: "quests", label: "Квести", icon: "📜", href: "/quests", theme: "quests" },
  guideAction,
  { id: "tavern", label: "Корчма", icon: "🍺", href: "/tavern", theme: "tavern" },
  { id: "zastava", label: "Застава", icon: "🏰", href: "/zastavy", theme: "zastava" },
  { id: "workshop", label: "Майстерня", icon: "⚒️", href: "/workshop", theme: "workshop" },
];

const moreProgressActions: CityAction[] = [
  { id: "professions", label: "Професії", icon: "🏛️", href: "/professions", theme: "professions" },
  { id: "ratings", label: "Рейтинги", icon: "🏆", href: "/ratings", theme: "ratings" },
  { id: "perun", label: "Суд Перуна", icon: "⚖️", href: "/perun", theme: "perun" },
];

const moreCommunityActions: CityAction[] = [
  { id: "profile", label: "Профіль", icon: "🧙‍♂️", href: "/profile", theme: "profile" },
  { id: "forum", label: "Форум", icon: "💬", href: "/forum", theme: "forum" },
  { id: "invite", label: "Запросити друга", icon: "🔗", href: "/referrals", theme: "invite" },
];

const moreSystemActions: CityAction[] = [
  { id: "settings", label: "Налаштування", icon: "⚙️", href: "/settings", theme: "settings" },
];

// ---------------------------------------------
// PERF: cheap detector for weak WebView devices
// ---------------------------------------------
function detectLowPerf(): boolean {
  try {
    const nav: any = typeof navigator !== "undefined" ? navigator : null;
    if (!nav) return false;

    const cores = Number(nav.hardwareConcurrency || 0) || 4;
    const mem = Number(nav.deviceMemory || 0) || 4;

    const ua = String(nav.userAgent || "").toLowerCase();
    const isAndroid = ua.includes("android");
    const isTelegram = ua.includes("telegram") || ua.includes("tgwebview");

    // орієнтир: у телеграм-webview часто слабше реального браузера
    const weakByHw = cores <= 4 || mem <= 4;
    const weakByEnv = isTelegram && isAndroid;

    return weakByHw || weakByEnv;
  } catch {
    return false;
  }
}

export default function CityPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [lowPerf, setLowPerf] = useState(false);

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [entryState, setEntryState] = useState<EntryState | null>(null);

  const [showRegenPopup, setShowRegenPopup] = useState(false);

  // daily login
  const [dailyLogin, setDailyLogin] = useState<DailyLoginResponse | null>(null);
  const [showDailyLoginPopup, setShowDailyLoginPopup] = useState(false);

  // UI: "More" drawer
  const [moreOpen, setMoreOpen] = useState(false);

  // timers cleanup
  const timersRef = useRef<number[]>([]);
  const pushTimeoutRef = useRef<number | null>(null);

  const moreKey = useMemo(() => `city_more_open:v:${APP_VERSION}`, []);
  useEffect(() => {
    setLowPerf(detectLowPerf());
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(moreKey);
      if (raw === "1") setMoreOpen(true);
    } catch {}
  }, [moreKey]);

  useEffect(() => {
    try {
      localStorage.setItem(moreKey, moreOpen ? "1" : "0");
    } catch {}
  }, [moreOpen, moreKey]);

  const cardClass = lowPerf
    ? "bg-black/60 border border-white/12 shadow-xl shadow-black/70"
    : "bg-black/45 backdrop-blur-md border border-white/10 shadow-xl shadow-black/70";

  const popupClassBase = lowPerf
    ? "bg-black/90 border border-white/15"
    : "bg-black/85 backdrop-blur-xl border";

  // ---------------------------------------------
  // LOAD: profile + regen + daily login (from city-entry)
  // ---------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function run() {
      let tgId: number | undefined;

      try {
        setChecking(true);
        setError(null);

        // 1) tg_id from Telegram WebApp
        const fromTg = await resolveTgId();
        if (fromTg) tgId = fromTg;

        // 2) fallback from localStorage
        if (!tgId && typeof window !== "undefined") {
          const raw = localStorage.getItem("tg_id");
          if (raw) {
            const n = Number(raw);
            if (!Number.isNaN(n) && n > 0) tgId = n;
          }
        }

        if (!tgId) {
          setError("Не знайдено Telegram ID. Відкрий мініап із чату бота.");
          setChecking(false);
          return;
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("tg_id", String(tgId));
        }

        const body = await getJSON<ProfileResponse>(`/api/city-entry?tg_id=${tgId}`, {
          headers: { "X-Tg-Id": String(tgId) },
          cache: "no-store",
        });

        if (cancelled) return;

        const payload = body?.data && typeof body.data === "object" ? body.data : body;

        const player =
          body?.player ||
          body?.profile ||
          body?.me ||
          body?.user ||
          body?.character ||
          payload?.player ||
          payload?.profile ||
          payload?.me ||
          payload?.user ||
          payload?.character ||
          (looksLikeProfile(payload) ? payload : null);

        if (!player) {
          const msg =
            (body as any)?.detail ||
            (body as any)?.error ||
            (body as any)?.message ||
            "Bad response";
          throw new Error(msg);
        }

        setProfile(player);
        setEntryState(body.entry || body.entry_state || payload?.entry || payload?.entry_state || null);

        // regen popup
        if (
          body.entry &&
          (body.entry.regen_hp > 0 || body.entry.regen_mp > 0 || body.entry.regen_energy > 0)
        ) {
          setShowRegenPopup(true);
          const t = window.setTimeout(() => setShowRegenPopup(false), 2500);
          timersRef.current.push(t);
        }

        // daily login
        const dl = body.daily_login || body.dailyLogin || payload?.daily_login || null;
        if (dl) {
          const xp = Number(dl.xp_gain || 0);
          const coins = Number(dl.coins_gain || 0);
          const got = !!dl.got_kleynod;

          if (xp > 0 || coins > 0 || got) {
            setDailyLogin({ xp_gain: xp, coins_gain: coins, got_kleynod: got });
            setShowDailyLoginPopup(true);
            const t = window.setTimeout(() => setShowDailyLoginPopup(false), 3200);
            timersRef.current.push(t);
          }
        }

        // patrons popup once per day
        if (typeof window !== "undefined") {
          const key = patronsSeenKeyForToday();
          const seen = localStorage.getItem(key);
          if (!seen) {
            localStorage.setItem(key, "1");
            // даємо сторінці встигнути намалюватися
            pushTimeoutRef.current = window.setTimeout(() => {
              router.push("/patrons?from=boot");
            }, 60);
          }
        }

        setChecking(false);
      } catch (e: any) {
        if (cancelled) return;

        // ✅ NEED_REGISTER -> redirect
        if (e instanceof ApiError) {
          const code = e?.detail?.code || e?.detail?.detail?.code || e?.detail?.reason || null;
          if (e.status === 409 && code === "NEED_REGISTER") {
            try {
              const id =
                tgId ??
                (typeof window !== "undefined"
                  ? Number(localStorage.getItem("tg_id") || "0")
                  : 0);

              router.replace(id > 0 ? `/register?tg_id=${id}` : "/register");
              return;
            } catch {
              router.replace("/register");
              return;
            }
          }
        }

        const msg = String(e?.message || "");
        if (msg.includes("NEED_REGISTER") || msg.includes("409")) {
          try {
            const id =
              typeof window !== "undefined" ? Number(localStorage.getItem("tg_id") || "0") : 0;
            router.replace(id > 0 ? `/register?tg_id=${id}` : "/register");
            return;
          } catch {}
        }

        console.error("city-entry error", e);
        setError("Помилка зʼєднання з сервером.");
        setChecking(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      // clear timeouts
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
      if (pushTimeoutRef.current) window.clearTimeout(pushTimeoutRef.current);
      pushTimeoutRef.current = null;
    };
  }, [router]);

  // ---------------------------------------------
  // StatBar
  // ---------------------------------------------
  const StatBar = ({
    current,
    max,
    color,
    label,
  }: {
    current: number;
    max: number;
    color: string;
    label: string;
  }) => {
    const percent = Math.max(0, Math.min(100, max > 0 ? (current / max) * 100 : 0));

    // на слабких девайсах — без анімації ширини
    if (lowPerf || reduceMotion) {
      return (
        <div className="w-full mb-1">
          <div className="flex justify-between text-xs mb-0.5 opacity-80">
            <span>{label}</span>
            <span>
              {current}/{max}
            </span>
          </div>
          <div className="h-2.5 w-full bg-black/40 rounded-md overflow-hidden border border-white/10">
            <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full mb-1">
        <div className="flex justify-between text-xs mb-0.5 opacity-80">
          <span>{label}</span>
          <span>
            {current}/{max}
          </span>
        </div>

        <div className="h-2.5 w-full bg-black/40 rounded-md overflow-hidden border border-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.55 }}
            className={`h-full ${color}`}
          />
        </div>
      </div>
    );
  };

  const go = (item: CityAction) => {
    if (item.href) router.push(item.href);
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-black flex justify-center items-center text-white">
        Перевірка…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black flex justify-center items-center text-red-400 px-4 text-center text-sm">
        {error}
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen relative text-slate-50 flex justify-center px-4 py-6 overflow-hidden">
      {/* POPUP REGEN */}
      <AnimatePresence>
        {showRegenPopup && entryState && !reduceMotion && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className={`
              fixed top-4 left-1/2 -translate-x-1/2 z-[9999]
              px-5 py-3 rounded-2xl
              ${popupClassBase}
              ${lowPerf ? "" : "border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.45)]"}
              text-slate-100 text-sm
            `}
          >
            <div className="font-semibold text-emerald-300 mb-1 text-center">
              ⭐ Регенеровано
            </div>

            <div className="flex flex-col gap-1 text-center">
              {entryState.regen_hp > 0 && (
                <div className="text-red-300">❤️ HP +{entryState.regen_hp}</div>
              )}
              {entryState.regen_mp > 0 && (
                <div className="text-sky-300">🔮 MP +{entryState.regen_mp}</div>
              )}
              {entryState.regen_energy > 0 && (
                <div className="text-amber-300">🔥 Наснага +{entryState.regen_energy}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POPUP DAILY LOGIN */}
      <AnimatePresence>
        {showDailyLoginPopup && dailyLogin && !reduceMotion && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className={`
              fixed top-24 left-1/2 -translate-x-1/2 z-[9999]
              px-5 py-3 rounded-2xl
              ${popupClassBase}
              ${lowPerf ? "" : "border-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,0.35)]"}
              text-slate-100 text-sm
            `}
          >
            <div className="font-semibold text-yellow-300 mb-1 text-center">
              🎁 Щоденна нагорода
            </div>

            <div className="flex flex-col gap-1 text-center">
              {dailyLogin.xp_gain > 0 && (
                <div className="text-emerald-300">✨ XP +{dailyLogin.xp_gain}</div>
              )}
              {dailyLogin.coins_gain > 0 && (
                <div className="text-amber-300">🪙 Монети +{dailyLogin.coins_gain}</div>
              )}
              {dailyLogin.got_kleynod && (
                <div className="text-fuchsia-300">💎 Клейнод +1</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BACKGROUND (loop video) */}
      <div className="absolute inset-0 -z-20">
        <video
          className={[
            "h-full w-full object-cover",
            // CSS-фільтри — тільки якщо не lowPerf
            lowPerf ? "" : "brightness-110 saturate-125",
          ].join(" ")}
          autoPlay
          muted
          loop
          playsInline
          // на слабких девайсах краще не змушувати браузер тягнути все одразу
          preload={lowPerf ? "metadata" : "auto"}
          // якщо є постер — відео “підхопиться” м’якше
          poster="/city/berengiv_bg.jpg"
          aria-hidden="true"
        >
          <source src="/city/berengiv_bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Mist (дуже дорого з blur + анімацією) */}
      {!lowPerf && !reduceMotion && (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,0.30),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(56,189,248,0.30),transparent_60%)]"
          animate={{ opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 10, repeat: Infinity }}
          style={{ willChange: "opacity" }}
        />
      )}

      <div className="w-full max-w-xl relative z-10">
        {/* STATS */}
        <div className={`mb-3 rounded-2xl p-3 ${cardClass}`}>
          <div className="flex items-end justify-between mb-2">
            <div className="text-xs opacity-85">
              {profile.name} — {profile.level} рівень
            </div>
            <div className="text-[10px] opacity-60">
              {profile.chervontsi} 🪙 · {profile.kleynody} 💎
            </div>
          </div>

          <StatBar label="HP" current={profile.hp} max={profile.hp_max} color="bg-red-500/90" />
          <StatBar label="MP" current={profile.mp} max={profile.mp_max} color="bg-sky-500/90" />
          <StatBar
            label="Наснага"
            current={profile.energy}
            max={profile.energy_max}
            color="bg-amber-400/90"
          />
        </div>

        {/* HEADER */}
        <motion.header
          className="relative mb-3"
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
        >
          <h1 className="text-xl font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            👑 Берегинів
          </h1>
          <p className="text-xs text-slate-200">Столиця Проклятих курганів</p>
        </motion.header>

        {/* PRIMARY */}
        <motion.button
          onClick={() => go(primaryAction)}
          className="
            relative mb-3 w-full
            flex items-center justify-center gap-2
            rounded-2xl
            bg-gradient-to-r from-emerald-400/90 to-cyan-400/90
            px-4 py-3
            text-base font-semibold
            shadow-[0_18px_40px_rgba(0,0,0,0.45)]
            hover:brightness-110 transition
          "
          whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        >
          <span className="text-xl">{primaryAction.icon}</span>
          {primaryAction.label}
        </motion.button>

        {/* MAIN ACTIONS */}
        <Section actions={mainActions} onClick={go} delay={0.05} columns={2} lowPerf={lowPerf} reduceMotion={!!reduceMotion} />

        {/* Premium + Support */}
        <Section actions={[premiumAction, patronsAction]} onClick={go} delay={0} columns={2} lowPerf={lowPerf} reduceMotion={!!reduceMotion} />

        {/* MORE */}
        <motion.button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={[
            "mt-3 w-full rounded-2xl px-4 py-3 border shadow-md flex items-center justify-between text-sm font-semibold transition",
            lowPerf ? "bg-black/60 border-white/12" : "bg-black/35 backdrop-blur-md border-white/15 hover:bg-black/45",
          ].join(" ")}
          whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        >
          <span className="flex items-center gap-2">
            <span className="text-base">🏙️</span> Місто та інше
          </span>
          {moreOpen ? (
            <span className="flex items-center gap-2 opacity-85">
              Згорнути <ChevronUp size={18} />
            </span>
          ) : (
            <span className="flex items-center gap-2 opacity-85">
              Показати <ChevronDown size={18} />
            </span>
          )}
        </motion.button>

        <AnimatePresence initial={false}>
          {moreOpen && (
            <motion.div
              initial={reduceMotion ? false : { height: 0, opacity: 0, y: -6 }}
              animate={reduceMotion ? { height: "auto", opacity: 1 } : { height: "auto", opacity: 1, y: 0 }}
              exit={reduceMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mt-2">
                <DrawerGroup title="Розвиток" actions={moreProgressActions} onClick={go} lowPerf={lowPerf} reduceMotion={!!reduceMotion} />
                <DrawerGroup title="Спільнота" actions={moreCommunityActions} onClick={go} lowPerf={lowPerf} reduceMotion={!!reduceMotion} />
                <DrawerGroup title="Налаштування" actions={moreSystemActions} onClick={go} lowPerf={lowPerf} reduceMotion={!!reduceMotion} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-2" />
      </div>
    </main>
  );
}

// ----------------------------------------------------------
// GRID SECTION
// ----------------------------------------------------------
function Section({
  actions,
  onClick,
  delay,
  columns,
  lowPerf,
  reduceMotion,
}: {
  actions: CityAction[];
  onClick: (a: CityAction) => void;
  delay: number;
  columns: 1 | 2;
  lowPerf: boolean;
  reduceMotion: boolean;
}) {
  const colsClass = columns === 1 ? "grid-cols-1" : "grid-cols-2";

  // на слабких — без stagger анімацій (вони множать роботу layout/paint)
  const enableAnim = !lowPerf && !reduceMotion;

  return (
    <motion.div
      className={`relative mb-2 grid ${colsClass} gap-2`}
      initial={enableAnim ? "hidden" : false}
      animate={enableAnim ? "visible" : false}
      variants={
        enableAnim
          ? {
              hidden: {},
              visible: { transition: { staggerChildren: 0.05, delayChildren: delay } },
            }
          : undefined
      }
    >
      {actions.map((item) => (
        <CityButton
          key={item.id}
          item={item}
          onClick={onClick}
          lowPerf={lowPerf}
          reduceMotion={reduceMotion}
        />
      ))}
    </motion.div>
  );
}

function CityButton({
  item,
  onClick,
  lowPerf,
  reduceMotion,
}: {
  item: CityAction;
  onClick: (a: CityAction) => void;
  lowPerf: boolean;
  reduceMotion: boolean;
}) {
  const themeKey = (item.theme ?? "forum") as CityTheme;
  const enableAnim = !lowPerf && !reduceMotion;

  const baseClass = lowPerf
    ? "bg-black/60 border border-white/12"
    : "bg-black/35 border border-white/15 hover:bg-black/45";

  return (
    <motion.button
      type="button"
      onClick={() => onClick(item)}
      className={[
        "relative w-full overflow-hidden rounded-2xl px-4 py-3 shadow-md transition",
        baseClass,
        // backdrop-blur — тільки якщо не lowPerf
        lowPerf ? "" : "backdrop-blur-md hover:brightness-110",
      ].join(" ")}
      variants={
        enableAnim
          ? {
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }
          : undefined
      }
      whileHover={enableAnim ? { y: -1 } : undefined}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
    >
      <div className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${BAR[themeKey]}`} />

      <div className="flex items-center gap-3 relative z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-white/20 bg-black/45">
          <span className="text-xl">{item.icon}</span>
        </div>

        <div className="flex flex-col text-left min-w-0">
          <span className="text-sm sm:text-base font-semibold leading-tight">
            {item.label}
          </span>
          <span className="text-[11px] opacity-70 leading-tight">
            {describeAction(item.theme)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ----------------------------------------------------------
// DRAWER GROUPS
// ----------------------------------------------------------
function DrawerGroup({
  title,
  actions,
  onClick,
  lowPerf,
  reduceMotion,
}: {
  title: string;
  actions: CityAction[];
  onClick: (a: CityAction) => void;
  lowPerf: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div className="mt-2">
      <div className="px-1 mb-1 text-[11px] uppercase tracking-wide opacity-60">
        {title}
      </div>
      <Section
        actions={actions}
        onClick={onClick}
        delay={0}
        columns={2}
        lowPerf={lowPerf}
        reduceMotion={reduceMotion}
      />
    </div>
  );
}
