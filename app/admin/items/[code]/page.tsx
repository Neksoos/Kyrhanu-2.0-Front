"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "../../admin-token-key";

type ItemDetails = {
  code: string;
  name: string | null;
  emoji: string | null;
  category: string | null;
  rarity: string | null;
  description: string | null;
  stats: any | null;
  base_value: number | null;
  sell_price: number | null;
  slot: string | null;
  atk: number | null;
  defense: number | null;
  hp: number | null;
  mp: number | null;
  level_req: number | null;
  class_req: string | null;
  is_active: boolean;
  stackable: boolean | null;
};

type ItemResponse = {
  ok: boolean;
  item: ItemDetails;
};

export default function ItemEditPage() {
  const router = useRouter();
  const params = useParams();
  const rawCode = (params?.code as any) ?? "";
  const codeParam = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  const isNew = codeParam === "new";

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [category, setCategory] = useState("");
  const [rarity, setRarity] = useState("");
  const [description, setDescription] = useState("");
  const [statsString, setStatsString] = useState("");
  const [baseValue, setBaseValue] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [slot, setSlot] = useState("");
  const [atk, setAtk] = useState("");
  const [defense, setDefense] = useState("");
  const [hp, setHp] = useState("");
  const [mp, setMp] = useState("");
  const [levelReq, setLevelReq] = useState("");
  const [classReq, setClassReq] = useState("");
  const [stackable, setStackable] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadItem() {
    if (isNew) return;
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
      const res = await fetch(`/api/admin/items/${codeParam}`, {
        headers: {
          "X-Admin-Token": token,
        },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError("Предмет не знайдено.");
          return;
        }
        throw new Error(`Помилка бекенда (${res.status})`);
      }
      const data: ItemResponse = await res.json();
      if (!data.ok) throw new Error("Бекенд повернув ok=false");
      const item = data.item;
      setCode(item.code);
      setName(item.name ?? "");
      setEmoji(item.emoji ?? "");
      setCategory(item.category ?? "");
      setRarity(item.rarity ?? "");
      setDescription(item.description ?? "");
      setStatsString(
        item.stats !== null && typeof item.stats === "object"
          ? JSON.stringify(item.stats, null, 2)
          : ""
      );
      setBaseValue(item.base_value !== null ? String(item.base_value) : "");
      setSellPrice(item.sell_price !== null ? String(item.sell_price) : "");
      setSlot(item.slot ?? "");
      setAtk(item.atk !== null ? String(item.atk) : "");
      setDefense(item.defense !== null ? String(item.defense) : "");
      setHp(item.hp !== null ? String(item.hp) : "");
      setMp(item.mp !== null ? String(item.mp) : "");
      setLevelReq(item.level_req !== null ? String(item.level_req) : "");
      setClassReq(item.class_req ?? "");
      setIsActive(item.is_active);
      setStackable(item.stackable ?? false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam]);

  function buildPayload() {
    let parsedStats: any = undefined;
    if (statsString.trim()) {
      try {
        parsedStats = JSON.parse(statsString);
      } catch {
        setError("Stats має бути валідним JSON");
        return false;
      }
    }
    const payload: any = {};
    if (isNew) {
      payload.code = code.trim();
    }
    payload.name = name.trim() || null;
    payload.emoji = emoji.trim() || null;
    payload.category = category.trim() || null;
    payload.rarity = rarity.trim() || null;
    payload.description = description.trim() || null;
    payload.stats = parsedStats || null;
    payload.base_value = baseValue.trim() ? parseInt(baseValue) : null;
    payload.sell_price = sellPrice.trim() ? parseInt(sellPrice) : null;
    payload.slot = slot.trim() || null;
    payload.atk = atk.trim() ? parseInt(atk) : null;
    payload.defense = defense.trim() ? parseInt(defense) : null;
    payload.hp = hp.trim() ? parseInt(hp) : null;
    payload.mp = mp.trim() ? parseInt(mp) : null;
    payload.level_req = levelReq.trim() ? parseInt(levelReq) : null;
    payload.class_req = classReq.trim() || null;
    payload.is_active = isActive;
    payload.stackable = stackable;
    return payload;
  }

  async function saveItem() {
    setSuccess(null);
    setError(null);
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    const payload = buildPayload();
    if (payload === false) return;
    setSaving(true);
    try {
      const url = isNew ? "/api/admin/items" : `/api/admin/items/${codeParam}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
        },
        body: JSON.stringify(payload),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {}
      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Помилка бекенда (${res.status})`;
        throw new Error(msg);
      }
      setSuccess(isNew ? "Предмет створено." : "Зміни збережено.");
      if (isNew) {
      // після створення переходимо на сторінку редагування
        router.replace(`/admin/items/${payload.code}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateItem() {
    setError(null);
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/items/${codeParam}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Token": token,
        },
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {}
      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Помилка бекенда (${res.status})`;
        throw new Error(msg);
      }
      setIsActive(false);
      setSuccess("Предмет деактивовано.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function activateItem() {
    setError(null);
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;
    if (!token) {
      setError("Адмін-токен не знайдено. Перезайди в адмінку.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/items/${codeParam}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
        },
        body: JSON.stringify({ is_active: true }),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {}
      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Помилка бекенда (${res.status})`;
        throw new Error(msg);
      }
      setIsActive(true);
      setSuccess("Предмет активовано.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push("/admin/items")}
        className="text-sm text-amber-400 hover:underline"
      >
        ← До списку предметів
      </button>
      <h1 className="text-2xl font-semibold text-amber-300">
        {isNew ? "Новий предмет" : `Предмет: ${code}`}
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
      {!loading && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveItem();
          }}
          className="space-y-4"
        >
          {isNew && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-300">Код (унікальний)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                placeholder="Наприклад: sword_iron"
                required
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Назва</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Назва предмета"
              required
            />
          </div>
          <div className="flex flex-col md:flex-row md:gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Emoji</label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                placeholder="🔪"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Категорія</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                placeholder="Напр., weapon, potion"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Рідкість</label>
              <input
                type="text"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                placeholder="common, rare, epic…"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Опис</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Короткий опис предмета"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Статистика (JSON)</label>
            <textarea
              value={statsString}
              onChange={(e) => setStatsString(e.target.value)}
              className="w-full h-24 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 font-mono placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder={`Наприклад: {
  "attack": 5,
  "defense": 2
}`}
            />
          </div>
          <div className="flex flex-col md:flex-row md:gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Базова ціна</label>
              <input
                type="number"
                value={baseValue}
                onChange={(e) => setBaseValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Ціна продажу</label>
              <input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Слот (для екіпіровки)</label>
              <input
                type="text"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="head, body, weapon…"
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Атака</label>
              <input
                type="number"
                value={atk}
                onChange={(e) => setAtk(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Захист</label>
              <input
                type="number"
                value={defense}
                onChange={(e) => setDefense(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">HP</label>
              <input
                type="number"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">MP</label>
              <input
                type="number"
                value={mp}
                onChange={(e) => setMp(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus;border border-amber-500"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Рівень (вимога)</label>
              <input
                type="number"
                value={levelReq}
                onChange={(e) => setLevelReq(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300">Клас (вимога)</label>
              <input
                type="text"
                value={classReq}
                onChange={(e) => setClassReq(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="Напр., warrior, mage…"
              />
            </div>
            <div className="flex-1 flex items-center space-x-2 mt-6 md:mt-0">
              <label className="text-xs text-zinc-300">Стакований?</label>
              <input
                type="checkbox"
                checked={stackable}
                onChange={(e) => setStackable(e.target.checked)}
                className="w-4 h-4 text-amber-600 bg-zinc-800 border-zinc-700 rounded focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-sm font-medium text-black"
            >
              {saving ? (isNew ? "Створюємо…" : "Зберігаємо…") : isNew ? "Створити" : "Зберегти"}
            </button>
            {!isNew &&
              (isActive ? (
                <button
                  type="button"
                  onClick={deactivateItem}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-60 text-sm font-medium text-white"
                >
                  Деактивувати
                </button>
              ) : (
                <button
                  type="button"
                  onClick={activateItem}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-sm font-medium text-black"
                >
                  Активувати
                </button>
              ))}
          </div>
        </form>
      )}
    </div>
  );
}
