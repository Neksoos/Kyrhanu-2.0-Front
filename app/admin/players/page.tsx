"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "../admin-token-key";

type PlayerItem = {
  tg_id: number;
  name: string | null;
  level: number;
  chervontsi: number;
  kleynody: number;
  is_banned: boolean;
};

type PlayersResponse = {
  ok: boolean;
  items: PlayerItem[];
  total: number;
};

export default function PlayersListPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPlayers() {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      const resp = await fetch(`/api/admin/players?${params.toString()}`, {
        headers: {
          "X-Admin-Token": token,
        },
      });
      if (!resp.ok) {
        throw new Error(`Помилка бекенда (${resp.status})`);
      }
      const data: PlayersResponse = await resp.json();
      if (!data.ok) throw new Error("Бекенд повернув ok=false");
      setPlayers(data.items);
      setTotal(data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-amber-300">Гравці</h1>
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук за ID або ім'ям"
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={() => {
            setOffset(0);
            fetchPlayers();
          }}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium text-black"
        >
          Пошук
        </button>
      </div>
      {loading && (
        <div className="text-sm text-zinc-300 animate-pulse">Завантаження…</div>
      )}
      {error && (
        <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl px-3 py-2">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-zinc-800 bg-black/60 overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-zinc-900/80 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">TG ID</th>
              <th className="px-3 py-2 text-left">Ім'я</th>
              <th className="px-3 py-2 text-left">Рівень</th>
              <th className="px-3 py-2 text-left">Червонці</th>
              <th className="px-3 py-2 text-left">Клейноди</th>
              <th className="px-3 py-2 text-left">Бан</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.tg_id}
                onClick={() => router.push(`/admin/players/${p.tg_id}`)}
                className="border-t border-zinc-900/80 hover:bg-zinc-900/70 cursor-pointer"
              >
                <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                  {p.tg_id}
                </td>
                <td className="px-3 py-2">{p.name || "—"}</td>
                <td className="px-3 py-2">{p.level}</td>
                <td className="px-3 py-2">{p.chervontsi}</td>
                <td className="px-3 py-2">{p.kleynody}</td>
                <td className="px-3 py-2">
                  {p.is_banned ? (
                    <span className="text-red-500">Так</span>
                  ) : (
                    <span className="text-green-500">Ні</span>
                  )}
                </td>
              </tr>
            ))}
            {players.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-center text-zinc-400">
                  Немає гравців.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > limit && (
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-2 rounded-lg bg-zinc-700 disabled:opacity-50 text-sm"
          >
            Попередні
          </button>
          <span className="text-xs text-zinc-300">
            {offset + 1}–{Math.min(offset + limit, total)} з {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-2 rounded-lg bg-zinc-700 disabled:opacity-50 text-sm"
          >
            Наступні
          </button>
        </div>
      )}
    </div>
  );
}
