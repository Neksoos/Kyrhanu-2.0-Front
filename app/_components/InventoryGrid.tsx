"use client";

import { useState } from "react";
import type { InventoryItemDTO } from "../types/items";

type Props = {
  items: InventoryItemDTO[];
  onSelect: (item: InventoryItemDTO) => void;

  // ✅ нове: виклик “вжити” (сторінка/контейнер робить API + оновлення інвентаря)
  onUse?: (item: InventoryItemDTO) => void | Promise<void>;
};

const TOTAL_SLOTS = 40;

function rarityColor(rarity: string | null): string {
  if (!rarity) return "border-slate-600 bg-slate-800";

  const r = rarity.toLowerCase();
  if (r.startsWith("леген") || r.includes("legend")) {
    return "border-amber-400 bg-amber-950/30";
  }
  if (r.startsWith("еп") || r.includes("epic")) {
    return "border-violet-400 bg-violet-950/30";
  }
  if (r.startsWith("рід") || r.includes("rare")) {
    return "border-sky-400 bg-sky-950/30";
  }
  return "border-slate-600 bg-slate-800";
}

function getItemCode(item: InventoryItemDTO): string | null {
  const anyItem = item as any;
  return (
    anyItem.code ||
    anyItem.item_code ||
    anyItem.template_code ||
    anyItem.slug ||
    anyItem.key ||
    null
  );
}

function getItemIconSrc(item: InventoryItemDTO): string | null {
  const code = getItemCode(item);
  if (!code) return null;
  return `/items/${code}.png`;
}

function getItemQty(item: InventoryItemDTO): number {
  const anyItem = item as any;
  const q = Number(anyItem.qty ?? anyItem.amount ?? 1);
  if (!Number.isFinite(q) || q <= 0) return 1;
  return Math.floor(q);
}

// ✅ простий детектор їжі (під твою БД: items.category = 'food')
function isFood(item: InventoryItemDTO): boolean {
  const anyItem = item as any;
  const cat = String(anyItem.category ?? "").toLowerCase();
  if (cat.includes("food") || cat.includes("їжа") || cat.includes("еда")) return true;

  // запасний варіант: якщо немає category, але є stats з hp/mp/energy і предмет stackable
  const stats = anyItem.stats ?? {};
  const hasRestore =
    Number(stats.hp ?? 0) > 0 || Number(stats.mp ?? 0) > 0 || Number(stats.energy ?? 0) > 0;
  const stackable = Boolean(anyItem.stackable);
  return stackable && hasRestore;
}

/**
 * ✅ Іконка займає ВСЮ клітинку
 */
function ItemIcon({ item }: { item: InventoryItemDTO }) {
  const src = getItemIconSrc(item);
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div className="w-full h-full flex items-center justify-center text-4xl drop-shadow">
        {item.emoji || "🎒"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={item.name}
      className="w-full h-full object-contain drop-shadow select-none"
      draggable={false}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

export default function InventoryGrid({ items, onSelect, onUse }: Props) {
  const slots: (InventoryItemDTO | null)[] = Array.from(
    { length: TOTAL_SLOTS },
    (_, i) => items[i] ?? null
  );

  return (
    <div className="mt-4 grid grid-cols-4 gap-3">
      {slots.map((item, idx) =>
        item ? (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`relative aspect-square rounded-2xl p-1
                        flex items-center justify-center
                        border shadow-sm transition
                        ${rarityColor(item.rarity)}
                        ${
                          item.is_equipped
                            ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-black"
                            : ""
                        }
                        hover:scale-105 active:scale-95`}
            aria-label={item.name}
            title={item.name}
          >
            {/* контейнер іконки */}
            <div className="w-full h-full flex items-center justify-center">
              <ItemIcon item={item} />
            </div>

            {/* ✅ Кнопка “Вжити” (тільки для їжі) */}
            {onUse && isFood(item) && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // ✅ щоб не тригерити onSelect
                  void onUse(item);
                }}
                className="absolute top-1 right-1 rounded-full bg-black/70 border border-slate-500/40
                           px-2 py-1 text-[10px] leading-none hover:bg-black/85 active:scale-95"
                aria-label={`Вжити: ${item.name}`}
                title="Вжити"
              >
                🍽
              </button>
            )}

            {item.is_equipped && (
              <span className="absolute -top-1 -left-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400 text-black font-semibold">
                Екіп.
              </span>
            )}

            {(() => {
              const q = getItemQty(item);
              return q > 1 ? (
                <span className="absolute -bottom-1 -right-1 text-[10px] bg-black/70 px-1.5 py-0.5 rounded-full">
                  ×{q}
                </span>
              ) : null;
            })()}
          </button>
        ) : (
          <div
            key={`empty-${idx}`}
            className="aspect-square rounded-2xl border border-slate-700/70 bg-slate-900/40"
          />
        )
      )}
    </div>
  );
}