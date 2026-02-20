// app/equipment/EquipmentBodyView.tsx
"use client";

import React from "react";

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface EquipItem {
  id: number;
  name: string;
  slot: string;
  tier?: number | null;
  rarity?: Rarity | null;
  equipped?: boolean;
  atk?: number | null;
  defense?: number | null;
  sell_price?: number | null;
  description?: string | null;
}

export interface SlotView {
  slot: string;          // "weapon" | "head" | "shield" ...
  title: string;         // "Зброя", "Голова"...
  equipped?: EquipItem | null;
  candidates: number;
}

interface EquipmentBodyViewProps {
  slots: SlotView[];
  onSlotClick?: (slot: SlotView) => void;
}

const rarityText: Record<Rarity, string> = {
  common: "Звичайний",
  uncommon: "Незвичайний",
  rare: "Рідкісний",
  epic: "Епічний",
  legendary: "Легендарний",
};

const rarityColor: Record<Rarity, string> = {
  common: "text-slate-100",
  uncommon: "text-emerald-300",
  rare: "text-sky-300",
  epic: "text-fuchsia-300",
  legendary: "text-amber-300",
};

const rarityBorder: Record<Rarity, string> = {
  common: "border-slate-600",
  uncommon: "border-emerald-400/80",
  rare: "border-sky-400/80",
  epic: "border-fuchsia-400/80",
  legendary: "border-amber-400/80",
};

const slotEmoji: Record<string, string> = {
  head: "🪖",
  chest: "🧥",
  hands: "🧤",
  legs: "🥾",
  weapon: "⚔️",
  shield: "🛡️",
  trinket: "🔮",
  ring: "💍",
};

function getSlot(slots: SlotView[], key: string): SlotView | null {
  return slots.find((s) => s.slot === key) ?? null;
}

function SlotCard({
  view,
  onClick,
}: {
  view: SlotView;
  onClick?: () => void;
}) {
  const item = view.equipped || null;
  const rarity: Rarity = (item?.rarity as Rarity) ?? "common";
  const hasItem = !!item;

  const emoji = slotEmoji[view.slot] || "•";

  const atk = item?.atk ?? null;
  const def = item?.defense ?? null;
  const statsParts: string[] = [];
  if (atk) statsParts.push(`🗡 ${atk}`);
  if (def) statsParts.push(`🛡 ${def}`);
  const statsText = statsParts.join("   ");

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl border px-3 py-2.5 text-left",
        "bg-slate-950/85 hover:bg-slate-900 transition-colors",
        "shadow-md shadow-black/50",
        rarityBorder[rarity] ?? "border-slate-600",
      ].join(" ")}
    >
      <div className="flex gap-3">
        <div className="mt-1 text-2xl">{emoji}</div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] tracking-[0.16em] text-slate-300/80 uppercase">
            {view.title}
          </div>

          <div
            className={[
              "mt-0.5 text-sm font-semibold leading-tight line-clamp-2",
              rarityColor[rarity] ?? "text-slate-100",
            ].join(" ")}
          >
            {hasItem ? item!.name : "Порожньо"}
          </div>

          <div className="mt-0.5 text-[11px] text-slate-300/80">
            {hasItem
              ? rarityText[rarity]
              : view.candidates > 0
              ? `Є варіанти під цей слот: ${view.candidates}`
              : "Поки нічого під цей слот"}
          </div>

          {hasItem && (statsText || item.description) && (
            <div className="mt-1 space-y-0.5 text-[11px] text-slate-300/90">
              {statsText && <div>{statsText}</div>}
              {item.description && (
                <div className="line-clamp-2">{item.description}</div>
              )}
            </div>
          )}

          {hasItem && (
            <div className="mt-1 text-[11px] text-emerald-300">
              Натисни, щоб зняти або замінити
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

const EquipmentBodyView: React.FC<EquipmentBodyViewProps> = ({
  slots,
  onSlotClick,
}) => {
  // порядок слотів
  const slotKeys = [
    "head",
    "chest",
    "hands",
    "legs",
    "weapon",
    "shield",
    "trinket",
    "ring",
  ];

  const bySlot: Record<string, SlotView> = {};
  for (const key of slotKeys) {
    bySlot[key] =
      getSlot(slots, key) ??
      ({
        slot: key,
        title:
          key === "head"
            ? "Голова"
            : key === "chest"
            ? "Броня"
            : key === "hands"
            ? "Руки"
            : key === "legs"
            ? "Ноги"
            : key === "weapon"
            ? "Зброя"
            : key === "shield"
            ? "Щит"
            : key === "trinket"
            ? "Талісман"
            : key === "ring"
            ? "Перстень"
            : key,
        equipped: null,
        candidates: 0,
      } as SlotView);
  }

  const orderedSlots = slotKeys.map((k) => bySlot[k]);

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* блок із силуетом */}
      <div
        className="relative w-full h-[40vh] rounded-3xl border border-slate-700/70 shadow-xl overflow-hidden bg-slate-950"
        style={{
          backgroundImage: "url(/equipment/body.png)",
          backgroundSize: "contain",        // 🔎 показуємо силует повністю
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.18),_transparent_65%)]" />
      </div>

      {/* слоти під силуетом */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {orderedSlots.map((view) => (
          <SlotCard
            key={view.slot}
            view={view}
            onClick={
              onSlotClick
                ? () => {
                    onSlotClick(view);
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

export default EquipmentBodyView;