"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const MONO_URL = "https://send.monobank.ua/jar/2uKXz7bzqk";

const APP_VERSION =
  (process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.NEXT_PUBLIC_VERSION ||
    "dev").trim();

const PATRONS_SEEN_KEY = `patrons_seen_version:${APP_VERSION}`;

type Tier = {
  title: string;
  subtitle: string;
  names: string[];
  buttonLabel?: string;
  recommended?: number;
};

type QuickDonation = {
  title: string;
  subtitle: string;
};

export default function PatronsPage() {
  const router = useRouter();
  const [fromBoot, setFromBoot] = useState(false);

  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      setFromBoot(qs.get("from") === "boot");
    } catch {
      setFromBoot(false);
    }
  }, []);

  const tiers: Tier[] = useMemo(
    () => [
      {
        title: "⭐ Золоті меценати",
        subtitle: "найбільша підтримка",
        names: ["Вадим Михальчук — 1000 ₴", "Вадим Сєрбін — 1000 ₴"],
        buttonLabel: "⭐ Стати Золотим меценатом",
        recommended: 1000,
      },
      {
        title: "✨ Срібні меценати",
        subtitle: "дякуємо за вклад",
        names: ["(тут будуть імена)"],
        buttonLabel: "✨ Стати Срібним меценатом",
        recommended: 500,
      },
      {
        title: "🟤 Бронзові меценати",
        subtitle: "кожна підтримка важлива",
        names: [
          "Невідомий меценат — 100 ₴",
          "Невідомий меценат — 158 ₴",
          "Невідомий меценат — 100 ₴",
          "Олексій Харченко — 150 ₴",
        ],
        buttonLabel: "🟤 Стати Бронзовим меценатом",
        recommended: 100,
      },
      {
        title: "☕ Подяка адміну",
        subtitle: "маленька підтримка без бонусів у грі",
        names: ["Андріян-Остап Кончевич — 50 ₴", "Руслан Пальчук — 50 ₴"],
      },
    ],
    []
  );

  const quickDonations: QuickDonation[] = useMemo(
    () => [
      {
        title: "🙏 Просто подяка — 20 ₴",
        subtitle: "Відкриється Monobank jar (суму введеш вручну)",
      },
      {
        title: "☕ Кава — 30 ₴",
        subtitle: "Відкриється Monobank jar (суму введеш вручну)",
      },
      {
        title: "☕☕ Велика кава — 50 ₴",
        subtitle: "Відкриється Monobank jar (суму введеш вручну)",
      },
      {
        title: "🍪 Кава + печиво — 70 ₴",
        subtitle: "Відкриється Monobank jar (суму введеш вручну)",
      },
    ],
    []
  );

  const markSeenAndClose = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(PATRONS_SEEN_KEY, String(Date.now()));
    }
    router.replace(fromBoot ? "/city" : "/city");
  };

  const openMono = () => {
    window.open(MONO_URL, "_blank", "noopener,noreferrer");
  };

  const TierCard = ({ t }: { t: Tier }) => {
    const isCoffee = t.title.includes("Подяка адміну");

    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="font-semibold">{t.title}</div>
        <div className="text-xs opacity-75">{t.subtitle}</div>

        <div className="mt-2 flex flex-wrap gap-2">
          {t.names.map((n) => (
            <span
              key={n}
              className="text-xs px-2.5 py-1 rounded-xl bg-white/10 border border-white/10"
            >
              {n}
            </span>
          ))}
        </div>

        {!isCoffee && t.buttonLabel && (
          <motion.button
            onClick={openMono}
            className="
              mt-4 w-full rounded-2xl px-5 py-4 font-semibold
              bg-gradient-to-r from-emerald-400/90 to-cyan-400/90
              text-black
              hover:brightness-110 transition
            "
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-base">{t.buttonLabel}</div>
            {typeof t.recommended === "number" && (
              <div className="text-xs opacity-80 mt-1">
                Рекомендовано: {t.recommended} ₴ (суму введеш у jar вручну)
              </div>
            )}
          </motion.button>
        )}

        {isCoffee && (
          <div className="mt-4 grid gap-2">
            {quickDonations.map((q) => (
              <motion.button
                key={q.title}
                onClick={openMono}
                className="
                  w-full rounded-2xl px-4 py-3 text-left
                  border border-white/15 bg-white/10
                  hover:bg-white/20 transition
                "
                whileTap={{ scale: 0.98 }}
              >
                <div className="font-semibold">{q.title}</div>
                <div className="text-xs opacity-70">{q.subtitle}</div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen px-4 py-6 text-slate-50 bg-black flex justify-center">
      <div className="w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-xl"
        >
          {/* TOP */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-3xl border border-white/10 bg-black/30 overflow-hidden shadow-lg shadow-black/40"
          >
            <div className="relative">
              <div className="h-20 w-full bg-[#005BBB]" />
              <div className="h-20 w-full bg-[#FFD500]" />

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.25),transparent_60%)]" />

              <div className="absolute left-4 top-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 backdrop-blur-md">
                  <span className="text-sm">🇺🇦</span>
                  <span className="text-[11px] font-semibold text-white/90">
                    Підтримка важлива
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                Важливе повідомлення
              </div>

              <div className="mt-2 text-base md:text-lg font-extrabold leading-snug">
                Зроблено ветераном-інвалідом{" "}
                <span className="text-white/95">
                  російсько-української війни
                </span>
              </div>

              <div className="mt-2 text-xs md:text-sm text-white/75">
                Якщо гра тобі подобається — підтримай розвиток. Це напряму
                допомагає робити оновлення частіше.
              </div>
            </div>
          </motion.div>

          <div className="text-lg font-semibold">💖 Підтримати гру</div>
          <div className="text-xs opacity-80 mt-1">
            Дякуємо меценатам — завдяки вам гра розвивається швидше.
          </div>

          <div className="mt-4 grid gap-3">
            {tiers.map((t) => (
              <TierCard key={t.title} t={t} />
            ))}
          </div>

          <div className="mt-5 grid gap-2">
            <motion.button
              onClick={openMono}
              className="
                w-full rounded-2xl px-5 py-4 font-semibold
                bg-gradient-to-r from-emerald-400/90 to-cyan-400/90
                text-black
                hover:brightness-110 transition
              "
              whileTap={{ scale: 0.98 }}
            >
              🫙 Відкрити Monobank jar
            </motion.button>

            <motion.button
              onClick={markSeenAndClose}
              className="
                w-full rounded-2xl px-5 py-3 font-semibold
                border border-white/15 bg-white/10
                hover:bg-white/20 transition
              "
              whileTap={{ scale: 0.98 }}
            >
              Продовжити
            </motion.button>

            <div className="text-[11px] opacity-60 text-center mt-1">
              Показується 1 раз на версію ({APP_VERSION})
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}