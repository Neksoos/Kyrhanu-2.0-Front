"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "../../admin-token-key";

type Player = {
  tg_id: number;
  name: string | null;
  level: number;
  chervontsi: number;
  kleynody: number;
  is_banned: boolean;
  race_key: string | null;
  class_key: string | null;
  gender: string | null;
  xp: number | null;
  hp: number | null;
  mp: number | null;
  phys_attack: number | null;
  magic_attack: number | null;
  phys_defense: number | null;
  magic_defense: number | null;
  created_at: string | null;
  last_login: string | null;
  login_streak: number | null;
};

type PlayerResponse = {
  ok: boolean;
  player: Player;
};

export default function PlayerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const raw = (params?.tg_id as any) ?? "";
  const tgId = Array.isArray(raw) ? parseInt(raw[0]) : parseInt(raw);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [addChervontsi, setAddChervontsi] = useState("");
  const [addKleynody, setAddKleynody] = useState("");

  async function fetchPlayer() {
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
      const resp = await fetch(`/api/admin/players/${tgId}`, {
        headers: {
          "X-Admin-Token": token,
        },
      });
      if (!resp.ok) throw new Error(`Помилка бекенда (${resp.status})`);
      const data: PlayerResponse = await resp.json();
      if (!data.ok) throw new Error("Бекенд повернув ok=false");
      setPlayer(data.player);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgId]);

  async function updateBalance() {
    setError(null);
    setSuccess(null);
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    const body = {
      add_chervontsi: parseInt(addChervontsi) || 0,
      add_kleynody: parseInt(addKleynody) || 0,
    };
    if (!body.add_chervontsi && !body.add_kleynody) {
      setError("Вкажи суму для зміни хоча б однієї валюти.");
      return;
    }
    try {
      const resp = await fetch(`/api/admin/players/${tgId}/balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
        },
        body: JSON.stringify(body),
      });
      let data: any = {};
      try {
        data = await resp.json();
      } catch {}
      if (!resp.ok || !data?.ok) {
        const msg = data?.error || `Помилка бекенда (${resp.status})`;
        throw new Error(msg);
      }
      setSuccess("Баланс оновлено.");
      setAddChervontsi("");
      setAddKleynody("");
      fetchPlayer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function toggleBan(ban: boolean) {
    setError(null);
    setSuccess(null);
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    try {
      const url = `/api/admin/players/${tgId}/${ban ? "ban" : "unban"}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "X-Admin-Token": token,
        },
      });
      let data: any = {};
      try {
        data = await resp.json();
      } catch {}
      if (!resp.ok || !data?.ok) {
        const msg = data?.error || `Помилка бекенда (${resp.status})`;
        throw new Error(msg);
      }
      setSuccess(ban ? "Гравця заблоковано." : "Гравця розблоковано.");
      fetchPlayer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push("/admin/players")}
        className="text-sm text-amber-400 hover:underline"
      >
        ← До списку гравців
      </button>
      {loading && (
        <div className="text-sm text-zinc-300 animate-pulse">Завантаження…</div>
      )}
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
      {player && (
        <>
          <h1 className="text-2xl font-semibold text-amber-300">
            Гравець #{player.tg_id} {player.name && `(${player.name})`}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-amber-400">
                Основна інформація
              </h2>
              <div className="text-sm text-zinc-300">
                <p>Рівень: {player.level}</p>
                <p>
                  Баланс: {player.chervontsi} черв. / {player.kleynody} кл.
                </p>
                <p>Бан: {player.is_banned ? "Так" : "Ні"}</p>
                <p>Раса: {player.race_key || "—"}</p>
                <p>Клас: {player.class_key || "—"}</p>
                <p>Стать: {player.gender || "—"}</p>
                <p>XP: {player.xp ?? "—"}</p>
                <p>HP: {player.hp ?? "—"}</p>
                <p>MP: {player.mp ?? "—"}</p>
                <p>Фіз. атака: {player.phys_attack ?? "—"}</p>
                <p>Маг. атака: {player.magic_attack ?? "—"}</p>
                <p>Фіз. захист: {player.phys_defense ?? "—"}</p>
                <p>Маг. захист: {player.magic_defense ?? "—"}</p>
                <p>Створено: {player.created_at || "—"}</p>
                <p>Останній вхід: {player.last_login || "—"}</p>
                <p>Серія входів: {player.login_streak ?? "—"}</p>
              </div>
              <button
                onClick={() => router.push(`/admin/inventory/${player.tg_id}`)}
                className="mt-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium text-black"
              >
                Переглянути інвентар
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-amber-400">
                  Баланс гравця
                </h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    placeholder="Δ червонці"
                    value={addChervontsi}
                    onChange={(e) => setAddChervontsi(e.target.value)}
                    className="px-3 py-2 w-full rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="number"
                    placeholder="Δ клейноди"
                    value={addKleynody}
                    onChange={(e) => setAddKleynody(e.target.value)}
                    className="px-3 py-2 w-full rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={updateBalance}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium text-black"
                >
                  Змінити баланс
                </button>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-amber-400">Бан</h2>
                {player.is_banned ? (
                  <button
                    onClick={() => toggleBan(false)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium text-black"
                  >
                    Розблокувати
                  </button>
                ) : (
                  <button
                    onClick={() => toggleBan(true)}
                    className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-sm font-medium text-white"
                  >
                    Заблокувати
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
