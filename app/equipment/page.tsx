"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import EquipmentBodyView, {
  EquipItem,
  SlotView,
} from "./EquipmentBodyView";

// якщо маєш типи в окремому файлі — можеш підключити звідти,
// але нижче я просто використовую shape з бекенду.
type InventoryItemDTO = {
  id: number;                // inv_id
  item_id: number;
  item_code: string;
  emoji: string | null;
  name: string;
  description: string | null;
  rarity: string | null;
  slot: string | null;
  stats: Record<string, any>;
  amount: number;
  is_equipped: boolean;
};

type InventoryListResponse = { items: InventoryItemDTO[] };

// обчислюємо tg_id (Telegram WebApp з fallback у localStorage)
function resolveTgId(): number | null {
  if (typeof window === "undefined") return null;
  const tg = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  if (tg?.id) return Number(tg.id);
  const raw = localStorage.getItem("tg_id");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isNaN(n) || n <= 0 ? null : n;
}

export default function EquipmentPage() {
  const router = useRouter();
  const [tgId, setTgId] = useState<number | null>(null);
  const [items, setItems] = useState<InventoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1) визначаємо tg_id
  useEffect(() => {
    const id = resolveTgId();
    if (!id) {
      setError(
        "Не вдалося визначити Telegram ID. Відкрий мініап із чату бота."
      );
      setLoading(false);
      return;
    }
    setTgId(id);
    localStorage.setItem("tg_id", String(id));
  }, []);

  // 2) тягнемо інвентар
  useEffect(() => {
    if (!tgId) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/proxy/api/inventory?tg_id=${tgId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as InventoryListResponse;
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e: any) {
        setError(String(e?.message || e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tgId]);

  // 3) мапимо інвентар у вигляд слотів
  const slots: SlotView[] = useMemo(() => {
    // ключ → локалізований заголовок
    const slotTitle: Record<string, string> = {
      head: "Голова",
      chest: "Броня",
      hands: "Руки",
      legs: "Ноги",
      weapon: "Зброя",
      shield: "Щит",
      trinket: "Талісман",
      ring: "Перстень",
      helmet: "Шолом", // на випадок, якщо бек присилає 'helmet'
      armor: "Броня",
      amulet: "Амулет",
    };

    // зручно мати стабільний порядок слотів
    const order = [
      "head",
      "chest",
      "hands",
      "legs",
      "weapon",
      "shield",
      "trinket",
      "ring",
    ];

    // групуємо всі предмети за слотом
    const bySlot: Record<string, InventoryItemDTO[]> = {};
    for (const it of items) {
      if (!it.slot) continue;
      const key = it.slot.toLowerCase();
      if (!bySlot[key]) bySlot[key] = [];
      bySlot[key].push(it);
    }

    const toEquipItem = (it: InventoryItemDTO): EquipItem => ({
      id: it.id,
      name: it.name,
      slot: it.slot || "",
      rarity: (it.rarity?.toLowerCase() as any) || null,
      equipped: it.is_equipped,
      atk: (it.stats?.atk ?? it.stats?.ATK ?? null) as number | null,
      defense: (it.stats?.def ?? it.stats?.DEF ?? it.stats?.defense ?? null) as
        | number
        | null,
      sell_price: (it as any).sell_price ?? null,
      description: it.description ?? null,
      tier: (it as any).tier ?? null,
    });

    const result: SlotView[] = [];
    for (const key of order) {
      const all = bySlot[key] || [];
      const equipped = all.find((x) => x.is_equipped) || null;

      result.push({
        slot: key,
        title: slotTitle[key] || key,
        equipped: equipped ? toEquipItem(equipped) : null,
        candidates: all.length,
      });
    }

    return result;
  }, [items]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-50 px-4 py-5">
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => router.push("/profile")}
          className="px-4 py-2 rounded-full border border-slate-600 bg-slate-900/70 text-sm"
        >
          ← Профіль
        </button>

        <button
          onClick={() => router.push("/inventory")}
          className="px-4 py-2 rounded-full border border-amber-500 bg-amber-500/10 text-amber-300 flex items-center gap-2 text-sm"
        >
          🎒 Інвентар
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        <span>🛡️</span> Спорядження
      </h1>
      <p className="text-slate-400 text-sm">
        Тут видно, що на тобі вдягнуто. Натисни на слот, щоб перейти в інвентар
        і обрати інший предмет.
      </p>

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-slate-400">Завантаження…</p>
      ) : (
        <EquipmentBodyView
          slots={slots}
          onSlotClick={() => router.push("/inventory")}
        />
      )}
    </div>
  );
}