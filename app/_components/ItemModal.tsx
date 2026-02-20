// ItemModal.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import type { InventoryItemDTO } from "@/types/items";

type Props = {
  item: InventoryItemDTO | null;
  tgId: number;
  onClose: () => void;
  onUpdated?: () => void;
};

function rarityStyle(rarity: string | null) {
  if (!rarity) return "text-slate-300";

  const r = rarity.toLowerCase();
  if (r.includes("леген") || r.includes("legend")) return "text-amber-300";
  if (r.includes("еп") || r.includes("epic")) return "text-violet-300";
  if (r.includes("рід") || r.includes("rare")) return "text-sky-300";

  return "text-slate-300";
}

function slotName(slot: string | null) {
  if (!slot) return null;
  const map: Record<string, string> = {
    helmet: "Шолом",
    armor: "Броня",
    weapon: "Зброя",
    shield: "Щит",
    ring: "Перстень",
    amulet: "Амулет",
    trinket: "Талісман",
    boots: "Чоботи",
  };
  return map[slot] || slot;
}

/** ✅ Назви характеристик українською */
function statLabel(key: string): string {
  const k = String(key ?? "").trim().toUpperCase();

  const map: Record<string, string> = {
    HP: "Здоров’я",
    DEF: "Захист",
    ATK: "Атака",
    DMG: "Шкода",

    LOOT_WEIGHT: "Вантажопідйомність",
    WEIGHT: "Обтяження",

    CRIT: "Шанс криту",
    CRIT_DMG: "Критична шкода",
    EVADE: "Ухилення",
    ACC: "Точність",
    SPEED: "Швидкість",
    REGEN: "Регенерація",
  };

  if (map[k]) return map[k];

  return k
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatStatValue(v: number | string): string {
  if (typeof v === "number") return v > 0 ? `+${v}` : `${v}`;
  return String(v);
}

function normalizeApiErrorText(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "Сталася помилка.";

  const map: Record<string, string> = {
    ITEM_NOT_FOUND: "Предмет не знайдено.",
    ITEM_HAS_NO_SLOT: "Цей предмет не має слота — його не можна екіпірувати.",
    INVALID_SLOT: "Цей слот зараз не підтримується.",
    ITEM_NOT_USABLE: "Цей предмет не можна вжити.",
    NOT_ENOUGH_QTY: "Недостатньо кількості предмета.",
  };

  if (map[s]) return map[s];

  return s.length > 160 ? s.slice(0, 160) + "…" : s;
}

async function readErrorFromResponse(res: Response): Promise<string> {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json().catch(() => null);
      const msg =
        (data && typeof (data as any).error === "string" && (data as any).error) ||
        (data && typeof (data as any).detail === "string" && (data as any).detail) ||
        (data && typeof (data as any).message === "string" && (data as any).message) ||
        "";
      if (msg) return normalizeApiErrorText(msg);
    }

    const t = await res.text().catch(() => "");
    if (t) return normalizeApiErrorText(t);
  } catch {}

  return `Помилка (${res.status}).`;
}

/**
 * ✅ Кількість предметів у стосі (підтримує qty або legacy amount)
 */
function getItemQty(item: InventoryItemDTO): number {
  const anyItem = item as any;
  const q = Number(anyItem.qty ?? anyItem.amount ?? 1);
  if (!Number.isFinite(q) || q <= 0) return 1;
  return Math.floor(q);
}

/**
 * ✅ Гарантований детектор "можна вжити" без category/stackable
 * Бо бекенд їх не віддає в InventoryItemDTO.
 * Працює для їжі/поїлок з stats {hp/mp/energy} і для твоїх прикладів типу {"mp": 35}.
 */
function canConsumeItem(item: InventoryItemDTO): boolean {
  const anyItem = item as any;

  const stats = (anyItem.stats ?? {}) as Record<string, any>;
  const hp = Number(stats.hp ?? stats.HP ?? 0);
  const mp = Number(stats.mp ?? stats.MP ?? 0);
  const energy = Number(stats.energy ?? stats.ENERGY ?? 0);

  const qty = getItemQty(item);

  // ✅ не екіп, не має слота (slot використовується для екіпу), є кількість і хоч один ефект
  return !anyItem.is_equipped && !anyItem.slot && qty > 0 && (hp > 0 || mp > 0 || energy > 0);
}

export default function ItemModal({ item, tgId, onClose, onUpdated }: Props) {
  if (!item) return null;

  const iconSrc = useMemo(() => {
    const code = (item.item_code || "").trim();
    return code ? `/items/${code}.png` : "";
  }, [item.item_code]);

  const [imgOk, setImgOk] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canEquip = !item.is_equipped && !!item.slot;

  // ✅ чи можна “вжити”
  const canConsume = canConsumeItem(item);

  const equip = async () => {
    if (busy) return;
    setBusy(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/proxy/api/inventory/equip/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tg_id: tgId }),
      });

      if (!res.ok) {
        setActionError(await readErrorFromResponse(res));
        return;
      }

      onUpdated?.();
      onClose();
    } catch (e) {
      setActionError(normalizeApiErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const unequip = async () => {
    if (busy) return;
    setBusy(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/proxy/api/inventory/unequip/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tg_id: tgId }),
      });

      if (!res.ok) {
        setActionError(await readErrorFromResponse(res));
        return;
      }

      onUpdated?.();
      onClose();
    } catch (e) {
      setActionError(normalizeApiErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  // ✅ consume
  const consume = async () => {
    if (busy) return;
    setBusy(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/proxy/api/inventory/consume/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tg_id: tgId, qty: 1 }),
      });

      if (!res.ok) {
        setActionError(await readErrorFromResponse(res));
        return;
      }

      onUpdated?.();
      onClose();
    } catch (e) {
      setActionError(normalizeApiErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const hasStats = item.stats && Object.keys(item.stats).length > 0;
  const q = getItemQty(item);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-700">
        <div className="flex justify-center mb-3">
          <div className="relative w-24 h-24 rounded-2xl bg-slate-800/60 border border-slate-700/60 overflow-hidden">
            {iconSrc && imgOk ? (
              <Image
                src={iconSrc}
                alt={item.name}
                fill
                sizes="96px"
                className="object-contain p-2 drop-shadow"
                onError={() => setImgOk(false)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">
                {item.emoji ?? "🎒"}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-center mb-1">{item.name}</h2>

        {item.rarity && (
          <p className={`text-center text-sm font-semibold mb-2 ${rarityStyle(item.rarity)}`}>
            {item.rarity}
          </p>
        )}

        {slotName(item.slot) && (
          <p className="text-center text-sm text-slate-400 mb-2">
            Слот: {slotName(item.slot)}
          </p>
        )}

        <p className="text-center text-sm text-slate-400 mb-3">Кількість: {q}</p>

        {item.description && (
          <p className="mt-2 text-slate-300 text-sm text-center leading-5">
            {item.description}
          </p>
        )}

        {hasStats && (
          <div className="mt-4 bg-black/40 p-4 rounded-xl text-sm border border-slate-700">
            <div className="font-bold mb-2 text-slate-200">Бонуси:</div>
            <div className="space-y-1">
              {(Object.entries(item.stats ?? {}) as [string, number | string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-300">{statLabel(k)}</span>
                  <span className="text-green-300">{formatStatValue(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {actionError && (
          <div className="mt-4 text-sm text-rose-300 bg-rose-950/30 border border-rose-800/40 rounded-xl px-3 py-2">
            {actionError}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {canEquip && (
            <button
              onClick={equip}
              disabled={busy}
              className="w-full bg-green-600 hover:bg-green-500 py-2.5 rounded-lg text-white font-bold"
            >
              {busy ? "..." : "Екіпувати"}
            </button>
          )}

          {item.is_equipped && (
            <button
              onClick={unequip}
              disabled={busy}
              className="w-full bg-red-600 hover:bg-red-500 py-2.5 rounded-lg text-white font-bold"
            >
              {busy ? "..." : "Зняти"}
            </button>
          )}

          {/* ✅ Вжити */}
          {canConsume && (
            <button
              onClick={consume}
              disabled={busy}
              className="w-full bg-amber-600 hover:bg-amber-500 py-2.5 rounded-lg text-black font-extrabold"
              title="Вжити 1 шт"
            >
              {busy ? "..." : "Вжити"}
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          disabled={busy}
          className="mt-4 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-white"
        >
          Закрити
        </button>
      </div>
    </div>
  );
}