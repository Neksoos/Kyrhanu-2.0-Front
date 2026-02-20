// app/inventory/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import InventoryGrid from "../_components/InventoryGrid";
import ItemModal from "../_components/ItemModal";
import BackButton from "../_components/BackButton";

import type { InventoryItemDTO } from "@/types/items";
import { resolveTgId } from "@/lib/tg";

type InventoryListResponse = {
  items: InventoryItemDTO[];
};

export default function InventoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<InventoryItemDTO[]>([]);
  const [selected, setSelected] = useState<InventoryItemDTO | null>(null);

  const [tgId, setTgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────
  // Отримати tg_id (WebApp + localStorage)
  // ─────────────────────────────
  useEffect(() => {
    let id = resolveTgId() ?? null;

    if (!id && typeof window !== "undefined") {
      const raw = localStorage.getItem("tg_id");
      if (raw) {
        const n = Number(raw);
        if (!Number.isNaN(n) && n > 0) id = n;
      }
    }

    if (!id) {
      setError("Не вдалося визначити Telegram ID. Відкрий мініап з чату бота.");
      setLoading(false);
      return;
    }

    setTgId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("tg_id", String(id));
    }
  }, []);

  // ─────────────────────────────
  // Завантаження інвентаря
  // ─────────────────────────────
  async function loadInventory(id: number) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/proxy/api/inventory?tg_id=${id}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("inventory load error", res.status);
        setItems([]);
        setError("Не вдалося завантажити інвентар.");
        return;
      }

      const data = (await res.json()) as InventoryListResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error("inventory load error", e);
      setItems([]);
      setError("Не вдалося завантажити інвентар.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tgId) void loadInventory(tgId);
  }, [tgId]);

  // ─────────────────────────────
  // Стани завантаження / помилки
  // ─────────────────────────────
  if (loading && !items.length && !error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Завантаження інвентаря…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center px-4 text-center text-sm">
        {error}
      </main>
    );
  }

  // ─────────────────────────────
  // Основний екран рюкзака
  // ─────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-md">
        {/* Sticky верхній бар */}
        <header
          className="
            sticky top-0 z-20 mb-4
            bg-gradient-to-b from-slate-950 via-slate-900 to-transparent
            pt-[calc(env(safe-area-inset-top)+12px)] pb-3
          "
        >
          <div className="flex items-center gap-3 px-1">
            <BackButton href="/profile" label="Повернутися у профіль" title="Профіль" />

            <div className="flex-1">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <span>🎒</span> Інвентар
              </h1>
              <p className="text-sm text-slate-400">Усі речі, які ти носиш із собою.</p>
            </div>

            {/* ✅ КНОПКА "РЕСУРСИ" */}
            <button
              type="button"
              onClick={() => router.push("/inventory/resources")}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-600/80 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-amber-400/80 hover:bg-slate-900/90 hover:text-amber-200 transition"
              title="Відкрити ресурси"
            >
              <span className="text-base">🧺</span>
              <span>Ресурси</span>
            </button>
          </div>
        </header>

        {/* сам рюкзак */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-700/70 px-3 py-3 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Рюкзак
            </div>
            <div className="text-[11px] text-slate-400">
              Натисни на предмет, щоб побачити опис і стати
            </div>
          </div>

          <InventoryGrid items={items} onSelect={(item) => setSelected(item)} />
        </section>

        {/* модалка предмета */}
        {selected && tgId !== null && (
          <ItemModal
            item={selected}
            tgId={tgId}
            onClose={() => setSelected(null)}
            onUpdated={() => {
              if (tgId) void loadInventory(tgId);
            }}
          />
        )}
      </div>
    </main>
  );
}