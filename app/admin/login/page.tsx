"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "../admin-token-key";

// Не читаємо env на клієнті, йдемо через фронтовий proxy.

export default function AdminLoginPage() {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = token.trim();
    if (!trimmed) {
      setError("Введи адмін-токен.");
      return;
    }

    setLoading(true);
    try {
      // фронт → /api/proxy/api/admin/login → бекенд /api/admin/login
      const res = await fetch("/api/proxy/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: trimmed }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }

      if (!res.ok || !data?.ok) {
        const msg =
          data?.error === "INVALID_TOKEN"
            ? "Невірний токен."
            : data?.error || "Помилка авторизації.";
        setError(msg);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(ADMIN_TOKEN_KEY, trimmed);
      }

      router.replace("/admin");
    } catch (err) {
      console.error(err);
      setError("Помилка мережі або сервера.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-slate-950 to-zinc-900 text-gray-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-black/70 border border-zinc-800 shadow-2xl px-6 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-amber-400">
            Адмін-панель
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Прокляті Кургани — вхід тільки для сторожів
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Адмін-токен</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Введи секретний токен…"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/70 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-black py-2.5 shadow-md"
          >
            {loading ? "Перевіряємо…" : "Увійти"}
          </button>
        </form>
      </div>
    </main>
  );
}