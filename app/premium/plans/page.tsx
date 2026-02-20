"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Tier = "none" | "water" | "molfar";

type SubItem = {
  kind?: "sub";
  tier?: "water" | "molfar";
  days?: number;
  title?: string;
  price_kleynody?: number;
  effects?: { daily?: number; cap?: number; carry_limit?: number };
};

type SubsCatalogResponse = {
  ok: boolean;
  now?: string;
  active_tier?: Tier;
  premium_water_until?: string | null;
  premium_molfar_until?: string | null;
  current_effects?: { daily?: number; cap?: number; carry_limit?: number };
  catalog?: Record<string, SubItem>;
};

type PurchaseResp = {
  ok: boolean;
  sku?: string;
  tier?: "water" | "molfar";
  days?: number;
  price_kleynody?: number;
  until?: string;
};

type ProfileResponse = {
  ok: boolean;
  player?: { kleynody?: number };
};

function getInitData(): string {
  if (typeof window === "undefined") return "";
  return String((window as any).Telegram?.WebApp?.initData || "");
}

export default function PremiumPlansPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"water" | "molfar">("water");

  const [kleynody, setKleynody] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<Record<string, SubItem> | null>(null);

  const [activeTier, setActiveTier] = useState<Tier>("none");
  const [waterUntil, setWaterUntil] = useState<string | null>(null);
  const [molfarUntil, setMolfarUntil] = useState<string | null>(null);

  const [busySku, setBusySku] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const items = useMemo(() => {
    const list: Array<{ sku: string; item: SubItem }> = [];
    if (!catalog) return list;
    for (const [sku, it] of Object.entries(catalog)) {
      if (it?.kind !== "sub") continue;
      list.push({ sku, item: it });
    }
    // стабільний порядок: 1d / 7d / 30d
    return list.sort((a, b) => Number(a.item.days || 0) - Number(b.item.days || 0));
  }, [catalog]);

  const visible = useMemo(() => {
    return items.filter((x) => (x.item.tier || "") === tab);
  }, [items, tab]);

  async function loadKleynodyBalance() {
    setError(null);
    try {
      const initData = getInitData();
      if (!initData) {
        setKleynody(null);
        return;
      }
      const r = await fetch(`/api/proxy/api/profile`, {
        method: "GET",
        cache: "no-store",
        headers: { "X-Init-Data": initData },
      });
      if (!r.ok) throw new Error("bad status");
      const data: ProfileResponse = await r.json();
      const k = data?.player?.kleynody;
      setKleynody(typeof k === "number" ? k : 0);
    } catch {
      setKleynody(null);
    }
  }

  async function loadSubsCatalog() {
    setError(null);
    try {
      const initData = getInitData();
      if (!initData) {
        setCatalog(null);
        setError("Відкрий сторінку всередині Telegram (Mini App), щоб завантажити підписки.");
        return;
      }

      const r = await fetch(`/api/proxy/api/premium/subs/catalog`, {
        method: "GET",
        cache: "no-store",
        headers: { "X-Init-Data": initData },
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`${r.status} ${t}`);
      }

      const data: SubsCatalogResponse = await r.json();

      setCatalog(data?.catalog || {});
      setActiveTier((data?.active_tier as Tier) || "none");
      setWaterUntil(data?.premium_water_until ?? null);
      setMolfarUntil(data?.premium_molfar_until ?? null);

      // Якщо активний мольфар — логічно одразу показати Premium+
      if ((data?.active_tier as Tier) === "molfar") setTab("molfar");
    } catch (e) {
      console.error("loadSubsCatalog error", e);
      setCatalog(null);
      setError("Не вдалось завантажити каталог підписок. Перевір /api/premium/subs/catalog.");
    }
  }

  useEffect(() => {
    loadKleynodyBalance();
    loadSubsCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function purchaseSub(sku: string, price: number, title: string) {
    if (busySku) return;

    setError(null);
    setSuccess(null);

    if (kleynody === null) {
      setError("Не бачу баланс клейнодів. Натисни «Оновити».");
      return;
    }
    if (kleynody < price) {
      setError("Недостатньо клейнодів для покупки.");
      return;
    }

    setBusySku(sku);

    try {
      const initData = getInitData();
      if (!initData) throw new Error("Missing Telegram initData");

      const r = await fetch(`/api/proxy/api/premium/subs/purchase`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Init-Data": initData },
        body: JSON.stringify({ sku }),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => null);
        const code = j?.code || "ERROR";
        if (code === "NOT_ENOUGH_KLEYNODY") {
          setError("Недостатньо клейнодів для покупки.");
          return;
        }
        setError(`Помилка покупки: ${code}`);
        return;
      }

      const data: PurchaseResp = await r.json();
      setKleynody((prev) => (typeof prev === "number" ? Math.max(0, prev - price) : prev));
      setSuccess(`Придбано: «${title}».`);

      // підтягнути актуальний статус і до-дату з бекенда
      setTimeout(() => {
        loadSubsCatalog();
        loadKleynodyBalance();
      }, 250);
    } catch (e) {
      console.error("purchaseSub error", e);
      setError("Не вдалось купити підписку. Перевір /api/premium/subs/purchase.");
    } finally {
      setBusySku(null);
    }
  }

  const untilText =
    activeTier === "molfar"
      ? molfarUntil
      : activeTier === "water"
      ? waterUntil
      : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 px-4 py-5">
      <div className="mx-auto w-full max-w-xl relative">
        <motion.div
          className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-40 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.25),transparent_55%),radial-gradient(circle_at_90%_10%,rgba(251,191,36,0.32),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(34,197,94,0.28),transparent_60%)]"
          animate={{ opacity: [0.3, 0.5, 0.35], scale: [1, 1.03, 1] }}
          transition={{ duration: 14, repeat: Infinity, repeatType: "mirror" }}
        />

        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-full border border-slate-700/80 bg-slate-900/80 text-xs font-medium text-slate-200 hover:border-sky-400 hover:text-sky-200 transition"
          >
            ← Назад
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadKleynodyBalance();
                loadSubsCatalog();
              }}
              className="px-3 py-2 rounded-full border border-slate-700/80 bg-slate-900/70 text-xs font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-200 transition"
            >
              🔄 Оновити
            </button>

            <button
              type="button"
              onClick={() => router.push("/premium-shop")}
              className="px-4 py-2 rounded-full border border-amber-400/80 bg-amber-500/10 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition"
            >
              💠 Купити клейноди
            </button>
          </div>
        </div>

        <motion.header className="mb-4" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/80 mb-1">Підписка</p>
          <h1 className="text-2xl font-bold tracking-wide flex items-center gap-2">
            <span className="text-amber-300">👑</span>
            <span>Преміум</span>
          </h1>

          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Баланс:</span>
              <span className="font-semibold text-amber-200">💠 {kleynody === null ? "—" : kleynody.toLocaleString("uk-UA")}</span>
            </div>

            <div className="text-right">
              <span className="text-slate-500">Активно:</span>{" "}
              <span className="font-semibold text-slate-200">
                {activeTier === "none" ? "немає" : activeTier === "water" ? "Преміум" : "Преміум+"}
              </span>
              {untilText ? <span className="text-slate-500"> до {new Date(untilText).toLocaleString("uk-UA")}</span> : null}
            </div>
          </div>
        </motion.header>

        {error && (
          <div className="mb-3 rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            {success}
          </div>
        )}

        <div className="mb-3 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("water")}
              className={[
                "px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition",
                tab === "water" ? "border-amber-400/80 bg-amber-500/10 text-amber-100" : "border-slate-700/80 bg-slate-900/50 text-slate-200 hover:border-slate-500/80",
              ].join(" ")}
            >
              💧 Преміум (Жива вода)
            </button>

            <button
              type="button"
              onClick={() => setTab("molfar")}
              className={[
                "px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition",
                tab === "molfar" ? "border-amber-400/80 bg-amber-500/10 text-amber-100" : "border-slate-700/80 bg-slate-900/50 text-slate-200 hover:border-slate-500/80",
              ].join(" ")}
            >
              🔮 Преміум+ (Мольфар)
            </button>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            Покупка відбувається за клейноди. Клейноди купуються через Stars у крамниці.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {!catalog ? (
            <div className="py-4 text-xs text-slate-400">Каталог ще завантажується…</div>
          ) : visible.length === 0 ? (
            <div className="py-4 text-xs text-slate-400">Немає товарів у цій вкладці.</div>
          ) : (
            visible.map(({ sku, item }) => {
              const title = String(item.title || sku);
              const days = Number(item.days || 0);
              const price = Number(item.price_kleynody || 0);
              const eff = item.effects || {};
              const isBusy = busySku === sku;

              return (
                <div key={sku} className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-100 truncate">{title}</p>
                      {activeTier !== "none" && ((tab === "water" && activeTier === "water") || (tab === "molfar" && activeTier === "molfar")) ? (
                        <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full border border-emerald-400/60 bg-emerald-500/10 text-emerald-200">
                          Активно
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Тривалість: <span className="font-semibold text-slate-200">{days} дн.</span>
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Ефект:{" "}
                      <span className="text-slate-200 font-semibold">
                        {typeof eff.daily === "number" ? `${eff.daily}/доба` : "—"}
                      </span>
                      <span className="text-slate-500"> • </span>
                      <span className="text-slate-200 font-semibold">
                        {typeof eff.cap === "number" ? `кап ${eff.cap}` : "—"}
                      </span>
                      {typeof eff.carry_limit === "number" ? (
                        <>
                          <span className="text-slate-500"> • </span>
                          <span className="text-slate-200 font-semibold">перенос до {eff.carry_limit}</span>
                        </>
                      ) : null}
                    </p>

                    <p className="mt-2 text-[11px] text-slate-400">
                      Ціна: <span className="font-semibold text-amber-200">💠 {price.toLocaleString("uk-UA")}</span>
                    </p>
                  </div>

                  <div className="w-[150px] flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={isBusy || price <= 0}
                      onClick={() => purchaseSub(sku, price, title)}
                      className="w-full rounded-xl border border-amber-400/80 bg-amber-500/10 text-[11px] font-semibold text-amber-100 px-2 py-2 disabled:opacity-60 hover:bg-amber-500/20 transition"
                    >
                      {isBusy ? "Купівля…" : "Купити"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          Якщо хочеш продавати підписки саме через Stars — треба додати відповідні SKU в бекенд /api/stars/create-invoice (PRODUCTS).
        </p>
      </div>
    </main>
  );
}