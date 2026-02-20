"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type TavernAction = {
  id: string;
  label: string;
  icon: string;
  description: string;
  href?: string;
};

const actions: TavernAction[] = [
  {
    id: "chat",
    label: "Зайти в корчму",
    icon: "🍺",
    description: "Живий чат корчми — балачки, плітки й знайомства.",
    href: "/tavern/chat",
  },
  {
    id: "board",
    label: "Оголошення",
    icon: "📜",
    description: "Шукаєш групу чи торг? Пиши оголошення тут.",
    href: "/tavern/board",
  },
  {
    id: "innkeeper",
    label: "Продати предмети",
    icon: "🤝",
    description: "Продай зайві речі корчмарю за червонці.",
    href: "/tavern/sell",
  },
  {
    id: "food",
    label: "Купити їжу (HP/MP)",
    icon: "🍲",
    description: "Купи їжу та напої для відновлення HP і MP.",
    href: "/tavern/food",
  },
  {
    id: "rest",
    label: "Відпочити",
    icon: "🛏️",
    description: "Віднови HP та MP за 50 червонців.",
    href: "/tavern/rest",
  },
  {
    id: "rules",
    label: "Правила корчми",
    icon: "⚖️",
    description: "Коротко про те, що тут можна, а що — ні.",
    href: "/tavern/rules",
  },
];

export default function TavernPage() {
  const router = useRouter();

  const handleClick = (item: TavernAction) => {
    if (item.href) {
      router.push(item.href);
      return;
    }
    alert("Цей розділ корчми ще в розробці.");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl relative overflow-hidden">
        {/* Тепле сяйво / димок корчми */}
        <motion.div
          className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(248,250,252,0.15),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(251,191,36,0.28),transparent_60%),radial-gradient(circle_at_100%_0%,rgba(56,189,248,0.22),transparent_60%)]"
          animate={{ opacity: [0.2, 0.4, 0.25], scale: [1, 1.03, 1] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "mirror" }}
        />

        {/* Хедер корчми */}
        <motion.header
          className="relative mb-3 flex items-baseline justify-between"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-xl font-semibold tracking-wide flex items-center gap-2">
              <span>🍺</span>
              <span>Корчма</span>
            </h1>
            <p className="text-xs text-slate-400">
              Таверна Берегинева — тут народжуються плітки й пригоди.
            </p>
          </div>
        </motion.header>

        {/* Карта-вступ від корчмаря */}
        <motion.section
          className="relative mb-4 rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-3 shadow-lg shadow-black/60"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🍺</span>
            <span className="font-semibold tracking-wide">Корчмар</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            Ти в корчмі. Пиши звичайним повідомленням — я кину в зал усім, хто
            тут сидить. <br />
            <span className="font-semibold text-amber-300">
              ❗ Без телефонів, контактів та @нікнеймів.
            </span>
          </p>

          <div className="mt-3 text-xs text-slate-400 border-t border-slate-700/60 pt-2">
            <p className="mb-1 font-semibold text-slate-300">Команди:</p>
            <p>• /refresh — оновити розмову</p>
            <p>• /leave — вийти з корчми</p>
          </div>
        </motion.section>

        {/* Кнопки дій у корчмі */}
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
          {actions.map((item) => (
            <TavernActionButton
              key={item.id}
              item={item}
              onClick={handleClick}
            />
          ))}
        </motion.section>

        {/* Блок “Плітки дня” */}
        <motion.section
          className="relative mb-4 rounded-2xl bg-slate-900/80 border border-slate-700/70 px-4 py-3 shadow-md"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
            Плітки сьогодні
          </h2>
          <ul className="space-y-1.5 text-sm text-slate-200">
            <li>• Кажуть, хтось з мандрівників учора соло завалив мінібоса.</li>
            <li>
              • У корчмі шепочуть, що в околицях Нетриці з’явився новий вид
              потвор.
            </li>
            <li>
              • Хтось бачив зграйку гравців, що готуються до рейду на Крижану
              Крону.
            </li>
          </ul>
        </motion.section>
      </div>
    </main>
  );
}

function TavernActionButton({
  item,
  onClick,
}: {
  item: TavernAction;
  onClick: (item: TavernAction) => void;
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