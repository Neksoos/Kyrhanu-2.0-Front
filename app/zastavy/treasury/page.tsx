"use client";

import React, { useEffect, useState } from "react";
import { getJSON, postJSON } from "@/lib/api";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Treasury = {
  chervontsi: number;
  kleynody: number;
  updated_at?: string | null;
};

type TreasuryStateResponse = {
  ok: boolean;
  error?: string | null;
  treasury?: Treasury;
};

type TreasuryLogItem = {
  id: number;
  zastava_id: number;
  tg_id: number;
  delta_chervontsi: number;
  delta_kleynody: number;
  action: string;
  source: string;
  comment?: string | null;
  created_at: string;
};

type TreasuryLogResponse = {
  ok: boolean;
  error?: string | null;
  items: TreasuryLogItem[];
};

type Currency = "chervontsi" | "kleynody";

export default function ZastavaTreasuryPage() {
  const [tgId, setTgId] = useState<number | null>(null);

  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>("chervontsi");
  const [comment, setComment] = useState<string>("");

  const [opLoading, setOpLoading] = useState<null | "deposit" | "withdraw">(null);

  const [logItems, setLogItems] = useState<TreasuryLogItem[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  // ─────────────────────────────
  //  Ініціалізація tg_id з Telegram WebApp
  // ─────────────────────────────
  useEffect(() => {
    try {
      const w = window as any;
      const tid =
        w.Telegram?.WebApp?.initDataUnsafe?.user?.id ??
        w.Telegram?.WebApp?.initDataUnsafe?.user_id;

      if (tid) {
        setTgId(Number(tid));
      } else {
        setError("Не вдалося отримати tg_id. Відкрий мініап з Telegram.");
      }
    } catch (e) {
      setError("Telegram WebApp недоступний.");
    }
  }, []);

  // ─────────────────────────────
  //  Завантаження казни + лога
  // ─────────────────────────────
  useEffect(() => {
    if (!tgId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const tre: TreasuryStateResponse = await getJSON(
          `/api/zastavy/treasury?tg_id=${tgId}`
        );
        if (!tre.ok) {
          setError(tre.error ?? "Помилка читання казни.");
        } else if (tre.treasury) {
          setTreasury(tre.treasury);
        } else {
          setTreasury({ chervontsi: 0, kleynody: 0, updated_at: null });
        }

        setLogLoading(true);
        const log: TreasuryLogResponse = await getJSON(
          `/api/zastavy/treasury/log?tg_id=${tgId}&limit=50&offset=0`
        );
        if (log.ok) {
          setLogItems(log.items);
        }
      } catch (e: any) {
        setError(e?.message ?? "Помилка мережі.");
      } finally {
        setLoading(false);
        setLogLoading(false);
      }
    };

    load();
  }, [tgId]);

  const parsedAmount = Number(amount.replace(",", "."));

  const disabled =
    !tgId || !treasury || !amount || isNaN(parsedAmount) || parsedAmount <= 0;

  // ─────────────────────────────
  //  Хелпер перезавантажити казну+лог
  // ─────────────────────────────
  const refreshTreasury = async (tid: number) => {
    try {
      const tre: TreasuryStateResponse = await getJSON(
        `/api/zastavy/treasury?tg_id=${tid}`
      );
      if (tre.ok && tre.treasury) {
        setTreasury(tre.treasury);
      }

      const log: TreasuryLogResponse = await getJSON(
        `/api/zastavy/treasury/log?tg_id=${tid}&limit=50&offset=0`
      );
      if (log.ok) {
        setLogItems(log.items);
      }
    } catch {
      /* ігноруємо, помилки вже будуть із основної операції */
    }
  };

  // ─────────────────────────────
  //  Депозит у казну
  // ─────────────────────────────
  const handleDeposit = async () => {
    if (!tgId || disabled) return;

    setOpLoading("deposit");
    setError(null);
    try {
      const payload = {
        tg_id: tgId,
        amount: Math.floor(parsedAmount),
        currency,
        comment: comment || null,
      };

      const resp: TreasuryStateResponse = await postJSON(
        "/api/zastavy/treasury/deposit",
        payload
      );

      if (!resp.ok) {
        setError(resp.error ?? "Не вдалося внести в казну.");
      } else if (resp.treasury) {
        setTreasury(resp.treasury);
        setAmount("");
        await refreshTreasury(tgId);
      }
    } catch (e: any) {
      setError(e?.message ?? "Помилка мережі.");
    } finally {
      setOpLoading(null);
    }
  };

  // ─────────────────────────────
  //  Зняття з казни
  // ─────────────────────────────
  const handleWithdraw = async () => {
    if (!tgId || disabled) return;

    setOpLoading("withdraw");
    setError(null);
    try {
      const payload = {
        tg_id: tgId,
        amount: Math.floor(parsedAmount),
        currency,
        comment: comment || null,
      };

      const resp: TreasuryStateResponse = await postJSON(
        "/api/zastavy/treasury/withdraw",
        payload
      );

      if (!resp.ok) {
        setError(resp.error ?? "Не вдалося зняти з казни.");
      } else if (resp.treasury) {
        setTreasury(resp.treasury);
        setAmount("");
        await refreshTreasury(tgId);
      }
    } catch (e: any) {
      setError(e?.message ?? "Помилка мережі.");
    } finally {
      setOpLoading(null);
    }
  };

  // ─────────────────────────────
  //  Рендер
  // ─────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl relative">
        {/* легке сяйво */}
        <div className="pointer-events-none absolute inset-0 blur-3xl opacity-25 bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.28),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.28),transparent_60%)]" />

        <div className="relative flex flex-col gap-4">
          {/* Хедер */}
          <header className="flex items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 border border-slate-700/70 px-3 py-1 mb-1">
                <span className="text-base">🏦</span>
                <span className="text-xs tracking-wide text-slate-300">
                  Казна застави
                </span>
              </div>
              <h1 className="text-xl font-semibold text-slate-50 leading-snug">
                Спільний скарб твоєї застави
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Внось червонці та клейноди, веди прозору історію операцій.
              </p>
            </div>
            {tgId && (
              <span className="rounded-full bg-slate-900/70 border border-slate-700/70 px-3 py-1 text-[11px] text-slate-400">
                tg_id: <span className="font-mono">{tgId}</span>
              </span>
            )}
          </header>

          {loading && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300 animate-pulse">
              Завантаження казни…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl bg-red-950/50 border border-red-500/70 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && treasury && (
            <section className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 px-4 py-4 shadow-[0_0_28px_rgba(245,158,11,0.18)] flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-amber-300 mb-1">
                    Поточний баланс застави
                  </h2>
                  <p className="text-xs text-slate-400">
                    Увесь скарб, який належить цій заставі.
                  </p>
                </div>
                {treasury.updated_at && (
                  <span className="text-[10px] text-slate-400 text-right">
                    Оновлено:{" "}
                    {new Date(treasury.updated_at).toLocaleString("uk-UA", {
                      hour12: false,
                    })}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-slate-300">Червонці</div>
                  <div className="text-2xl font-semibold text-amber-300">
                    {treasury.chervontsi.toLocaleString("uk-UA")}
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-700/60" />
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-slate-300">Клейноди</div>
                  <div className="text-2xl font-semibold text-sky-300">
                    {treasury.kleynody.toLocaleString("uk-UA")}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Форма операцій */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 flex flex-col gap-3 shadow-lg shadow-black/50">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-200">
                Операція з казною
              </h2>
              <span className="text-[10px] text-slate-500">
                * зняття дозволене лише гетьману
              </span>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="flex-1">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Сума
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/70 transition"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Наприклад, 100"
                />
              </div>
              <div className="sm:w-40 w-full">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Валюта
                </label>
                <select
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/70 transition"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  <option value="chervontsi">Червонці</option>
                  <option value="kleynody">Клейноди</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Коментар (необов’язково)
              </label>
              <textarea
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/70 min-h-[64px] transition"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="За що саме внесок / видача (рейд, подія, штраф тощо)."
              />
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
              <button
                onClick={handleDeposit}
                disabled={disabled || opLoading !== null}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:bg-emerald-900 disabled:text-slate-500 px-3 py-2.5 text-sm font-semibold shadow-md shadow-emerald-500/30 transition"
              >
                {opLoading === "deposit" ? "Внесення…" : "Внести в казну"}
              </button>
              <button
                onClick={handleWithdraw}
                disabled={disabled || opLoading !== null}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 disabled:bg-rose-900 disabled:text-slate-500 px-3 py-2.5 text-sm font-semibold shadow-md shadow-rose-500/30 transition"
              >
                {opLoading === "withdraw" ? "Зняття…" : "Зняти з казни"}
              </button>
            </div>
          </section>

          {/* Лог операцій */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 flex-1 flex flex-col min-h-[180px] shadow-lg shadow-black/40">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-200">
                Історія казни
              </h2>
              {logLoading && (
                <span className="text-[11px] text-slate-400">
                  Завантаження…
                </span>
              )}
            </div>

            {!logLoading && logItems.length === 0 && (
              <div className="text-xs text-slate-500">
                Ще не було жодної операції з казною.
              </div>
            )}

            {!logLoading && logItems.length > 0 && (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scroll">
                {logItems.map((item) => {
                  const signCh =
                    item.delta_chervontsi > 0
                      ? "+"
                      : item.delta_chervontsi < 0
                      ? "-"
                      : "";
                  const signKl =
                    item.delta_kleynody > 0
                      ? "+"
                      : item.delta_kleynody < 0
                      ? "-"
                      : "";
                  const when = item.created_at
                    ? new Date(item.created_at).toLocaleString("uk-UA", {
                        hour12: false,
                      })
                    : "";

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-slate-950/80 border border-slate-700 px-3 py-2 text-xs flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-semibold text-slate-100">
                          {item.action === "DEPOSIT"
                            ? "Внесення в казну"
                            : item.action === "WITHDRAW"
                            ? "Зняття з казни"
                            : item.action}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {when}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] items-center">
                        {item.delta_chervontsi !== 0 && (
                          <span
                            className={
                              item.delta_chervontsi > 0
                                ? "text-emerald-300"
                                : "text-rose-300"
                            }
                          >
                            {signCh}
                            {Math.abs(item.delta_chervontsi)} черв.
                          </span>
                        )}
                        {item.delta_kleynody !== 0 && (
                          <span
                            className={
                              item.delta_kleynody > 0
                                ? "text-emerald-300"
                                : "text-rose-300"
                            }
                          >
                            {signKl}
                            {Math.abs(item.delta_kleynody)} клейн.
                          </span>
                        )}
                        <span className="text-slate-400">
                          джерело: {item.source.toLowerCase()}
                        </span>
                        <span className="text-slate-500">
                          tg_id: {item.tg_id}
                        </span>
                      </div>

                      {item.comment && (
                        <div className="text-[11px] text-slate-300 mt-1">
                          {item.comment}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}