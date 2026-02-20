"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

type Pack = {
  id: string;
  sku: string; // SKU для бекенда /api/stars/create-invoice
  title: string;
  kleynody: number;
  bonusPercent?: number;
  priceXtr: number; // Stars (XTR)
  priceFiat?: string;
  tagline: string;
  best?: boolean;
  popular?: boolean;
  img: string; // ✅ картинка пака
};

type CosmeticKind = "frame" | "name" | "avatar";

type PremiumCatalogItem = {
  kind?: CosmeticKind;
  title?: string;
  price_kleynody?: number;
  icon?: string;
  overlay?: string;
  css?: { type?: "solid" | "gradient"; value?: string } | null;

  // для аватарів (якщо захочеш використати пізніше)
  asset_m?: string;
  asset_f?: string;
};

type PremiumCatalogResponse = {
  ok: boolean;
  catalog: Record<string, PremiumCatalogItem>;
  owned_skus?: string[];
  equipped?: { frame_sku?: string | null; name_sku?: string | null; avatar_sku?: string | null };
};

type ProfileResponse = {
  ok: boolean;
  player?: {
    kleynody?: number;
    gender?: string | null;
  };
};

type ShopItem = {
  id: string; // = sku
  sku: string;
  kind: CosmeticKind;
  title: string;
  priceKleynody: number;
  icon: string; // картинка в списку
  featured?: boolean;
};

const packs: Pack[] = [
  {
    id: "starter",
    sku: "kleynody_starter",
    title: "Стартовий вогник",
    kleynody: 50,
    priceXtr: 120,
    priceFiat: "≈ 49 ₴",
    tagline: "Щоб спробувати преміум без болю для гаманця.",
    img: "/kleynods/50_kleynods.png",
  },
  {
    id: "hunter",
    sku: "kleynody_hunter",
    title: "Набіг мандрівника",
    kleynody: 140,
    bonusPercent: 10,
    priceXtr: 300,
    priceFiat: "≈ 119 ₴",
    tagline: "+10% клейнодів зверху — за тих, хто планує затриматись.",
    popular: true,
    img: "/kleynods/140_kleynods.png",
  },
  {
    id: "warlord",
    sku: "kleynody_warlord",
    title: "Скарб ватажка",
    kleynody: 320,
    bonusPercent: 18,
    priceXtr: 640,
    priceFiat: "≈ 249 ₴",
    tagline: "Оптимальний баланс: і бонус, і не б’є по кишені.",
    best: true,
    popular: true,
    img: "/kleynods/320_kleynods.png",
  },
  {
    id: "legend",
    sku: "kleynody_legend",
    title: "Легендарний сховок",
    kleynody: 700,
    bonusPercent: 25,
    priceXtr: 1300,
    priceFiat: "≈ 479 ₴",
    tagline: "Для тих, хто точно лишається в Курганах надовго.",
    img: "/kleynods/700_kleynods.png",
  },
];

function getTgId(): number | null {
  if (typeof window === "undefined") return null;
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  return tgUser?.id ? Number(tgUser.id) : null;
}

function getInitData(): string {
  if (typeof window === "undefined") return "";
  return String((window as any).Telegram?.WebApp?.initData || "");
}

function getWebApp() {
  if (typeof window === "undefined") return null;
  return (window as any).Telegram?.WebApp || null;
}

function toShopItem(sku: string, item: PremiumCatalogItem): ShopItem | null {
  const kind = (item.kind || "") as CosmeticKind;
  if (kind !== "frame" && kind !== "name" && kind !== "avatar") return null;

  const title = String(item.title || sku);
  const price = Number(item.price_kleynody || 0);
  if (!Number.isFinite(price) || price <= 0) return null;

  // icon: якщо нема в каталозі — пробуємо фолбек
  const icon =
    String(item.icon || "") ||
    (kind === "avatar" ? `/premium/avatars/${sku}_icon.png` : "/premium/unknown.png");

  return {
    id: sku,
    sku,
    kind,
    title,
    priceKleynody: price,
    icon,
    featured: false,
  };
}

export default function PremiumShopPage() {
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);
  const [kleynody, setKleynody] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);

  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [tab, setTab] = useState<CosmeticKind>("frame");

  const [ownedSkus, setOwnedSkus] = useState<string[]>([]);
  const [equipped, setEquipped] = useState<{ frame?: string; name?: string; avatar?: string }>({});

  // 🔥 Важливо: тягнемо реальний каталог з бекенда
  const [catalog, setCatalog] = useState<Record<string, PremiumCatalogItem> | null>(null);

  const itemsByKind = useMemo(() => {
    const list: ShopItem[] = [];
    if (!catalog) return list;

    for (const [sku, it] of Object.entries(catalog)) {
      const row = toShopItem(sku, it);
      if (row) list.push(row);
    }
    return list;
  }, [catalog]);

  const visibleItems = useMemo(() => itemsByKind.filter((i) => i.kind === tab), [itemsByKind, tab]);

  useEffect(() => {
    setTgId(getTgId());
  }, []);

  async function loadKleynodyBalance() {
    setError(null);

    // 1) /api/profile (через auth initData)
    try {
      const initData = getInitData();
      const res = await fetch(`/api/proxy/api/profile`, {
        method: "GET",
        cache: "no-store",
        headers: initData ? { "X-Init-Data": initData } : {},
      });

      if (res.ok) {
        const data: ProfileResponse = await res.json();
        const k = data?.player?.kleynody;
        setKleynody(typeof k === "number" ? k : 0);

        const g = data?.player?.gender ?? null;
        setGender(typeof g === "string" ? g : null);
        return;
      }
    } catch {
      // ignore
    }

    // 2) fallback /api/profile/balance?tg_id=
    try {
      if (!tgId) return;
      const res = await fetch(`/api/proxy/api/profile/balance?tg_id=${tgId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      setKleynody(typeof data.kleynody === "number" ? data.kleynody : 0);
    } catch {
      setKleynody(null);
    }
  }

  async function loadPremiumCatalog() {
    try {
      const initData = getInitData();
      if (!initData) return;

      const r = await fetch(`/api/proxy/api/premium/catalog`, {
        method: "GET",
        cache: "no-store",
        headers: { "X-Init-Data": initData },
      });

      if (!r.ok) return;

      const data: PremiumCatalogResponse = await r.json();

      if (data?.catalog && typeof data.catalog === "object") {
        setCatalog(data.catalog);
      }

      const owned = Array.isArray(data?.owned_skus) ? data.owned_skus : [];
      setOwnedSkus(owned);

      const eq = data?.equipped || {};
      setEquipped({
        frame: typeof eq.frame_sku === "string" ? eq.frame_sku : undefined,
        name: typeof eq.name_sku === "string" ? eq.name_sku : undefined,
        avatar: typeof eq.avatar_sku === "string" ? eq.avatar_sku : undefined,
      });
    } catch {
      // якщо бек ще не готовий — просто мовчки пропускаємо
    }
  }

  useEffect(() => {
    if (!tgId) return;
    loadKleynodyBalance();
    loadPremiumCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgId]);

  async function buyWithStars(pack: Pack) {
    if (busyPack) return;

    setBusyPack(pack.id);
    setError(null);
    setSuccess(null);

    const webApp = getWebApp();
    if (!webApp?.openInvoice) {
      setBusyPack(null);
      setError("Оплата Stars доступна лише всередині Telegram (Mini App).");
      return;
    }

    try {
      const initData = getInitData();
      if (!initData) throw new Error("Missing Telegram initData");

      const r = await fetch(`/api/proxy/api/stars/create-invoice`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Init-Data": initData },
        body: JSON.stringify({ sku: pack.sku }),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`create-invoice failed: ${r.status} ${t}`);
      }

      const data = await r.json();
      const invoiceLink = String(data?.invoice_link || "");
      if (!invoiceLink) throw new Error("No invoice_link from backend");

      await new Promise<void>((resolve) => {
        (webApp as any).openInvoice(invoiceLink, (status: string) => {
          if (status === "paid") {
            setSuccess(`Оплату прийнято. Клейноди за пак «${pack.title}» мають нарахуватись автоматично.`);
            setTimeout(() => loadKleynodyBalance(), 800);
            setTimeout(() => loadKleynodyBalance(), 2200);
          } else if (status === "cancelled") {
            setError("Оплату скасовано.");
          } else if (status === "failed") {
            setError("Оплата не пройшла. Спробуй ще раз.");
          } else {
            setSuccess("Платіж обробляється. Якщо баланс не оновився — натисни «Оновити».");
          }
          resolve();
        });
      });
    } catch (e) {
      console.error("buyWithStars error", e);
      setError("Не вдалось створити оплату через Stars. Перевір бекенд та налаштування бота.");
    } finally {
      setBusyPack(null);
    }
  }

  function isOwned(sku: string) {
    return ownedSkus.includes(sku);
  }

  function isEquipped(item: ShopItem) {
    return item.kind === "frame"
      ? equipped.frame === item.sku
      : item.kind === "name"
      ? equipped.name === item.sku
      : equipped.avatar === item.sku;
  }

  async function purchaseItem(item: ShopItem) {
    if (busyItem) return;

    setError(null);
    setSuccess(null);

    if (kleynody === null) {
      setError("Не бачу баланс клейнодів. Спробуй «Оновити».");
      return;
    }
    if (kleynody < item.priceKleynody) {
      setError("Недостатньо клейнодів для покупки.");
      return;
    }

    setBusyItem(item.id);

    try {
      const initData = getInitData();
      if (!initData) throw new Error("Missing Telegram initData");

      const r = await fetch(`/api/proxy/api/premium/purchase`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Init-Data": initData },
        body: JSON.stringify({ sku: item.sku }),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`purchase failed: ${r.status} ${t}`);
      }

      setOwnedSkus((prev) => (prev.includes(item.sku) ? prev : [item.sku, ...prev]));
      setKleynody((prev) => (typeof prev === "number" ? Math.max(0, prev - item.priceKleynody) : prev));
      setSuccess(`Придбано: «${item.title}».`);
      setTimeout(() => loadPremiumCatalog(), 250);
    } catch (e) {
      console.error("purchaseItem error", e);
      setError("Не вдалось купити. Перевір /api/premium/purchase на бекенді.");
    } finally {
      setBusyItem(null);
    }
  }

  async function equipItem(item: ShopItem) {
    if (busyItem) return;

    setError(null);
    setSuccess(null);
    setBusyItem(item.id);

    try {
      const initData = getInitData();
      if (!initData) throw new Error("Missing Telegram initData");

      const r = await fetch(`/api/proxy/api/premium/equip`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Init-Data": initData },
        body: JSON.stringify({ sku: item.sku }),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`equip failed: ${r.status} ${t}`);
      }

      setEquipped((prev) => ({ ...prev, [item.kind]: item.sku }));
      setSuccess(`Активовано: «${item.title}».`);
    } catch (e) {
      console.error("equipItem error", e);
      setError("Не вдалось активувати. Перевір /api/premium/equip.");
    } finally {
      setBusyItem(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 px-4 py-5">
      <div className="mx-auto w-full max-w-xl relative">
        <motion.div
          className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-40 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.25),transparent_55%),radial-gradient(circle_at_90%_10%,rgba(251,191,36,0.32),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(34,197,94,0.28),transparent_60%)]"
          animate={{ opacity: [0.3, 0.5, 0.35], scale: [1, 1.03, 1] }}
          transition={{ duration: 14, repeat: Infinity, repeatType: "mirror" }}
        />

        {/* ✅ TOP BAR (додано кнопку Преміум) */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-full border border-slate-700/80 bg-slate-900/80 text-xs font-medium text-slate-200 hover:border-sky-400 hover:text-sky-200 transition"
          >
            ← До міста
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/premium/plans")}
              className="px-4 py-2 rounded-full border border-amber-400/80 bg-amber-500/10 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition"
            >
              👑 Преміум
            </button>

            <button
              type="button"
              onClick={() => router.push("/inventory")}
              className="px-4 py-2 rounded-full border border-amber-400/80 bg-amber-500/10 text-xs font-semibold text-amber-200 flex items-center gap-1.5 hover:bg-amber-500/20 transition"
            >
              🎒 Інвентар
            </button>
          </div>
        </div>

        <motion.header className="mb-4" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/80 mb-1">Преміум-сховище</p>
          <h1 className="text-2xl font-bold tracking-wide flex items-center gap-2">
            <span className="text-amber-300">💠</span>
            <span>Крамниця</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">Клейноди купуються через Telegram Stars. Прикраси — за клейноди.</p>
        </motion.header>

        <motion.section
          className="mb-4 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900/40 px-4 py-3 shadow-[0_0_24px_rgba(251,191,36,0.20)]"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">Твій баланс</p>
              <p className="mt-1 text-lg font-semibold text-slate-50 flex items-center gap-1.5">
                <span className="text-amber-300">💠</span>
                <span>{kleynody === null ? "—" : kleynody.toLocaleString("uk-UA")}</span>
                <span className="text-xs font-normal text-slate-400">клейнодів</span>
              </p>
              {gender ? <p className="mt-1 text-[11px] text-slate-500">Стать профілю: {gender}</p> : null}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-right text-[11px] text-slate-400">
                <p>Оплата</p>
                <p className="font-semibold text-slate-200">Telegram Stars</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loadKleynodyBalance();
                    loadPremiumCatalog();
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/70 text-[11px] font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-200 transition"
                >
                  🔄 Оновити
                </button>

                {/* ✅ Додатково: швидкий перехід на підписки */}
                <button
                  type="button"
                  onClick={() => router.push("/premium/plans")}
                  className="px-3 py-1.5 rounded-xl border border-amber-400/80 bg-amber-500/10 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20 transition"
                >
                  👑 Купити преміум
                </button>
              </div>
            </div>
          </div>
        </motion.section>

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

        {/* 1) Пакети клейнодів (Stars) */}
        <motion.section
          className="grid grid-cols-1 gap-3 mb-6"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
        >
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} busy={busyPack === pack.id} onBuy={() => buyWithStars(pack)} />
          ))}
        </motion.section>

        {/* 2) Прикраси */}
        <motion.section
          className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Прикраси</p>
              <p className="text-sm font-semibold text-slate-100">Рамки, колір імені, аватари</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("frame")}
                className={[
                  "px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition",
                  tab === "frame"
                    ? "border-amber-400/80 bg-amber-500/10 text-amber-100"
                    : "border-slate-700/80 bg-slate-900/50 text-slate-200 hover:border-slate-500/80",
                ].join(" ")}
              >
                🖼️ Рамки
              </button>
              <button
                type="button"
                onClick={() => setTab("name")}
                className={[
                  "px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition",
                  tab === "name"
                    ? "border-amber-400/80 bg-amber-500/10 text-amber-100"
                    : "border-slate-700/80 bg-slate-900/50 text-slate-200 hover:border-slate-500/80",
                ].join(" ")}
              >
                ✍️ Ім’я
              </button>
              <button
                type="button"
                onClick={() => setTab("avatar")}
                className={[
                  "px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition",
                  tab === "avatar"
                    ? "border-amber-400/80 bg-amber-500/10 text-amber-100"
                    : "border-slate-700/80 bg-slate-900/50 text-slate-200 hover:border-slate-500/80",
                ].join(" ")}
              >
                🙂 Аватари
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {visibleItems.length === 0 ? (
              <div className="py-4 text-xs text-slate-400">
                {catalog ? "Немає предметів у цій вкладці." : "Каталог ще завантажується…"}
              </div>
            ) : (
              visibleItems.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  busy={busyItem === item.id}
                  owned={isOwned(item.sku)}
                  equipped={isEquipped(item)}
                  onBuy={() => purchaseItem(item)}
                  onEquip={() => equipItem(item)}
                />
              ))
            )}
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            Якщо бекенд ще не підʼєднаний — кнопки покупки/активації будуть падати з помилкою.
          </p>
        </motion.section>

        <motion.section
          className="mb-3 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3 text-[11px] text-slate-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-semibold text-slate-200 mb-1">Як це працює:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Клейноди купуються через Stars.</li>
            <li>Прикраси купуються за клейноди та зберігаються на акаунті.</li>
            <li>Після покупки можна активувати рамку / колір імені / аватар.</li>
          </ul>
        </motion.section>

        <motion.div
          className="text-center text-[11px] text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Купуючи клейноди, ти підтримуєш розвиток «Проклятих курганів».
        </motion.div>
      </div>
    </main>
  );
}

function PackCard({ pack, busy, onBuy }: { pack: Pack; busy: boolean; onBuy: () => void }) {
  const hasBonus = typeof pack.bonusPercent === "number" && pack.bonusPercent > 0;

  return (
    <motion.div
      className={[
        "relative rounded-2xl border px-4 py-3 shadow-md bg-slate-950/85 backdrop-blur-sm",
        pack.best ? "border-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.35)]" : "border-slate-700/80",
      ].join(" ")}
      variants={{ hidden: { opacity: 0, y: 10, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1 } }}
    >
      <div className="absolute -top-2 right-3 flex gap-1">
        {pack.best && (
          <span className="rounded-full bg-amber-500 text-[10px] font-semibold text-slate-950 px-2 py-[2px] shadow-lg">
            Найвигідніше
          </span>
        )}
        {pack.popular && !pack.best && (
          <span className="rounded-full bg-sky-500/90 text-[10px] font-semibold text-slate-950 px-2 py-[2px]">
            Топ вибір
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="relative w-[46px] h-[46px] sm:w-[52px] sm:h-[52px] rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden shrink-0">
              <Image
                src={pack.img}
                alt={`${pack.kleynody} клейнодів`}
                fill
                sizes="52px"
                className="object-contain"
                priority={pack.best}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold tracking-wide truncate">{pack.title}</h2>
              <p className="text-xs text-slate-400 truncate">{pack.tagline}</p>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1.5">
            <p className="text-lg font-semibold text-amber-300 flex items-center gap-1.5">
              <span>{pack.kleynody.toLocaleString("uk-UA")}</span>
              <span className="text-xs font-normal text-slate-400">клейнодів</span>
            </p>

            {hasBonus && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-400/70 text-[10px] font-semibold text-emerald-200 px-2 py-[2px]">
                +{pack.bonusPercent}% бонус
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Ціна: <span className="font-semibold text-slate-200">⭐ {pack.priceXtr} XTR</span>
            {pack.priceFiat ? <span className="text-slate-500"> ({pack.priceFiat})</span> : null}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-1 w-[140px]">
          <button
            type="button"
            disabled={busy}
            onClick={onBuy}
            className="w-full rounded-xl border border-amber-400/80 bg-amber-500/10 text-[11px] font-semibold text-amber-100 px-2 py-1.5 flex items-center justify-center gap-1.5 disabled:opacity-60 hover:bg-amber-500/20 transition"
          >
            ⭐ {busy ? "В обробці…" : "Оплатити Stars"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-slate-500">
        {pack.best
          ? "Пак для активних гравців: найбільше клейнодів за свою ціну."
          : pack.popular
          ? "Частий вибір тих, хто вже втягнувся й хоче більше свободи."
          : "Швидкий спосіб відкрити преміум-можливості й підтримати гру."}
      </p>
    </motion.div>
  );
}

function CosmeticCard({
  item,
  busy,
  owned,
  equipped,
  onBuy,
  onEquip,
}: {
  item: ShopItem;
  busy: boolean;
  owned: boolean;
  equipped: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-slate-950/70 px-3 py-2 flex items-center gap-3 border-slate-800/80">
      <div className="w-[44px] h-[44px] rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden flex items-center justify-center">
        <Image
          src={item.icon}
          alt={item.title}
          width={44}
          height={44}
          className="w-[44px] h-[44px] object-contain"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-100 truncate">{item.title}</p>
          {equipped && (
            <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full border border-emerald-400/60 bg-emerald-500/10 text-emerald-200">
              Активно
            </span>
          )}
          {!equipped && item.kind === "avatar" && (
            <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full border border-sky-400/50 bg-sky-500/10 text-sky-100">
              Аватар
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-400 mt-1">
          Ціна: <span className="font-semibold text-amber-200">💠 {item.priceKleynody.toLocaleString("uk-UA")}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1 w-[140px]">
        {!owned ? (
          <button
            type="button"
            disabled={busy}
            onClick={onBuy}
            className="w-full rounded-xl border border-amber-400/80 bg-amber-500/10 text-[11px] font-semibold text-amber-100 px-2 py-1.5 disabled:opacity-60 hover:bg-amber-500/20 transition"
          >
            {busy ? "Купівля…" : "Купити"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || equipped}
            onClick={onEquip}
            className={[
              "w-full rounded-xl border text-[11px] font-semibold px-2 py-1.5 transition disabled:opacity-60",
              equipped
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                : "border-sky-500/60 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20",
            ].join(" ")}
          >
            {equipped ? "Активно" : busy ? "Застосування…" : "Активувати"}
          </button>
        )}
      </div>
    </div>
  );
}