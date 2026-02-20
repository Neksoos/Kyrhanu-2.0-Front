"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "../admin-token-key";

type ItemSummary = {
  code: string;
  name: string | null;
  category: string | null;
  rarity: string | null;
  is_active: boolean;
};

type ItemsResponse = {
  ok: boolean;
  items: ItemSummary[];
  total: number;
};

export default function ItemsListPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchItems() {
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
      const resp = await fetch(`/api/admin/items?${params.toString()}`, {
        headers: {
          "X-Admin-Token": token,
        },
      });
      if (!resp.ok) throw new Error(`Помилка бекенда (${resp.status})`);
      const data: ItemsResponse = await resp.json();
      if (!data.ok) throw new Error("Бекенд повернув ok=false");
      setItems(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/admin")}
          className="text-sm text-amber-400 hover:underline"
        >
          ← До адмінки
        </button>
      </div>
      <h1 className="text-2xl font-semibold text-amber-300">Предмети</h1>
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук за кодом або назвою"
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={() => fetchItems()}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium text-black"
        >
          Пошук
        </button>
        <button
          onClick={() => router.push("/admin/items/new")}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium text-black"
        >
          + Новий предмет
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
              <th className="px-3 py-2 text-left">Код</th>
              <th className="px-3 py-2 text-left">Назва</th>
              <th className="px-3 py-2 text-left">Категорія</th>
              <th className="px-3 py-2 text-left">Рідкість</th>
              <th className="px-3 py-2 text-left">Активний</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr
                key={it.code}
                onClick={() => router.push(`/admin/items/${it.code}`)}
                className="border-t border-zinc-900/80 hover:bg-zinc-900/70 cursor-pointer"
              >
                <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                  {it.code}
                </td>
                <td className="px-3 py-2">{it.name || "—"}</td>
                <td className="px-3 py-2">{it.category || "—"}</td>
                <td className="px-3 py-2">{it.rarity || "—"}</td>
                <td className="px-3 py-2">
                  {it.is_active ? (
                    <span className="text-green-500">Так</span>
                  ) : (
                    <span className="text-red-500">Ні</span>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-zinc-400">
                  Немає предметів.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
