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

type TreasuryLogItem = {
  id: number;
  zastava_id: number;
  tg_id: number;
  delta_chervontsi: number;
  delta_kleynody: number;
  action: string;
  source: string;
  comment: string;
  created_at: string;
};

type TreasuryLogResponse = {
  ok: boolean;
  items: TreasuryLogItem[];
  total: number;
};

export default function FortsAdminPage() {
  const router = useRouter();
  const [fortId, setFortId] = useState("");
  const [treasury, setTreasury] = useState<TreasuryState | null>(null);
  const [logs, setLogs] = useState<TreasuryLogItem[]>([]);
  const [loadingState, setLoadingState] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logOffset, setLogOffset] = useState(0);
  const [logTotal, setLogTotal] = useState(0);

  // форма для змін казни
  const [actorId, setActorId] = useState("");
  const [deltaCherv, setDeltaCherv] = useState("");
  const [deltaKley, setDeltaKley] = useState("");
  const [action, setAction] = useState("");
  const [source, setSource] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // допоміжна функція для отримання токена
  function getToken(): string | null {
    return typeof window !== "undefined"
      ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
      : null;
  }

  async function loadTreasury() {
    setError(null);
    setSuccess(null);
    setTreasury(null);
    setLogs([]);
    const token = getToken();
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    const idNum = parseInt(fortId);
    if (isNaN(idNum) || idNum <= 0) {
      setError("Введи коректний ID застави (число > 0).");
      return;
    }
    setLoadingState(true);
    try {
      const resp = await fetch(`/api/admin/zastavy/${idNum}/treasury`, {
        headers: {
          "X-Admin-Token": token,
        },
      });
      if (!resp.ok) throw new Error(`Помилка бекенда (${resp.status})`);
      const data: TreasuryStateResponse = await resp.json();
      if (!data.ok) throw new Error("Бекенд повернув ok=false");
      setTreasury(data.state);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setLoadingState(false);
    }
  }

  async function loadLogs(offset = 0) {
    setError(null);
    setSuccess(null);
    const token = getToken();
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    const idNum = parseInt(fortId);
    if (isNaN(idNum) || idNum <= 0) {
      setError("Введи коректний ID застави.");
      return;
    }
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("offset", String(offset));
      const resp = await fetch(
        `/api/admin/zastavy/${idNum}/treasury/log?${params.toString()}`,
        {
          headers: {
            "X-Admin-Token": token,
          },
        }
      );
      if (!resp.ok) throw new Error(`Помилка бекенда (${resp.status})`);
      const data: TreasuryLogResponse = await resp.json();
      if (!data.ok) throw new Error("Бекенд повернув ok=false");
      setLogs(data.items);
      setLogTotal(data.total);
      setLogOffset(offset);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setLoadingLogs(false);
    }
  }

  async function changeTreasury() {
    setError(null);
    setSuccess(null);
    const token = getToken();
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    const idNum = parseInt(fortId);
    if (isNaN(idNum) || idNum <= 0) {
      setError("Введи коректний ID застави.");
      return;
    }
    const body = {
      actor_tg_id: parseInt(actorId) || 0,
      delta_chervontsi: parseInt(deltaCherv) || 0,
      delta_kleynody: parseInt(deltaKley) || 0,
      action: action.trim() || "",
      source: source.trim() || "",
      comment: comment.trim() || "",
    };
    if (!body.delta_chervontsi && !body.delta_kleynody) {
      setError("Вкажи зміну хоча б однієї валюти.");
      return;
    }
    setSaving(true);
    try {
      const resp = await fetch(
        `/api/admin/zastavy/${idNum}/treasury/change`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": token,
          },
          body: JSON.stringify(body),
        }
      );
      let data: any = {};
      try {
        data = await resp.json();
      } catch {}
      if (!resp.ok || !data?.ok) {
        const msg = data?.error || `Помилка бекенда (${resp.status})`;
        throw new Error(msg);
      }
      setSuccess("Стан застави оновлено.");
      // скидаємо форму і оновлюємо стан та логи
      setActorId("");
      setDeltaCherv("");
      setDeltaKley("");
      setAction("");
      setSource("");
      setComment("");
      loadTreasury();
      loadLogs(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setSaving(false);
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
        <span>🛡️</span>
        <span>Керування заставами</span>
      </h1>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="number"
          value={fortId}
          onChange={(e) => setFortId(e.target.value)}
          placeholder="ID застави"
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={() => {
            loadTreasury();
          }}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium text-black"
        >
          Завантажити
        </button>
      </div>
      {error && (
        <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-emerald-400 bg-emerald-900/40 border border-emerald-700/60 rounded-xl px-3 py-2">
          {success}
        </div>
      )}
      {loadingState && (
        <div className="text-sm text-zinc-300 animate-pulse">
          Завантаження стану…
        </div>
      )}
      {treasury && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-zinc-800 bg-black/60 p-4">
            <h2 className="text-lg font-medium text-amber-400">
              Поточний стан застави #{fortId}
            </h2>
            <p className="text-sm text-zinc-300">
              Червонці: {treasury.chervontsi}
            </p>
            <p className="text-sm text-zinc-300">
              Клейноди: {treasury.kleynody}
            </p>
            <p className="text-sm text-zinc-400">
              Оновлено: {new Date(treasury.updated_at).toLocaleString()}
            </p>
          </div>
          {/* форма зміни казни */}
          <div className="rounded-2xl border border-zinc-800 bg-black/60 p-4 space-y-3">
            <h2 className="text-lg font-medium text-amber-400">
              Змінити казну
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="number"
                value={actorId}
                onChange={(e) => setActorId(e.target.value)}
                placeholder="Actor TG ID (необов’язково)"
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
              />
              <input
                type="number"
                value={deltaCherv}
                onChange={(e) => setDeltaCherv(e.target.value)}
                placeholder="Δ червонці (може бути від’ємне)"
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
              />
              <input
                type="number"
                value={deltaKley}
                onChange={(e) => setDeltaKley(e.target.value)}
                placeholder="Δ клейноди (може бути від’ємне)"
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Action (напр., manual)"
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Source (джерело)"
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus;border-amber-500"
              />
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Коментар"
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus;border-amber-500"
              />
            </div>
            <button
              onClick={changeTreasury}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-sm font-medium text-black"
            >
              {saving ? "Зберігаємо…" : "Змінити"}
            </button>
          </div>
          {/* журнал */}
          <div className="space-y-2">
            <button
              onClick={() => loadLogs(0)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium text-black"
            >
              Показати журнал
            </button>
            {loadingLogs && (
              <div className="text-sm text-zinc-300 animate-pulse">
                Завантаження журналу…
              </div>
            )}
            {logs.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-black/60 overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Дата</th>
                      <th className="px-3 py-2 text-left">TG ID</th>
                      <th className="px-3 py-2 text-left">Δ червонці</th>
                      <th className="px-3 py-2 text-left">Δ клейноди</th>
                      <th className="px-3 py-2 text-left">Action</th>
                      <th className="px-3 py-2 text-left">Source</th>
                      <th className="px-3 py-2 text-left">Коментар</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-zinc-900/80 hover:bg-zinc-900/70"
                      >
                        <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                          {item.id}
                        </td>
                        <td className="px-3 py-2">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">{item.tg_id}</td>
                        <td className="px-3 py-2">{item.delta_chervontsi}</td>
                        <td className="px-3 py-2">{item.delta_kleynody}</td>
                        <td className="px-3 py-2">{item.action}</td>
                        <td className="px-3 py-2">{item.source}</td>
                        <td className="px-3 py-2">{item.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {logs.length > 0 && (
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => loadLogs(Math.max(0, logOffset - 50))}
                  disabled={logOffset === 0}
                  className="px-3 py-2 rounded-lg bg-zinc-700 disabled:opacity-50 text-sm"
                >
                  Попередні
                </button>
                <span className="text-xs text-zinc-300">
                  {logOffset + 1}–
                  {Math.min(logOffset + 50, logTotal)} з {logTotal}
                </span>
                <button
                  onClick={() => loadLogs(logOffset + 50)}
                  disabled={logOffset + 50 >= logTotal}
                  className="px-3 py-2 rounded-lg bg-zinc-700 disabled:opacity-50 text-sm"
                >
                  Наступні
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
