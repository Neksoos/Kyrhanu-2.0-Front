"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "../admin-token-key";

type TreasuryState = {
  chervontsi: number;
  kleynody: number;
  updated_at: string;
};

type TreasuryStateResponse = {
  ok: boolean;
  state: TreasuryState;
};

type FortSummary = {
  id: number;
  state: TreasuryState;
};

export default function EconomyAdminPage() {
  const router = useRouter();
  const [idsInput, setIdsInput] = useState("");
  const [forts, setForts] = useState<FortSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totCherv, setTotCherv] = useState<number | null>(null);
  const [totKley, setTotKley] = useState<number | null>(null);

  function getToken(): string | null {
    return typeof window !== "undefined"
      ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
      : null;
  }

  async function loadEconomy() {
    setError(null);
    setForts([]);
    setTotCherv(null);
    setTotKley(null);
    const token = getToken();
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    const ids = idsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s)
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n) && n > 0);
    if (ids.length === 0) {
      setError("Введи принаймні один ID застави, розділений комами.");
      return;
    }
    setLoading(true);
    try {
      const results: FortSummary[] = [];
      let sumCh = 0;
      let sumKl = 0;
      for (const id of ids) {
        const resp = await fetch(`/api/admin/zastavy/${id}/treasury`, {
          headers: {
            "X-Admin-Token": token,
          },
        });
        if (!resp.ok) {
          // якщо одна помилка, просто запишемо помилку і продовжимо
          setError(
            `Помилка бекенда для застави ${id} (${resp.status}). Можливо, вона не існує.`
          );
          continue;
        }
        const data: TreasuryStateResponse = await resp.json();
        if (!data.ok) {
          setError(`Бекенд повернув ok=false для застави ${id}.`);
          continue;
        }
        results.push({ id, state: data.state });
        sumCh += data.state.chervontsi;
        sumKl += data.state.kleynody;
      }
      setForts(results);
      setTotCherv(sumCh);
      setTotKley(sumKl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push("/admin")}
        className="text-sm text-amber-400 hover:underline"
      >
        ← До адмінки
      </button>
      <h1 className="text-2xl font-semibold text-amber-300 flex items-center gap-2">
        <span>💰</span>
        <span>Економіка та застави</span>
      </h1>
      <div className="space-y-2">
        <p className="text-sm text-zinc-400">
          Введи ID застав через кому, щоб переглянути їхні баланси.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={idsInput}
            onChange={(e) => setIdsInput(e.target.value)}
            placeholder="Напр.: 1, 2, 3"
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={loadEconomy}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium text-black"
          >
            Завантажити
          </button>
        </div>
      </div>
      {error && (
        <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl px-3 py-2">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-zinc-300 animate-pulse">Завантаження…</div>
      )}
      {forts.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-zinc-800 bg-black/60 overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2 text-left">ID застави</th>
                  <th className="px-3 py-2 text-left">Червонці</th>
                  <th className="px-3 py-2 text-left">Клейноди</th>
                  <th className="px-3 py-2 text-left">Оновлено</th>
                  <th className="px-3 py-2 text-left">Дії</th>
                </tr>
              </thead>
              <tbody>
                {forts.map((f) => (
                  <tr
                    key={f.id}
                    className="border-t border-zinc-900/80 hover:bg-zinc-900/70"
                  >
                    <td className="px-3 py-2">{f.id}</td>
                    <td className="px-3 py-2">{f.state.chervontsi}</td>
                    <td className="px-3 py-2">{f.state.kleynody}</td>
                    <td className="px-3 py-2">
                      {new Date(f.state.updated_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() =>
                          router.push(`/admin/forts?fortId=${f.id}`)
                        }
                        className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-800 text-xs text-white"
                      >
                        Редагувати
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totCherv !== null && totKley !== null && (
            <div className="text-sm text-zinc-300">
              <p>
                Сумарно червонці: <strong>{totCherv}</strong>
              </p>
              <p>
                Сумарно клейноди: <strong>{totKley}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
