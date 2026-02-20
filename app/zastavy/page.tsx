"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getJSON, postJSON } from "@/lib/api";
import { resolveTgId } from "@/lib/tg";

// ─────────────────────────────────────────────────────────────
// Типи
// ─────────────────────────────────────────────────────────────
type FortBonuses = {
  hp_pct: number;
  atk_pct: number;
  income_pct: number;
  drop_pct: number;
};

type FortData = {
  id: number;
  name: string;
  rank: number; // #1, #2 ...
  level: number;
  xp: number;
  xp_needed: number;

  bonuses: FortBonuses;

  member_count?: number;
  max_members?: number;
};

type FortStatusResponse = {
  ok: boolean;
  member: boolean;
  leader?: boolean | null;
  fort?: FortData | null;
  error?: string;
};

type FortAction = {
  id: string;
  label: string;
  icon: string;
  description: string;
  href?: string;
  leaderOnly?: boolean;
};

// базові дії застави
const baseActions: FortAction[] = [
  {
    id: "chat",
    label: "Чат застави",
    icon: "💬",
    description: "Живе спілкування всіх учасників застави.",
    href: "/zastavy/chat",
  },
  {
    id: "treasury",
    label: "Казна",
    icon: "🏦",
    description: "Спільні внески, витрати та баланс застави.",
    href: "/zastavy/treasury",          // ← тут підв’язана нова сторінка
  },
  {
    id: "sacrifice",
    label: "Жертва Богам",
    icon: "🕯️",
    description: "Поклади жертву й отримай ласку богів.",
    href: "/zastavy/sacrifice",
  },
  {
    id: "sacrifice-rating",
    label: "Рейтинг Жертви",
    icon: "🏆",
    description: "Хто приніс найбільше підношень.",
    href: "/zastavy/sacrifice-rating",
  },
  {
    id: "members",
    label: "Учасники",
    icon: "🧍‍♂️",
    description: "Список воїнів, що стоять під цим стягом.",
    href: "/zastavy/members",
  },
  {
    id: "stats",
    label: "Статистика",
    icon: "📈",
    description: "Перемоги, поразки, активність та інші цифри.",
    href: "/zastavy/stats",
  },
];

const leaderExtraActions: FortAction[] = [
  {
    id: "applications",
    label: "Заявки на вступ",
    icon: "📝",
    description: "Переглянути тих, хто стукає до застави.",
    href: "/zastavy/applications",
    leaderOnly: true,
  },
];

export default function ZastavaPage() {
  const router = useRouter();
  const [status, setStatus] = useState<FortStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // завантаження статусу застави
  useEffect(() => {
    const tgId = resolveTgId();
    if (!tgId) {
      setError(
        "Не вдалося визначити ваш Telegram ID. Відкрийте мініап з чату бота."
      );
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const resp = await getJSON<FortStatusResponse>(
          `/api/zastavy/status?tg_id=${tgId}`
        );
        setStatus(resp);

        if (!resp.ok) {
          setError(resp.error || "Не вдалося завантажити заставу.");
        }
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLeave() {
    if (!status || !status.member) return;

    const confirmLeave = window.confirm(
      "Ти справді хочеш вийти із застави? Бонуси та прогрес гільдії більше не діятимуть."
    );
    if (!confirmLeave) return;

    try {
      setLeaveLoading(true);
      const tgId = resolveTgId();
      if (!tgId) throw new Error("Telegram ID не знайдено.");
      await postJSON("/api/zastavy/leave", { tg_id: tgId });
      router.replace("/zastavy/list");
    } catch (e: any) {
      alert("Помилка при виході із застави: " + (e?.message || "невідома"));
    } finally {
      setLeaveLoading(false);
    }
  }

  const isMember = !!status && status.ok && status.member && !!status.fort;
  const isLeader = isMember && !!status?.leader;
  const fort: FortData | null = isMember && status?.fort ? status.fort : null;

  // лоадінг / помилка
  if (loading) {
    return (
      <Shell>
        <div className="card">Завантаження застави…</div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="card text-red-400 text-sm">Помилка: {error}</div>
        <BackToCity />
      </Shell>
    );
  }

  // якщо не в заставі
  if (!isMember || !fort) {
    return (
      <Shell>
        <motion.section
          className="relative mb-4 rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-4 shadow-lg"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span>🏰</span>
            <span>Застава</span>
          </h1>
          <p className="text-sm text-slate-200">
            Наразі ти не входиш до жодної застави. Зайди у місто та обери
            заставу, або створи власну.
          </p>
        </motion.section>

        {/* кнопка до списку застав */}
        <motion.button
          type="button"
          onClick={() => router.push("/zastavy/list")}
          className="w-full mb-3 rounded-2xl bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-cyan-400/40 hover:brightness-110 transition"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Перейти до списку застав
        </motion.button>

        {/* Кнопка створення застави */}
        <motion.button
          type="button"
          onClick={() => router.push("/zastavy/create")}
          className="w-full mb-4 rounded-2xl border border-emerald-400/80 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-emerald-200 shadow-md hover:bg-slate-900 hover:shadow-[0_0_16px_rgba(52,211,153,0.45)] transition"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Створити заставу
        </motion.button>

        <BackToCity />
      </Shell>
    );
  }

  // якщо в заставі — основний екран
  const bonuses = fort.bonuses;

  const allActions = isLeader
    ? [...baseActions, ...leaderExtraActions]
    : baseActions;

  return (
    <Shell>
      {/* картка з описом застави */}
      <motion.section
        className="relative mb-4 rounded-2xl bg-slate-900/85 border border-slate-700/70 shadow-lg shadow-black/60 overflow-hidden"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* верхній банер */}
        <div className="h-28 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center">
          <span className="text-4xl">🏰</span>
        </div>

        <div className="px-4 py-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="text-lg font-semibold text-slate-50">
              {fort.name}{" "}
              <span className="text-sm text-slate-400">
                #{fort.rank ?? 1}
              </span>
            </h1>
            {isLeader && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/60 text-amber-200">
                Гетьман застави
              </span>
            )}
          </div>

          <p className="text-sm text-slate-200">
            Рівень застави: <b>{fort.level}</b> · ХР{" "}
            <b>
              {fort.xp}/{fort.xp_needed}
            </b>
          </p>

          <div className="text-xs text-slate-300 space-y-0.5">
            <p>
              Бонуси: HP{" "}
              <b className="text-emerald-300">+{bonuses.hp_pct}%</b>, ATK{" "}
              <b className="text-emerald-300">+{bonuses.atk_pct}%</b>, Доход{" "}
              <b className="text-emerald-300">+{bonuses.income_pct}%</b>, Дроп{" "}
              <b className="text-emerald-300">+{bonuses.drop_pct}%</b>
            </p>
            {(fort.member_count || fort.max_members) && (
              <p>
                Учасники:{" "}
                <b>
                  {fort.member_count ?? "?"}/{fort.max_members ?? "?"}
                </b>
              </p>
            )}
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Доступно: чат, казна, Жертва Богам, рейтинг, учасники, статистика.
          </p>
        </div>
      </motion.section>

      {/* кнопки розділів */}
      <motion.section
        className="relative mb-4 grid grid-cols-1 gap-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.05, delayChildren: 0.05 },
          },
        }}
      >
        {allActions.map((item) => (
          <FortActionButton
            key={item.id}
            item={item}
            onClick={(a) => {
              if (a.href) router.push(a.href);
              else alert("Цей розділ ще в розробці.");
            }}
          />
        ))}
      </motion.section>

      {/* Вийти із застави */}
      <motion.button
        type="button"
        onClick={handleLeave}
        disabled={leaveLoading}
        className="w-full mb-3 rounded-2xl border border-red-500/70 bg-red-900/30 px-4 py-2.5 text-sm font-semibold text-red-200 shadow-md hover:bg-red-900/60 hover:shadow-[0_0_18px_rgba(248,113,113,0.5)] transition disabled:opacity-60 disabled:cursor-not-allowed"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
      >
        {leaveLoading ? "Вихід…" : "Вийти із застави"}
      </motion.button>

      <BackToCity />
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────
// Допоміжні компоненти
// ─────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl relative">
        {/* легке сяйво */}
        <motion.div
          className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,0.28),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(56,189,248,0.28),transparent_60%)]"
          animate={{ opacity: [0.2, 0.4, 0.25], scale: [1, 1.03, 1] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "mirror" }}
        />
        <div className="relative">{children}</div>
      </div>
    </main>
  );
}

function FortActionButton({
  item,
  onClick,
}: {
  item: FortAction;
  onClick: (item: FortAction) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick(item)}
      className="group flex w-full items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-3 text-left shadow-md hover:border-amber-400/80 hover:bg-slate-900/90 hover:shadow-[0_0_18px_rgba(251,191,36,0.35)] transition"
      variants={{
        hidden: { opacity: 0, y: 8, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1 },
      }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/90 ring-1 ring-slate-600/80 group-hover:bg-amber-500/20 group-hover:ring-amber-400/80 transition shrink-0">
          <span className="text-xl">{item.icon}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-sm sm:text-base tracking-wide">
            {item.label}
          </span>
          <span className="text-[11px] text-slate-400 line-clamp-2">
            {item.description}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function BackToCity() {
  const router = useRouter();
  return (
    <motion.div
      className="relative mt-1"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        type="button"
        onClick={() => router.push("/")}
        className="w-full text-center text-xs text-slate-400 hover:text-amber-300 underline underline-offset-4 transition"
      >
        ← Повернутися до міста
      </button>
    </motion.div>
  );
}