"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Share2, RefreshCcw } from "lucide-react";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type ReferralStats = {
  invited: number;
  paid: number;
};

type ReferralResponse = {
  ok: boolean;
  username: string;
  link: string;
  stats: ReferralStats;
};

type BindResponse = {
  ok: boolean;
  bound: boolean;
  reason?: string;
};

function getTgContext() {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  const initData: string = tg?.initData || "";

  // start_param доступний і як initDataUnsafe.start_param, і як tgWebAppStartParam у URL
  const startParamFromUnsafe: string | undefined = tg?.initDataUnsafe?.start_param;
  const startParamFromUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tgWebAppStartParam") || undefined
      : undefined;

  const startParam = startParamFromUnsafe || startParamFromUrl;

  return { tg, initData, startParam };
}

async function apiGetJSON<T>(url: string, initData: string): Promise<T> {
  const r = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-Init-Data": initData,
    },
    credentials: "include",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

async function apiPostJSON<T>(url: string, body: any, initData: string): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Init-Data": initData,
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

export default function ReferralsPage() {
  const [{ tg, initData, startParam }] = useState(() => getTgContext());

  const [data, setData] = useState<ReferralResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = data?.link || "";

  const shareText = useMemo(
    () => "Залітай у гру за моїм запрошенням:",
    []
  );

  // ───────────────── init: bind (якщо є startParam) + load ─────────────────
  useEffect(() => {
    if (!initData) {
      setError("Відкрий гру з Telegram (Mini App), інакше я не бачу initData.");
      setLoading(false);
      return;
    }

    const onceKey = "ref_bind_done_v1";
    const alreadyBound =
      typeof window !== "undefined" ? sessionStorage.getItem(onceKey) === "1" : false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) якщо зайшли по реф-лінку — пробуємо прив’язати інвайтера (1 раз за сесію)
        if (startParam && !alreadyBound) {
          try {
            await apiPostJSON<BindResponse>(
              "/api/referrals/bind",
              { payload: startParam },
              initData
            );
          } finally {
            // навіть якщо bind впав — не спамимо повторними bind у цій сесії
            sessionStorage.setItem(onceKey, "1");
          }
        }

        // 2) грузимо лінк + статистику
        const resp = await apiGetJSON<ReferralResponse>("/api/referrals", initData);
        if (!resp.ok) throw new Error("Сервер повернув ok=false");
        setData(resp);
      } catch (e: any) {
        setError(e?.message || "Помилка запиту");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reload() {
    if (!initData) return;
    try {
      setLoading(true);
      setError(null);
      const resp = await apiGetJSON<ReferralResponse>("/api/referrals", initData);
      if (!resp.ok) throw new Error("Сервер повернув ok=false");
      setData(resp);
    } catch (e: any) {
      setError(e?.message || "Помилка запиту");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
    if (!link) return;

    // Telegram share UI (найочікуваніша поведінка для кнопки “Поділитися”)
    const shareUrl =
      `https://t.me/share/url?url=${encodeURIComponent(link)}` +
      `&text=${encodeURIComponent(shareText)}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
      return;
    }

    // Web Share API (якщо відкрили не з Telegram)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Прокляті Кургани",
          text: shareText,
          url: link,
        });
        return;
      } catch {
        // fallthrough
      }
    }

    await handleCopy();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h1 className="text-2xl font-bold tracking-wide text-center mb-2">
          Реферальна варта
        </h1>
        <p className="text-sm text-slate-300 text-center mb-6">
          Запрошуй побратимів у Прокляті Кургани та отримуй нагороди.
        </p>

        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 shadow-lg mb-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-sm font-semibold text-slate-300">
              Твоє запрошення
            </span>
            <button
              onClick={reload}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-600 bg-slate-800/80 active:scale-95"
            >
              <RefreshCcw className="w-3 h-3" />
              Оновити
            </button>
          </div>

          {loading && <div className="text-sm text-slate-400">Завантаження…</div>}

          {error && !loading && (
            <div className="text-sm text-red-400 break-words">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              <div className="text-xs text-slate-400 mb-1">Посилання для друзів:</div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-slate-950/70 rounded-xl px-3 py-2 text-xs break-all border border-slate-700/70">
                  {link}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleCopy}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Скопійовано" : "Скопіювати"}
                </button>

                <button
                  onClick={handleShare}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 text-slate-100 text-sm font-medium active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  Поділитися
                </button>
              </div>

              <div className="border-t border-slate-800 pt-3 mt-2 text-sm flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Запрошено</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {data.stats.invited}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Нагород зараховано</div>
                  <div className="text-lg font-bold text-amber-400">
                    {data.stats.paid}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center px-2">
          Умови нагород — на бекенді (рівень, квести, події тощо).
        </p>
      </motion.div>
    </div>
  );
}