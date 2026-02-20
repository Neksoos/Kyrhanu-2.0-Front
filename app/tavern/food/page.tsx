"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Loader2, ShoppingCart, Soup, Plus, Minus } from "lucide-react";
import { getJSON, postJSON } from "@/lib/api";

type FoodShopItem = {
  item_id: number;
  code: string;
  name: string;
  emoji?: string | null;
  rarity?: string | null;
  price: number;
  hp_restore: number;
  mp_restore: number;
};

type FoodShopListResponse = {
  items: FoodShopItem[];
};

type FoodBuyResponse = {
  ok: boolean;
  item_id: number;
  item_name: string;
  qty: number;
  price_total: number;
  hp: number;
  hp_max: number;
  mp: number;
  mp_max: number;
  chervontsi: number;

  daily_applied?: boolean;
  daily_xp?: number;
  daily_chervontsi?: number;
  daily_kleynod?: boolean;
};

function rarityBadge(r?: string | null) {
  const v = (r || "").toLowerCase();
  if (v === "legendary" || v === "mythic")
    return "border-amber-400/70 text-amber-300 bg-amber-500/10";
  if (v === "epic")
    return "border-fuchsia-400/70 text-fuchsia-200 bg-fuchsia-500/10";
  if (v === "rare") return "border-sky-400/70 text-sky-200 bg-sky-500/10";
  if (v === "uncommon")
    return "border-emerald-400/70 text-emerald-200 bg-emerald-500/10";
  return "border-slate-700 text-slate-300 bg-slate-900/60";
}

export default function TavernFoodPage() {
  const router = useRouter();

  const [items, setItems] = useState<FoodShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hp, setHp] = useState<number | null>(null);
  const [hpMax, setHpMax] = useState<number | null>(null);
  const [mp, setMp] = useState<number | null>(null);
  const [mpMax, setMpMax] = useState<number | null>(null);
  const [coins, setCoins] = useState<number | null>(null);

  const [qtyById, setQtyById] = useState<Record<number, number>>({});
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ✅ іконки: якщо конкретний файл не знайшовся — fallback на emoji
  const [iconFail, setIconFail] = useState<Record<number, boolean>>({});

  const canRenderBars = useMemo(
    () => hp != null && hpMax != null && mp != null && mpMax != null,
    [hp, hpMax, mp, mpMax]
  );

  async function load() {
    try {
      setLoading(true);
      setError(null);

      // ✅ правильний шлях: proxy очікує /api/*
      const resp = await getJSON<FoodShopListResponse>("/api/tavern/food/list");
      setItems(resp?.items || []);

      // stats підтягуємо з /api/profile якщо є (опційно)
      try {
        const profile: any = await getJSON("/api/profile");

        const pCoins = Number(profile?.chervontsi);
        const pHp = Number(profile?.hp);
        const pMp = Number(profile?.mp);

        const pHpMax = Number(profile?.hp_max ?? profile?.stats?.hp_max);
        const pMpMax = Number(profile?.mp_max ?? profile?.stats?.mp_max);

        if (Number.isFinite(pCoins)) setCoins(pCoins);
        if (Number.isFinite(pHp)) setHp(pHp);
        if (Number.isFinite(pMp)) setMp(pMp);
        if (Number.isFinite(pHpMax)) setHpMax(pHpMax);
        if (Number.isFinite(pMpMax)) setMpMax(pMpMax);
      } catch {
        // ок — профіль може бути інший, сторінка все одно працює
      }
    } catch (e: any) {
      setError(e?.message || "Не вдалося завантажити їжу");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function qtyFor(id: number) {
    return Math.max(1, Math.min(50, qtyById[id] || 1));
  }

  function setQty(id: number, next: number) {
    setQtyById((prev) => ({ ...prev, [id]: Math.max(1, Math.min(50, next)) }));
  }

  async function buy(item: FoodShopItem) {
    const qty = qtyFor(item.item_id);

    try {
      setBuyingId(item.item_id);
      setToast(null);

      // ✅ правильний шлях: proxy очікує /api/*
      const res = await postJSON<FoodBuyResponse>(
        `/api/tavern/food/buy/${item.item_id}`,
        { qty }
      );

      if (!res?.ok) {
        setToast("Покупка не вдалася");
        return;
      }

      setHp(res.hp);
      setHpMax(res.hp_max);
      setMp(res.mp);
      setMpMax(res.mp_max);
      setCoins(res.chervontsi);

      let msg = `✅ ${res.item_name} ×${res.qty}`;
      if (res.daily_applied) {
        const xp = Number(res.daily_xp || 0);
        const ch = Number(res.daily_chervontsi || 0);
        const k = !!res.daily_kleynod;
        const parts = [
          xp > 0 ? `XP +${xp}` : null,
          ch > 0 ? `Червонці +${ch}` : null,
          k ? "Клейнод" : null,
        ].filter(Boolean);
        if (parts.length) msg += ` • 🎁 щоденний бонус: ${parts.join(", ")}`;
      }

      setToast(msg);
      setTimeout(() => setToast(null), 3500);
    } catch (e: any) {
      setToast(e?.message || "Помилка покупки");
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl relative overflow-hidden">
        <motion.div
          className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(248,250,252,0.14),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(251,191,36,0.24),transparent_60%),radial-gradient(circle_at_100%_0%,rgba(56,189,248,0.18),transparent_60%)]"
          animate={{ opacity: [0.2, 0.38, 0.24], scale: [1, 1.03, 1] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "mirror" }}
        />

        <motion.header
          className="relative mb-3 flex items-start justify-between gap-3"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-xl font-semibold tracking-wide flex items-center gap-2">
              <Soup className="w-5 h-5 text-amber-300" />
              <span>Їжа та напої</span>
            </h1>
            <p className="text-xs text-slate-400">Купи й одразу віднови HP/MP.</p>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[11px] text-slate-400">Червонці</div>
            <div className="text-sm font-semibold text-amber-300">
              {coins == null ? "—" : coins}
            </div>
          </div>
        </motion.header>

        {canRenderBars && (
          <div className="relative mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[11px] text-slate-400 mb-1">HP</div>
              <div className="text-sm font-semibold">
                {hp} / {hpMax}
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-400/80"
                  style={{
                    width: `${Math.max(0, Math.min(100, (hp! / hpMax!) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[11px] text-slate-400 mb-1">MP</div>
              <div className="text-sm font-semibold">
                {mp} / {mpMax}
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-400/80"
                  style={{
                    width: `${Math.max(0, Math.min(100, (mp! / mpMax!) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="relative mb-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <button
            type="button"
            onClick={() => router.push("/tavern")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900/70 border border-slate-700/70 px-4 py-3 text-sm font-semibold active:scale-[0.99] transition"
          >
            ← Назад у корчму
          </button>
        </div>

        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">Меню</div>
            <button
              type="button"
              onClick={load}
              className="text-[11px] text-slate-300 underline underline-offset-4 hover:text-amber-300 transition"
            >
              Оновити
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Завантаження…
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-6 text-sm text-rose-300">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="px-4 py-6 text-sm text-slate-400">
              Немає їжі у продажу (або в items.stats нема hp/mp).
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="divide-y divide-slate-800">
              {items.map((it) => {
                const qty = qtyFor(it.item_id);
                const total = it.price * qty;
                const disabled = buyingId === it.item_id;

                return (
                  <div key={it.item_id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          {/* ✅ ICON bigger (only change) */}
                          <div className="w-14 h-14 relative shrink-0">
                            {!iconFail[it.item_id] ? (
                              <Image
                                src={`/items/${it.code}.png`}
                                alt={it.name}
                                width={56}
                                height={56}
                                className="rounded-lg object-contain"
                                onError={() =>
                                  setIconFail((prev) => ({
                                    ...prev,
                                    [it.item_id]: true,
                                  }))
                                }
                                priority={false}
                              />
                            ) : (
                              <div className="w-14 h-14 flex items-center justify-center text-3xl">
                                {it.emoji || "🍲"}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {it.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                              <span
                                className={`px-2 py-0.5 rounded-full border ${rarityBadge(
                                  it.rarity
                                )}`}
                              >
                                {it.rarity || "common"}
                              </span>
                              {it.hp_restore > 0 && <span>❤️ +{it.hp_restore}</span>}
                              {it.mp_restore > 0 && <span>🔷 +{it.mp_restore}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-slate-400">Ціна</div>
                        <div className="text-sm font-semibold text-amber-300">
                          {it.price}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/30 px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => setQty(it.item_id, qty - 1)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 active:scale-95"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="w-10 text-center text-sm font-semibold">
                          {qty}
                        </div>
                        <button
                          type="button"
                          onClick={() => setQty(it.item_id, qty + 1)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => buy(it)}
                        disabled={disabled}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-slate-950 px-4 py-3 text-sm font-semibold shadow-lg shadow-emerald-700/30 active:scale-95 disabled:opacity-60"
                      >
                        {disabled ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-4 h-4" />
                        )}
                        Купити за {total}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            {toast}
          </motion.div>
        )}
      </div>
    </main>
  );
}