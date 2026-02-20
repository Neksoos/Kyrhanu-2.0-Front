"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { postJSON } from "@/lib/api";
import { resolveTgId } from "@/lib/tg";

export default function CreateZastavaPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [payWith, setPayWith] = useState<"chervontsi" | "kleynody">("chervontsi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);

    const tgId = resolveTgId();
    if (!tgId) {
      setError("Не вдалося визначити ваш Telegram ID. Запустіть гру з чату бота.");
      return;
    }

    if (name.trim().length < 3) {
      setError("Назва має містити щонайменше 3 символи.");
      return;
    }

    try {
      setLoading(true);

      const resp: { ok: boolean; error?: string } = await postJSON(
        "/api/zastavy/create",
        {
          tg_id: tgId,
          name: name.trim(),
          pay_with: payWith,
        }
      );

      if (!resp.ok) {
        setError(resp.error || "Не вдалося створити заставу.");
        return;
      }

      router.replace("/zastavy");
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl relative">

        <motion.div
          className="pointer-events-none absolute inset-0 blur-3xl opacity-30
            bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,0.28),transparent_55%),
                radial-gradient(circle_at_90%_100%,rgba(56,189,248,0.28),transparent_60%)]"
          animate={{ opacity: [0.2, 0.35, 0.25], scale: [1, 1.03, 1] }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
        />

        <div className="relative">

          <button
            className="text-sm text-slate-400 hover:text-amber-300 mb-4"
            onClick={() => router.push("/zastavy")}
          >
            ← Назад
          </button>

          <motion.section
            className="rounded-2xl bg-slate-900/85 border border-slate-700/70 px-4 py-4 shadow-lg"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-lg font-semibold mb-3">Створити заставу</h1>

            <p className="text-xs text-slate-300 mb-3">
              Вартість створення: <b>1000 червонців</b> або <b>10 клейнодів</b>.
            </p>

            {/* Назва */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Назва застави</label>
              <input
                className="w-full rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                placeholder="Наприклад: Іршавські вершники"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Оплата */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Оплата</label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPayWith("chervontsi")}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-medium transition",
                    payWith === "chervontsi"
                      ? "border-emerald-400 bg-emerald-900/30 text-emerald-200"
                      : "border-slate-700 bg-slate-900/60 text-slate-300",
                  ].join(" ")}
                >
                  1000 червонців
                </button>

                <button
                  type="button"
                  onClick={() => setPayWith("kleynody")}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-medium transition",
                    payWith === "kleynody"
                      ? "border-sky-400 bg-sky-900/30 text-sky-200"
                      : "border-slate-700 bg-slate-900/60 text-slate-300",
                  ].join(" ")}
                >
                  10 клейнодів
                </button>
              </div>
            </div>

            {/* Помилка */}
            {error && (
              <div className="text-xs text-red-400 mb-3">{error}</div>
            )}

            {/* Кнопка */}
            <motion.button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 px-4 py-2.5 text-sm font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-50"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? "Створюємо…" : "Створити заставу"}
            </motion.button>
          </motion.section>
        </div>
      </div>
    </main>
  );
}