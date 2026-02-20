"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getJSON } from "@/lib/api";
import { resolveAreaBg } from "../areaBackgrounds";

// ─────────────────────────────────────────────
// Типи під бекенд
// ─────────────────────────────────────────────

type MobItem = {
  id: number;
  name: string;
  level: number;
  base_hp: number;
  base_attack: number;
  area_key: string;
  is_training?: boolean;
};

type MobListResponse = {
  area_key: string;
  area_name: string;
  items: MobItem[];
};

export default function ClientView({ areaKey }: { areaKey: string }) {
  const [data, setData] = useState<MobListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await getJSON<MobListResponse>(`/api/areas/${areaKey}/mobs`);
        setData(resp);
      } catch (e: any) {
        setError(e?.message || "Не вдалося завантажити мобів.");
      } finally {
        setLoading(false);
      }
    })();
  }, [areaKey]);

  if (loading) {
    return (
      <Shell areaKey={areaKey}>
        <div className="card text-sm">Завантаження околиці…</div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell areaKey={areaKey}>
        <div className="card text-sm text-red-400">
          Помилка: {error ?? "невідома"}
        </div>
        <BackToCity />
      </Shell>
    );
  }

  const areaName = data.area_name || "Невідома околиця";

  return (
    <Shell areaKey={data.area_key}>
      <motion.section
        className="relative mb-4 rounded-2xl bg-slate-950/85 border border-slate-700/60 px-4 py-4 shadow-lg"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <span>📍</span>
          <span>{areaName}</span>
        </h1>
        <p className="text-sm text-slate-200">
          Оберіть супротивника для бою. Чим вищий рівень — тим небезпечніший ворог
          та кращий трофей.
        </p>
      </motion.section>

      <motion.section
        className="grid grid-cols-1 gap-2 mb-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.04 } },
        }}
      >
        {data.items.length === 0 && (
          <div className="card text-sm text-slate-300">У цій околиці ворогів немає.</div>
        )}

        {data.items.map((mob) => (
          <MobCard key={mob.id} mob={mob} />
        ))}
      </motion.section>

      <BackToCity />
    </Shell>
  );
}

// ─────────────────────────────────────────────
// Обгортка з відео-фоном (+ фолбек, без next/image)
// ─────────────────────────────────────────────

function Shell({ children, areaKey }: { children: ReactNode; areaKey: string }) {
  const bg = useMemo(() => resolveAreaBg(areaKey), [areaKey]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoOk, setVideoOk] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setVideoOk(true);
    setReady(false);
  }, [bg.video]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Telegram/webview інколи не стартує одразу навіть з muted+autoplay.
    // Пробуємо примусово.
    const p = v.play();
    if (p && typeof (p as any).catch === "function") {
      (p as any).catch(() => {
        // autoplay заблокований — залишимо постер/фолбек
      });
    }
  }, [bg.video]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-50 flex justify-center px-4 py-6">
      <div className="pointer-events-none absolute inset-0">
        {videoOk ? (
          <video
            ref={videoRef}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              ready ? "opacity-45" : "opacity-0"
            }`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={bg.poster}
            onLoadedData={() => setReady(true)}
            onError={() => {
              setVideoOk(false);
              setReady(false);
            }}
            aria-hidden="true"
          >
            <source src={bg.video} type="video/mp4" />
          </video>
        ) : null}

        {/* Фолбек, якщо відео ще не готове або впало */}
        {(!ready || !videoOk) && bg.poster ? (
          <img
            src={bg.poster}
            alt=""
            className="h-full w-full object-cover opacity-45"
            draggable={false}
          />
        ) : null}

        {/* Завжди зверху затемнення */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/70 to-black/90" />
      </div>

      <div className="w-full max-w-xl relative z-10">{children}</div>
    </main>
  );
}

// ─────────────────────────────────────────────
// Карточка моба
// ─────────────────────────────────────────────

function MobCard({ mob }: { mob: MobItem }) {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      onClick={() => router.push(`/battle/${mob.id}`)}
      className="group w-full text-left rounded-2xl border border-slate-700/70 bg-slate-900/85 px-4 py-3 shadow-md hover:border-emerald-400/80 hover:bg-slate-900/95 transition"
      variants={{
        hidden: { opacity: 0, y: 6, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1 },
      }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-medium text-sm sm:text-base">
            {mob.name} · Lv {mob.level}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            HP ~ {mob.base_hp} · ATK ~ {mob.base_attack}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/60 text-emerald-200">
          Бій
        </span>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────
// Назад у місто
// ─────────────────────────────────────────────

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