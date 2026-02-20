"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "../admin-token-key";

type AuditItem = {
  id: number;
  created_at: string;
  tg_id: number;
  action_type: string;
  actor_type: string;
  context: any;
};

type AuditResponse = {
  ok: boolean;
  items: AuditItem[];
  total: number;
};

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // фільтри
  const [tgIdFilter, setTgIdFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function fetchLogs() {
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
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (tgIdFilter.trim()) params.set("tg_id", tgIdFilter.trim());
      if (actionFilter.trim()) params.set("action_type", actionFilter.trim());
      if (actorFilter.trim()) params.set("actor_type", actorFilter.trim());
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const resp = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: {
          "X-Admin-Token": token,
        },
      });
      if (!resp.ok) throw new Error(`Помилка бекенда (${resp.status})`);
      const data: AuditResponse = await resp.json();
      if (!data.ok) throw new Error("Бекенд повернув ok=false");
      setLogs(data.items);
      setTotal(data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  function renderContext(ctx: any) {
    try {
      return JSON.stringify(ctx);
    } catch {
      return String(ctx);
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
      <h1 className="text-2xl font-semibold text-amber-300">Журнал дій</h1>
      {/* фільтри */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <input
          type="text"
          value={tgIdFilter}
          onChange={(e) => setTgIdFilter(e.target.value)}
          placeholder="TG ID"
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
        />
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Тип дії"
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
        />
        <input
          type="text"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          placeholder="Тип актора"
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus;border-amber-500"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus;border-amber-500"
        />
        <button
          onClick={() => {
            setOffset(0);
            fetchLogs();
          }}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium text-black"
        >
          Застосувати
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
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Дата</th>
              <th className="px-3 py-2 text-left">TG ID</th>
              <th className="px-3 py-2 text-left">Дія</th>
              <th className="px-3 py-2 text-left">Актор</th>
              <th className="px-3 py-2 text-left">Контекст</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-t border-zinc-900/80 hover:bg-zinc-900/70"
              >
                <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                  {log.id}
                </td>
                <td className="px-3 py-2">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">{log.tg_id}</td>
                <td className="px-3 py-2">{log.action_type}</td>
                <td className="px-3 py-2">{log.actor_type}</td>
                <td className="px-3 py-2">
                  <pre className="whitespace-pre-line text-xs overflow-x-auto">
                    {renderContext(log.context)}
                  </pre>
                </td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-center text-zinc-400">
                  Немає записів.
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
