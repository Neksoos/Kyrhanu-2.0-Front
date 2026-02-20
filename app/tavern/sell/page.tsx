"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SellItem = {
  inv_id: number;
  item_id: number;
  code: string;
  name: string;
  emoji: string | null;
  rarity: string | null;
  amount: number;
  base_value: number;
  total_value: number;
};

type SellListResponse = {
  items: SellItem[];
};

function rarityColor(r?: string | null): string {
  switch (r) {
    case "uncommon":
      return "text-emerald-300";
    case "rare":
      return "text-sky-300";
    case "epic":
      return "text-fuchsia-300";
    case "legendary":
      return "text-amber-300";
    default:
      return "text-slate-100";
  }
}

function rarityBorder(r?: string | null): string {
  switch (r) {
    case "uncommon":
      return "border-emerald-400/70";
    case "rare":
      return "border-sky-400/70";
    case "epic":
      return "border-fuchsia-400/70";
    case "legendary":
      return "border-amber-400/70";
    default:
      return "border-slate-700/80";
  }
}

/**
 * ВАЖЛИВО:
 * Для авторизації бекенду потрібен Telegram.WebApp.initData (рядок).
 */
function getInitData(): string | null {
  if (typeof window === "undefined") return null;
  const tg = (window as any).Telegram?.WebApp;
  const initData = tg?.initData;
  if (typeof initData === "string" && initData.trim().length > 0) return initData;
  return null;
}

/**
 * public/items/*.png -> доступно як /items/*.png
 * Очікуємо що item.code === назва файлу без .png
 */
function itemIconSrc(code?: string | null): string | null {
  const c = (code ?? "").trim();
  if (!c) return null;
  return `/items/${c}.png`;
}

export default function TavernSellPage() {
  const router = useRouter();

  const [initData, setInitData] = useState<string | null>(null);
  const [items, setItems] = useState<SellItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setInitData(getInitData());
  }, []);

  async function loadSellList(initDataStr: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/proxy/api/tavern/sell/list`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "X-Init-Data": initDataStr,
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("tavern sell list error", res.status, txt);
        setItems([]);
        setError("Не вдалось завантажити список для продажу");
        return;
      }

      const data = (await res.json()) as SellListResponse;
      setItems(data.items || []);
    } catch (e) {
      console.error("tavern sell list error", e);
      setItems([]);
      setError("Помилка при завантаженні");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initData) {
      setLoading(false);
      setItems([]);
      setError("Немає Telegram initData. Відкрий гру всередині Telegram.");
      return;
    }
    loadSellList(initData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  async function sellStack(item: SellItem) {
    if (!initData || busy) return;

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/proxy/api/tavern/sell/${item.inv_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Init-Data": initData,
        },
        body: JSON.stringify({
          amount: item.amount,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("tavern sell error", res.status, txt);
        setError("Не вдалось продати предмет");
      } else {
        setSuccess(`Ти продав ${item.amount}× «${item.name}» за ${item.total_value} червонців.`);
        await loadSellList(initData);
      }
    } catch (e) {
      console.error("tavern sell error", e);
      setError("Сталася помилка при продажу");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-50 px-4 py-5">
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => router.push("/tavern")}
          className="px-4 py-2 rounded-full border border-slate-600 bg-slate-900/70 text-sm"
        >
          ← До корчми
        </button>

        <button
          onClick={() => router.push("/inventory")}
          className="px-4 py-2 rounded-full border border-sky-500 bg-sky-500/10 text-sky-300 flex items-center gap-2 text-sm"
        >
          🎒 Інвентар
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">🍺 Продаж у корчмі</h1>
      <p className="text-slate-400 text-sm mb-3">
        Тут можна продати весь зайвий мотлох, інгредієнти й спорядження за червонці.
      </p>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {loading && (
        <p className="text-sm text-slate-400 mb-3">
          {initData ? "Корчмар перебирає твій мотлох…" : "Очікуємо дані Telegram…"}
        </p>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          Продавати нічого — або в інвентарі порожньо, або всі речі без вартості.
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2">
        {items.map((it) => {
          const src = itemIconSrc(it.code);

          return (
            <div
              key={it.inv_id}
              className={`flex items-center justify-between rounded-2xl border bg-slate-900/80 px-3 py-2 ${rarityBorder(
                it.rarity,
              )}`}
            >
              <div className="flex items-center gap-3">
                {/* ICON */}
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center overflow-hidden">
                  {/* Якщо png існує — буде показано. Якщо ні — img сховається, а span (emoji) відкриється */}
                  {src ? (
                    <>
                      <img
                        src={src}
                        alt={it.name}
                        className="w-9 h-9 object-contain"
                        onError={(e) => {
                          // ховаємо img
                          e.currentTarget.style.display = "none";
                          // показуємо emoji span (наступний sibling)
                          const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (next) next.style.display = "block";
                        }}
                      />
                      <span className="hidden text-2xl">{it.emoji || "🎒"}</span>
                    </>
                  ) : (
                    <span className="text-2xl">{it.emoji || "🎒"}</span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className={`text-sm font-semibold leading-tight ${rarityColor(it.rarity)}`}>{it.name}</span>
                  <span className="text-xs text-slate-400">
                    Кількість: {it.amount} · За штуку: {it.base_value} ч.
                  </span>
                  <span className="text-xs text-amber-300">Разом: {it.total_value} червонців</span>
                </div>
              </div>

              <button
                disabled={busy}
                onClick={() => sellStack(it)}
                className="px-3 py-1.5 rounded-xl border border-amber-400 bg-amber-500/15 text-xs font-semibold text-amber-200 disabled:opacity-60"
              >
                Продати все
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}