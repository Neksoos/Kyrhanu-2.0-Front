"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

import { resolveTgId } from "@/lib/tg";

// =====================
// Types
// =====================
type CraftMaterial = {
  id?: number;
  code: string;
  name?: string;
  descr?: string;
  appearance_text?: string | null;

  profession?: string | null;
  source_type?: string | null;
  rarity?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CraftMaterialsResponse =
  | {
      ok?: boolean;
      items?: CraftMaterial[];
      materials?: CraftMaterial[];
      craft_materials?: CraftMaterial[];
    }
  | CraftMaterial[];

// =====================
// API
// =====================
async function fetchWithTgId<T>(url: string, tgId: number): Promise<T> {
  const res = await fetch(`/api/proxy${url}`, {
    headers: { "X-Tg-Id": String(tgId) },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.detail || data?.error || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

async function craftMaterialsFetcher(key: [string[], number]): Promise<CraftMaterial[]> {
  const [candidates, tgId] = key;

  let lastErr: any = null;

  for (const url of candidates) {
    try {
      const data = await fetchWithTgId<CraftMaterialsResponse>(url, tgId);
      const arr = Array.isArray(data)
        ? data
        : data.items ?? data.materials ?? data.craft_materials ?? [];

      return (arr || [])
        .filter(Boolean)
        .map((x: any) => ({
          id: x.id,
          code: String(x.code ?? ""),
          name: x.name ?? x.title ?? x.code,
          descr: x.descr ?? x.description ?? "",
          appearance_text: x.appearance_text ?? x.appearanceText ?? null,
          profession: x.profession ?? null,
          source_type: x.source_type ?? null,
          rarity: x.rarity ?? null,
          created_at: x.created_at ?? null,
          updated_at: x.updated_at ?? null,
        }));
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error("Не вдалося завантажити craft_materials.");
}

// =====================
// Helpers
// =====================
function isFlask(code: string) {
  return code.startsWith("alch_flask_");
}
function isBase(code: string) {
  return code.startsWith("alch_base_");
}

function itemIconPath(code: string) {
  return `/items/${code}.png`;
}

function rarityBadge(rarity?: string | null) {
  const r = (rarity || "").trim();
  if (!r) return null;

  const cls =
    r === "Вибраний"
      ? "border-amber-400/50 text-amber-200 bg-amber-500/10"
      : r === "Рідкісний"
      ? "border-sky-400/50 text-sky-200 bg-sky-500/10"
      : r === "Добротний"
      ? "border-emerald-400/50 text-emerald-200 bg-emerald-500/10"
      : "border-slate-500/40 text-slate-200 bg-white/5";

  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>{r}</span>;
}

// =====================
// Page
// =====================
export default function WorkshopShopPage() {
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);
  const [tab, setTab] = useState<"flasks" | "bases">("flasks");
  const [q, setQ] = useState("");

  // тостик
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // TG ID
  useEffect(() => {
    (async () => {
      const id = await resolveTgId();
      if (id) {
        setTgId(id);
        localStorage.setItem("tg_id", String(id));
      }
    })();
  }, []);

  // ✅ тепер наш реальний ендпоінт
  const candidates = useMemo(() => ["/api/craft_materials/shop"], []);

  const { data, error, isLoading, mutate } = useSWR<CraftMaterial[]>(
    tgId ? [candidates, tgId] : null,
    craftMaterialsFetcher
  );

  const filtered = useMemo(() => {
    const all = (data ?? []).filter((x) => x?.code);
    const shop = all.filter((x) => isFlask(x.code) || isBase(x.code));
    const tabbed = shop.filter((x) => (tab === "flasks" ? isFlask(x.code) : isBase(x.code)));

    const qq = q.trim().toLowerCase();
    if (!qq) return tabbed;

    return tabbed.filter((x) => {
      const name = (x.name || "").toLowerCase();
      const code = (x.code || "").toLowerCase();
      const descr = (x.descr || "").toLowerCase();
      const ap = (x.appearance_text || "").toLowerCase();
      return name.includes(qq) || code.includes(qq) || descr.includes(qq) || ap.includes(qq);
    });
  }, [data, tab, q]);

  const handleBuy = (m: CraftMaterial) => {
    // поки немає API покупки — робимо "імітацію"
    setToast(`🛒 "${m.name || m.code}" — покупка буде додана після API 🙂`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl relative">
        <div className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(245,158,11,0.22),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(34,197,94,0.18),transparent_60%)]" />

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed left-1/2 -translate-x-1/2 top-4 z-50 px-3 py-2 rounded-xl border border-white/10 bg-black/60 backdrop-blur text-sm shadow-xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-xl mb-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80">
                Майстерня
              </div>
              <h1 className="text-xl font-semibold mt-0.5">🛒 Реміснича лавка</h1>
              <p className="text-sm text-slate-200 mt-1">
                Тут продаються базові матеріали для ремесел. Поки що: флакони та основи для зілля.
              </p>
            </div>

            <button
              onClick={() => mutate()}
              className="shrink-0 text-[11px] px-2.5 py-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.98]"
              title="Оновити список"
            >
              ⟳
            </button>
          </div>

          {/* Tabs + Search */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setTab("flasks")}
                className={
                  "flex-1 h-9 rounded-xl text-sm font-medium border transition " +
                  (tab === "flasks"
                    ? "bg-amber-500 text-black border-amber-300/40"
                    : "bg-white/5 border-white/10 hover:bg-white/10")
                }
              >
                🧴 Флакони
              </button>
              <button
                onClick={() => setTab("bases")}
                className={
                  "flex-1 h-9 rounded-xl text-sm font-medium border transition " +
                  (tab === "bases"
                    ? "bg-emerald-500 text-black border-emerald-300/40"
                    : "bg-white/5 border-white/10 hover:bg-white/10")
                }
              >
                💧 Основи
              </button>
            </div>

            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Пошук…"
                className="w-full h-9 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none focus:border-amber-300/40"
              />
              {!!q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 text-xs hover:text-white"
                  title="Очистити"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Body */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-xl overflow-hidden"
        >
          {isLoading && <div className="p-4 text-sm text-slate-200">Завантаження товарів…</div>}

          {error && (
            <div className="p-4 text-sm text-rose-300">
              Помилка завантаження: {String((error as any)?.message || error)}
            </div>
          )}

          {!isLoading && !error && (
            <AnimatePresence initial={false}>
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 text-sm text-slate-300"
                >
                  Немає товарів у цій вкладці.
                </motion.div>
              ) : (
                <motion.ul
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="divide-y divide-white/10"
                >
                  {filtered.map((m) => (
                    <li key={m.code} className="p-3">
                      <div className="flex gap-3">
                        <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                          <Image
                            src={itemIconPath(m.code)}
                            alt={m.name || m.code}
                            fill
                            className="object-cover"
                            onError={(e: any) => {
                              try {
                                e.currentTarget.src = "/items/placeholder.png";
                              } catch {}
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{m.name || m.code}</div>
                              <div className="text-[11px] text-slate-400 font-mono truncate">{m.code}</div>
                            </div>
                            {rarityBadge(m.rarity)}
                          </div>

                          {!!m.descr && (
                            <div className="mt-1 text-[12px] text-slate-200 leading-snug line-clamp-2">
                              {m.descr}
                            </div>
                          )}

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="text-[11px] text-slate-400">
                              Ціна: <span className="text-slate-200">—</span>
                              <span className="ml-2 opacity-70">(додамо після API покупки)</span>
                            </div>

                            <button
                              onClick={() => handleBuy(m)}
                              className="h-9 px-3 rounded-xl bg-emerald-500 text-black text-sm font-semibold hover:brightness-110 active:scale-[0.98]"
                              title="Поки без API — покаже повідомлення"
                            >
                              Купити
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Footer */}
        <div className="relative mt-3">
          <button
            onClick={() => router.push("/workshop")}
            className="w-full rounded-xl px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-white/10"
          >
            ⬅ Назад у майстерню
          </button>
        </div>
      </div>
    </main>
  );
}