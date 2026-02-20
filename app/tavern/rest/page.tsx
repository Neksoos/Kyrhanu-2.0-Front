"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { resolveTgId } from "@/lib/tg";
import { getJSON, postJSON } from "@/lib/api";
import DailyBonusToast, {
  DailyBonusPayload,
} from "../../_components/DailyBonusToast";

type ProfileResponse = {
  ok: boolean;
  player: {
    chervontsi: number;
    hp_max: number;
    mp_max: number;
    // інші поля нам тут не критичні
    [key: string]: any;
  };
};

type TavernRestResponse = {
  ok: boolean;
  message?: string;
  chervontsi: number; // оновлений баланс після відпочинку

  // поля від daily_login (бекенд ми вже допиляли)
  daily_applied?: boolean;
  daily_xp?: number;
  daily_chervontsi?: number;
  daily_kleynod?: boolean;
};

const REST_PRICE = 50; // має співпадати з REST_PRICE у routers/tavern.py

export default function TavernRestPage() {
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfileResponse["player"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restLoading, setRestLoading] = useState(false);

  const [dailyBonus, setDailyBonus] = useState<DailyBonusPayload | null>(null);

  // завантаження профілю
  useEffect(() => {
    const id = resolveTgId();
    if (!id) {
      setError(
        "Не вдалося визначити ваш Telegram ID. Відкрийте мініап із чату бота."
      );
      setLoading(false);
      return;
    }
    setTgId(id);

    (async () => {
      try {
        const p = await getJSON<ProfileResponse>(`/api/profile?tg_id=${id}`);
        if (!p.ok) throw new Error("Помилка профілю");
        setProfile(p.player);
      } catch (e: unknown) {
        const msg =
          e instanceof Error
            ? e.message
            : "Невідома помилка завантаження профілю";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRest = async () => {
    if (!tgId) return;
    setRestLoading(true);
    setError(null);
    setDailyBonus(null);

    try {
      const resp = await postJSON<TavernRestResponse>(`/api/tavern/rest`, {
        tg_id: tgId,
      });

      if (!resp.ok) {
        throw new Error(resp.message || "Не вдалося відпочити.");
      }

      // базове повідомлення про відпочинок
      setResult(resp.message || "Ти відпочив і відновив сили!");

      // оновлюємо баланс червонців у локальному стейті
      setProfile((prev) =>
        prev ? { ...prev, chervontsi: resp.chervontsi } : prev
      );

      // кидаємо payload для тосту про щоденний бонус
      setDailyBonus({
        daily_applied: resp.daily_applied,
        daily_xp: resp.daily_xp,
        daily_chervontsi: resp.daily_chervontsi,
        daily_kleynod: resp.daily_kleynod,
      });
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e instanceof Error ? e.message : "Помилка виконання відпочинку.";
      setError(msg);
    } finally {
      setRestLoading(false);
    }
  };

  const notEnoughCoins = (profile?.chervontsi ?? 0) < REST_PRICE;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl relative">
        <motion.div
          className="mb-4 flex items-center justify-between"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <span>🛏️</span> <span>Відпочинок</span>
          </h1>
          <button
            onClick={() => router.push("/tavern")}
            className="text-xs text-slate-400 hover:text-amber-300"
          >
            ← Назад
          </button>
        </motion.div>

        {loading && <p>Завантаження…</p>}

        {error && !loading && (
          <p className="text-red-400 bg-red-950/40 border border-red-800/60 px-3 py-2 rounded-xl text-sm">
            {error}
          </p>
        )}

        {profile && !result && !loading && (
          <motion.div
            className="rounded-2xl bg-slate-900/80 border border-slate-700/70 p-4 text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-slate-300 mb-2">
              Повний відпочинок у корчмі відновлює твої{" "}
              <span className="text-amber-300 font-semibold">HP</span> та{" "}
              <span className="text-cyan-300 font-semibold">MP</span>.
            </p>

            <p className="text-xs text-slate-400 mb-3">
              Вартість:{" "}
              <span className="text-amber-300 font-semibold">
                {REST_PRICE} червонців
              </span>
              . Зараз у тебе{" "}
              <span className="font-semibold">{profile.chervontsi}</span>.
            </p>

            <motion.button
              onClick={onRest}
              disabled={restLoading || notEnoughCoins}
              className={`w-full rounded-xl px-4 py-2 text-sm font-semibold shadow-md transition ${
                restLoading || notEnoughCoins
                  ? "bg-slate-700/70 text-slate-400 cursor-not-allowed"
                  : "bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95"
              }`}
            >
              {restLoading ? "Відпочиваєш…" : "Відпочити"}
            </motion.button>

            {notEnoughCoins && (
              <p className="mt-2 text-xs text-red-400">
                Недостатньо червонців.
              </p>
            )}
          </motion.div>
        )}

        {result && (
          <motion.div
            className="rounded-2xl bg-emerald-900/40 border border-emerald-600/50 p-4 text-sm text-emerald-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {result}
            <div className="mt-3 flex flex-col gap-1 text-xs">
              <span>
                Поточний баланс червонців:{" "}
                <span className="font-semibold">
                  {profile?.chervontsi ?? "—"}
                </span>
              </span>
              <button
                onClick={() => router.push("/tavern")}
                className="mt-1 text-emerald-300 underline"
              >
                ← Повернутися до корчми
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Тост зі щоденним бонусом за вхід + активність */}
      <DailyBonusToast
        payload={dailyBonus}
        onClose={() => setDailyBonus(null)}
      />
    </main>
  );
}