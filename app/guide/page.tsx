"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Search,
  X,
  BookOpen,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

type Section = {
  id: string;
  title: string;
  badge?: string;
  searchIndex: string;
  content: React.ReactNode;
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Toast({ text, onClose }: { text: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2400);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed left-1/2 top-4 z-50 w-[92%] -translate-x-1/2 max-w-md">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 px-4 py-3 text-sm text-neutral-100 shadow-xl backdrop-blur">
        {text}
      </div>
    </div>
  );
}

function AccordionItem({
  title,
  rightBadge,
  open,
  onToggle,
  children,
}: {
  title: string;
  rightBadge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold text-neutral-100">
              {title}
            </span>
            {rightBadge ? (
              <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-200">
                {rightBadge}
              </span>
            ) : null}
          </div>
        </div>

        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-neutral-300 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm leading-relaxed text-neutral-200">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function GuidePage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [onlyFaq, setOnlyFaq] = useState(false);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const sections: Section[] = useMemo(
    () => [
      {
        id: "warning",
        title: "Важливо перед читанням",
        badge: "попередження",
        searchIndex:
          "важливо попередження частина функцій може не працювати кнопки ще не підключені довідка у процесі",
        content: (
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
                <div className="space-y-1">
                  <div className="font-semibold text-neutral-100">
                    Довідка оновлюється
                  </div>
                  <div className="text-neutral-200">
                    Частина кнопок і розділів у грі може бути ще не підключена або
                    працювати інакше, ніж описано тут. Якщо натискаєш і нічого не
                    відбувається — це не твоя помилка, а незавершена функція.
                  </div>
                </div>
              </div>
            </div>

            <div className="text-neutral-300">
              Якщо бачиш розбіжність між описом і поведінкою гри — зроби скрін і
              скинь адміну/розробнику: так правиться в рази швидше.
            </div>
          </div>
        ),
      },
      {
        id: "start",
        title: "Швидкий старт",
        badge: "5 хв",
        searchIndex:
          "швидкий старт профіль наснага інвентар квести місто крамниця",
        content: (
          <div className="space-y-3">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Відкрий <b>Профіль</b> і глянь: рівень, XP, HP/MP, валюта.
              </li>
              <li>
                Зроби 2–3 базові дії у <b>Мандрах/Діях</b>, щоб з’явився перший
                лут і XP.
              </li>
              <li>
                Перевір <b>Інвентар</b>: що стакаться, що має вагу, що виглядає
                квестовим.
              </li>
              <li>
                Відкрий <b>Квести</b>, прочитай стадію і обери варіант відповіді.
              </li>
              <li>
                Зазирни в <b>Місто/Крамницю</b>, щоб розуміти, де продавати,
                крафтити й брати активності.
              </li>
            </ol>
          </div>
        ),
      },
      {
        id: "terms",
        title: "Терміни, які часто плутають",
        searchIndex:
          "терміни наснага xp рівень hp mp atk def червонці клейноди стак stack рідкість квестові привязка bind",
        content: (
          <div className="space-y-3">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <b>Наснага</b> — ліміт дій. Витрачається на мандри/бої/збирання.
              </li>
              <li>
                <b>XP</b> — досвід. Набрав поріг — підняв рівень.
              </li>
              <li>
                <b>Червонці</b> — базова валюта. <b>Клейноди</b> — преміальна/івентна.
              </li>
              <li>
                <b>Stack (стак)</b> — скільки одиниць предмета в одній клітинці.
              </li>
              <li>
                <b>Bind/прив’язка</b> — предмет “закріплений” за персонажем (залежно
                від правил може не продаватися/не передаватися).
              </li>
              <li>
                <b>Квестові предмети</b> — потрібні для конкретного завдання.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "energy",
        title: "Наснага: як працює",
        badge: "ресурс дня",
        searchIndex:
          "наснага енергія ліміт кап 240 300 жива вода благословення мольфара перенос",
        content: (
          <div className="space-y-3">
            <div>
              Наснага видається щодня. Є <b>ліміт (кап)</b>: якщо кап заповнений —
              далі не накопичується.
            </div>

            <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
              <div className="font-semibold text-neutral-100">Преміум-логіка (якщо увімкнено)</div>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-neutral-200">
                <li>
                  <b>Жива вода</b> — піднімає кап наснаги (наприклад, до 300).
                </li>
                <li>
                  <b>Благословення мольфара</b> — переносить невикористану наснагу
                  на наступний день за умови входу в гру.
                </li>
              </ul>
            </div>

            <div className="text-neutral-300">
              Якщо граєш щодня — перенос часто дає більше користі. Якщо заходиш рідко
              і “фармиш ривком” — вищий кап зручніший.
            </div>
          </div>
        ),
      },
      {
        id: "inventory",
        title: "Інвентар і предмети",
        searchIndex:
          "інвентар предмети рідкість вага stack_max is_lootable is_craftable sell_price",
        content: (
          <div className="space-y-3">
            <div>
              На предметі найчастіше важливі: <b>рідкість</b>, <b>стак</b>,{" "}
              <b>вага</b>, а також чи це лут/крафт/квестова річ.
            </div>

            <ul className="list-disc space-y-2 pl-5">
              <li>
                Не продавай “під нуль” базові ресурси: дрібні компоненти часто
                блокують крафт і квести.
              </li>
              <li>
                Якщо квест вимагає предмет — спочатку закрий квест, потім продавай
                зайве.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "loot",
        title: "Де береться лут і ресурси",
        searchIndex:
          "лут ресурси мандри збирання бої крафт дроп is_lootable code",
        content: (
          <div className="space-y-3">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <b>Мандри/збирання</b> → ресурси + дрібний лут + XP.
              </li>
              <li>
                <b>Бої</b> → трофеї/спорядження/рідкісні випадіння (як налаштовано).
              </li>
              <li>
                <b>Крафт</b> → речі, які не випадають або випадають дуже рідко.
              </li>
              <li>
                <b>Квести</b> → нагороди, інколи унікальні предмети.
              </li>
            </ul>

            <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
              <div className="font-semibold text-neutral-100">
                Якщо “квестовий предмет не падає”
              </div>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-neutral-200">
                <li>предмет не позначений як лутовий у дроп-джерелі;</li>
                <li>квест чекає інший <code className="rounded bg-neutral-900 px-1.5 py-0.5">code</code>;</li>
                <li>дроп активується тільки після діалогового тригера.</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        id: "quests",
        title: "Квести: стадії і завершення",
        badge: "NPC",
        searchIndex:
          "квести стадії діалоги npc активні завершені здати завершити предмети умови choices",
        content: (
          <div className="space-y-3">
            <div>
              Квест складається зі <b>стадій</b>. На стадії ти читаєш текст і
              обираєш варіант — він переводить на іншу стадію або ставить умову
              (“принести X / зробити Y”).
            </div>

            <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
              <div className="font-semibold text-neutral-100">
                Як зрозуміти, що квест готовий до здачі
              </div>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-neutral-200">
                <li>є кнопка “Завершити/Здати” або окремий блок завершення;</li>
                <li>стадія позначена як фінальна;</li>
                <li>NPC у місті дає опцію завершення.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
              <div className="font-semibold text-neutral-100">
                Часті проблеми
              </div>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-neutral-200">
                <li>предмет є, але квест “не бачить” → не той code або перевірка кількості;</li>
                <li>предмети розбиті по різних стаках → квест рахує криво;</li>
                <li>після вибору відповіді стадія не змінюється → запит не дійшов або кеш WebApp.</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        id: "events",
        title: "Події та рейтинги",
        searchIndex:
          "події рейтинги нічна варта перун elo пожертви форпост нагороди",
        content: (
          <div className="space-y-3">
            <div>
              У подіях зазвичай є: внесок у прогрес, місце в рейтингу, нагороди
              (валюта/XP/косметика).
            </div>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <b>Нічна варта</b> — рейтинг за внесок (знищене HP, вбивства тощо).
              </li>
              <li>
                <b>Пожертви/Жертва</b> — рейтинг за сумою внесків.
              </li>
              <li>
                <b>Перун-рейтинг (ELO)</b> — PvP-таблиця перемог/поразок.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "money",
        title: "Валюти та економіка",
        searchIndex: "валюти економіка червонці клейноди продаж крамниця",
        content: (
          <div className="space-y-3">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <b>Червонці</b> — основа: продаж луту, нагороди, частина квестів.
              </li>
              <li>
                <b>Клейноди</b> — преміум/івенти, часто йдуть на косметику.
              </li>
            </ul>
            <div className="text-neutral-300">
              Якщо не впевнений, що продавати — починай із дешевого луту, який не
              виглядає як ресурс/компонент.
            </div>
          </div>
        ),
      },
      {
        id: "premium",
        title: "Преміум і косметика",
        badge: "рамки / ім’я",
        searchIndex:
          "преміум косметика рамки frame стиль імені name крамниця",
        content: (
          <div className="space-y-3">
            <div>
              Косметика змінює вигляд (рамка аватарки, стиль/колір імені) і має
              підтягуватись у профілі, рейтингах, списках.
            </div>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <b>Рамки</b> — оформлення аватарки.
              </li>
              <li>
                <b>Стиль імені</b> — колір/градієнт ніка.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: "faq",
        title: "FAQ: відповіді на часті питання",
        badge: "FAQ",
        searchIndex:
          "faq наснага не оновилась не заповнилась квест не рухається не падає предмет аватар рамка кеш telegram",
        content: (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="font-semibold text-neutral-100">
                Наснага не оновилась або не стала повною
              </div>
              <div className="text-neutral-200">
                Перевір, чи вже минув добовий рубіж оновлення. Якщо кап піднявся
                (наприклад преміум), але “дозаряду” немає — це може бути окрема
                логіка, яку ще не доробили.
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-neutral-100">
                Квестовий предмет не падає
              </div>
              <div className="text-neutral-200">
                Найчастіше це не той <code className="rounded bg-neutral-900 px-1.5 py-0.5">code</code>,
                або предмет не підключений до дропу, або дроп вмикається після діалогу.
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-neutral-100">
                Після вибору відповіді квест “завис”
              </div>
              <div className="text-neutral-200">
                Закрий WebApp і відкрий заново. Якщо не допомогло — запит не пройшов
                або сервер відхилив дію (кеш/розсинхрон стадії).
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-neutral-100">
                Не видно рамку/колір імені в рейтингах
              </div>
              <div className="text-neutral-200">
                Це зазвичай різні джерела даних (в профілі є, в рейтингу — урізаний набір).
                Перезайди в гру; далі вже питання до уніфікації бекенду/DTO.
              </div>
            </div>
          </div>
        ),
      },
    ],
    []
  );

  // ініціалізація стану “відкрито/закрито”
  useEffect(() => {
    setOpenMap((prev) => {
      if (Object.keys(prev).length) return prev;
      const init: Record<string, boolean> = {};
      for (const s of sections) init[s.id] = s.id === "warning";
      return init;
    });
  }, [sections]);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    let list = sections;

    if (onlyFaq) list = list.filter((s) => s.id === "faq" || s.id === "warning");

    if (!normalizedQuery) return list;

    return list.filter((s) => {
      const hay = (s.title + " " + s.searchIndex).toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [sections, normalizedQuery, onlyFaq]);

  function setAll(open: boolean) {
    const next: Record<string, boolean> = {};
    for (const s of sections) next[s.id] = open;
    setOpenMap(next);
  }

  function notReady(label: string) {
    setToast(`“${label}” ще не підключено або працює не всюди.`);
  }

  function go(path: string, label: string) {
    // якщо роутів ще немає — не ламаємо UX, показуємо повідомлення
    // можеш замінити це на реальні шляхи у своєму проєкті
    try {
      router.push(path);
    } catch {
      notReady(label);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
      {toast ? <Toast text={toast} onClose={() => setToast(null)} /> : null}

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-900 bg-neutral-950">
          <BookOpen className="h-5 w-5 text-neutral-200" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xl font-bold text-neutral-100">
            Довідка та FAQ
          </div>
          <div className="text-sm text-neutral-400">
            Пошук по розділах, випадаючі меню, швидкі кнопки.
          </div>
        </div>
      </div>

      {/* Швидкі кнопки (частина може бути не підключена) */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => notReady("Профіль")}
          className="flex items-center justify-between rounded-2xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-neutral-200"
        >
          Профіль <ExternalLink className="h-4 w-4 text-neutral-400" />
        </button>
        <button
          onClick={() => notReady("Квести")}
          className="flex items-center justify-between rounded-2xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-neutral-200"
        >
          Квести <ExternalLink className="h-4 w-4 text-neutral-400" />
        </button>
        <button
          onClick={() => notReady("Інвентар")}
          className="flex items-center justify-between rounded-2xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-neutral-200"
        >
          Інвентар <ExternalLink className="h-4 w-4 text-neutral-400" />
        </button>
        <button
          onClick={() => notReady("Місто")}
          className="flex items-center justify-between rounded-2xl border border-neutral-900 bg-neutral-950 px-4 py-3 text-sm text-neutral-200"
        >
          Місто <ExternalLink className="h-4 w-4 text-neutral-400" />
        </button>
      </div>

      {/* Пошук + керування */}
      <div className="mb-4 rounded-2xl border border-neutral-900 bg-neutral-950 p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-neutral-900 bg-neutral-900/40 px-3 py-2">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук по довідці (напр. “наснага”, “квест”, “рамка”)"
            className="w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="rounded-xl p-1 text-neutral-300 hover:bg-neutral-800"
              title="Очистити"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setAll(true)}
            className="rounded-2xl border border-neutral-900 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-900"
          >
            Розгорнути все
          </button>
          <button
            onClick={() => setAll(false)}
            className="rounded-2xl border border-neutral-900 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-900"
          >
            Згорнути все
          </button>
          <button
            onClick={() => setOnlyFaq((v) => !v)}
            className={cn(
              "rounded-2xl border px-3 py-2 text-xs hover:bg-neutral-900",
              onlyFaq
                ? "border-amber-700/60 bg-amber-950/20 text-amber-200"
                : "border-neutral-900 bg-neutral-900/40 text-neutral-200"
            )}
          >
            {onlyFaq ? "Показано: FAQ" : "Показати лише FAQ"}
          </button>

          <button
            onClick={() => {
              setOnlyFaq(false);
              setQuery("");
              setToast("Фільтри скинуті.");
            }}
            className="rounded-2xl border border-neutral-900 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-900"
          >
            Скинути фільтри
          </button>
        </div>
      </div>

      {/* Розділи */}
      <div className="space-y-3">
        {visibleSections.map((s) => (
          <AccordionItem
            key={s.id}
            title={s.title}
            rightBadge={s.badge}
            open={!!openMap[s.id]}
            onToggle={() =>
              setOpenMap((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
            }
          >
            {s.content}
          </AccordionItem>
        ))}

        {visibleSections.length === 0 ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4 text-sm text-neutral-300">
            Нічого не знайдено за запитом <b>{query}</b>.
          </div>
        ) : null}
      </div>

      {/* Низ сторінки */}
      <div className="mt-6 rounded-2xl border border-neutral-900 bg-neutral-950 p-4 text-sm text-neutral-300">
        Якщо хочеш — я підготую “коротку довідку” (1 екран) для новачків і окремий
        “розширений” режим для досвідчених.
      </div>
    </div>
  );
}
