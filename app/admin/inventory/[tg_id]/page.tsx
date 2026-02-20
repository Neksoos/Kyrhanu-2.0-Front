"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "../../admin-token-key";

/**
 * Сторінка перегляду та керування інвентарем конкретного гравця.
 * Дозволяє видавати предмети та повністю видаляти стеки з
 * інвентаря.
 */
type InventoryItem = {
  id: number;
  item_code: string;
  name: string | null;
  qty: number;
  emoji?: string | null;
  rarity?: string | null;
  slot?: string | null;
};

type InventoryResponse = {
  ok: boolean;
  items: InventoryItem[];
};

export default function InventoryPage() {
  const router = useRouter();
  const params = useParams();
  const rawTgId = (params?.tg_id as any) ?? "";
  const tgId = Array.isArray(rawTgId) ? parseInt(rawTgId[0]) : parseInt(rawTgId);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Формові стейти для видачі
  const [itemCode, setItemCode] = useState("");
  const [qty, setQty] = useState("1");
  const [customName, setCustomName] = useState("");
  const [rarity, setRarity] = useState("");
  const [emoji, setEmoji] = useState("");
  const [slot, setSlot] = useState("");
  const [description, setDescription] = useState("");
  const [statsString, setStatsString] = useState("");
  const [category, setCategory] = useState("");

  async function fetchInventory() {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inventory/${tgId}`, {
        headers: { "X-Admin-Token": token },
      });
      if (!res.ok) throw new Error(`Помилка бекенда (${res.status})`);
      const data: InventoryResponse = await res.json();
      if (!data.ok) throw new Error("Бекенд повернув ok=false");
      setItems(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgId]);

  async function giveItem() {
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
    const qtyNum = parseInt(qty);
    if (!itemCode.trim() || isNaN(qtyNum) || qtyNum <= 0) {
      setError("Введи коректний код предмета та кількість > 0.");
      return;
    }
    let parsedStats: any = undefined;
    if (statsString.trim()) {
      try {
        parsedStats = JSON.parse(statsString);
      } catch {
        setError("Stats має бути валідним JSON");
        return;
      }
    }
    const body: any = {
      item_code: itemCode.trim(),
      qty: qtyNum,
    };
    if (customName.trim()) body.name = customName.trim();
    if (rarity.trim()) body.rarity = rarity.trim();
    if (description.trim()) body.description = description.trim();
    if (parsedStats) body.stats = parsedStats;
    if (emoji.trim()) body.emoji = emoji.trim();
    if (slot.trim()) body.slot = slot.trim();
    if (category.trim()) body.category = category.trim();
    try {
      const res = await fetch(`/api/admin/inventory/${tgId}/give`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
        },
        body: JSON.stringify(body),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {}
      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Помилка бекенда (${res.status})`;
        throw new Error(msg);
      }
      setSuccess("Предмет видано.");
      // очистка форми
      setItemCode("");
      setQty("1");
      setCustomName("");
      setRarity("");
      setDescription("");
      setStatsString("");
      setEmoji("");
      setSlot("");
      setCategory("");
      fetchInventory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function removeItem(invId: number) {
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
      const res = await fetch(`/api/admin/inventory/${tgId}/${invId}`, {
        method: "DELETE",
        headers: { "X-Admin-Token": token },
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {}
      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Помилка бекенда (${res.status})`;
        throw new Error(msg);
      }
      setSuccess("Предмет видалено з інвентаря.");
      fetchInventory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push(`/admin/players/${tgId}`)}
        className="text-sm text-amber-400 hover:underline"
      >
        ← До картки гравця
      </button>
      <h1 className="text-2xl font-semibold text-amber-300 flex items-center gap-2">
        <span>🎒</span>
        <span>Інвентар гравця {tgId}</span>
      </h1>
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
      {/* Форма видачі предмета */}
      <div className="rounded-2xl border border-zinc-800 bg-black/60 p-4 space-y-3">
        <h2 className="text-lg font-medium text-amber-400">Видати предмет</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Код предмета *</label>
            <input
              type="text"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
              placeholder="Напр., sword_iron"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Кількість *</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Назва (необов'язково)</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
              placeholder="Індивідуальна назва"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Рідкість</label>
            <input
              type="text"
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus;border-amber-500"
              placeholder="common, rare…"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus-outline-none focus:border-amber-500"
              placeholder="🔪"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Слот</label>
            <input
              type="text"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus-outline-none focus:border-amber-500"
              placeholder="head, weapon…"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Категорія</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus-outline-none focus;border-amber-500"
              placeholder="weapon, potion…"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Опис</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus-outline-none focus;border-amber-500"
              placeholder="Короткий опис"
            />
          </div>
          <div className="space-y-1 md:col-span-2 lg:col-span-3">
            <label className="text-xs text-zinc-300">Stats (JSON)</label>
            <textarea
              value={statsString}
              onChange={(e) => setStatsString(e.target.value)}
              className="w-full h-24 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 font-mono focus:outline-none focus;border-amber-500"
              placeholder={`{
  "attack": 5,
  "defense": 1
}`}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={giveItem}
          className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium text-black"
        >
          Видати
        </button>
      </div>

      {/* Список інвентаря */}
      {!loading && (
        <div className="rounded-2xl border border-zinc-800 bg-black/60 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Код</th>
                <th className="px-3 py-2 text-left">Назва</th>
                <th className="px-3 py-2 text-right">К-сть</th>
                <th className="px-3 py-2 text-left">Рідкість</th>
                <th className="px-3 py-2 text-left">Слот</th>
                <th className="px-3 py-2 text-center">Дія</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  className="border-t border-zinc-900/80 hover:bg-zinc-900/70"
                >
                  <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                    {it.id}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                    {it.item_code}
                  </td>
                    <td className="px-3 py-2">
                      {it.name || <span className="text-zinc-500">—</span>}
                    </td>
                  <td className="px-3 py-2 text-right">{it.qty}</td>
                  <td className="px-3 py-2">
                    {it.rarity || <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {it.slot || <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-xs text-white"
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-3 text-center text-zinc-400"
                  >
                    Інвентар порожній.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
