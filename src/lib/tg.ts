// src/lib/tg.ts

declare global {
  interface Window {
    Telegram?: any;
  }
}

// ─────────────────────────────────────────────────────────────
// Внутрішні хелпери
// ─────────────────────────────────────────────────────────────
function webApp() {
  return (typeof window !== "undefined" && (window as any).Telegram?.WebApp) || null;
}

/** Ініціалізація Telegram WebApp — викликається на старті кожної сторінки. */
export function initTg(): void {
  try {
    const wa = webApp();
    if (!wa) return;
    if (typeof wa.ready === "function") wa.ready();
    if (typeof wa.expand === "function") wa.expand();
  } catch {
    /* ignore */
  }
}

/** 1) Прямо з initDataUnsafe.user (офіційний шлях) */
function tgIdFromUnsafe(): number | null {
  try {
    const u = webApp()?.initDataUnsafe?.user;
    return typeof u?.id === "number" ? (u.id as number) : null;
  } catch {
    return null;
  }
}

/** 2) З сирого рядка initData (user=JSON…) — працює навіть коли unsafe ще порожній */
function tgIdFromInitData(): number | null {
  try {
    const wa = webApp();
    if (!wa) return null;
    const raw: string = String(wa.initData || "");
    if (!raw) return null;

    // initData — це querystring: "query_id=...&user=%7B...%7D&auth_date=...&hash=..."
    for (const pair of raw.split("&")) {
      const [k, v] = pair.split("=");
      if (k === "user" && v) {
        const json = decodeURIComponent(v.replace(/\+/g, " "));
        const u = JSON.parse(json);
        const id = u?.id;
        if (typeof id === "number") return id;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 3) Фолбек: деякі клієнти кладуть tgWebAppData у location.hash */
function tgIdFromHash(): number | null {
  try {
    const hash = (typeof window !== "undefined" && window.location.hash) || "";
    const m = hash.match(/(?:^|[#&])tgWebAppData=([^&]+)/);
    if (!m) return null;

    const decoded = decodeURIComponent(m[1]); // це теж querystring
    const um = decoded.match(/(?:^|[&?])user=([^&]+)/);
    if (!um) return null;

    const userJson = decodeURIComponent(um[1]);
    const user = JSON.parse(userJson);
    return typeof user?.id === "number" ? (user.id as number) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Публічні API
// ─────────────────────────────────────────────────────────────

/** Синхронно: повертає id або null (пробує кілька джерел + dev-хак). */
export function getTgIdSync(): number | null {
  // dev-хак: дозволяє тестувати без Telegram
  try {
    const dev = process.env.NEXT_PUBLIC_DEV_TG_ID;
    if (dev && /^\d+$/.test(dev)) return parseInt(dev, 10);
  } catch {
    /* ignore */
  }

  return tgIdFromUnsafe() ?? tgIdFromInitData() ?? tgIdFromHash();
}

/** Кидає помилку, якщо id недоступний (зручно для guard-компонентів). */
export function getTgId(): number {
  const id = getTgIdSync();
  if (id) return id;
  throw new Error("TG_ID_UNAVAILABLE");
}

/** Асинхронне очікування ID з поллінгом (до maxMs). */
export async function waitTgId(maxMs = 5000): Promise<number | null> {
  initTg();

  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const id = tgIdFromUnsafe() ?? tgIdFromInitData() ?? tgIdFromHash();
    if (id) return id;
    await new Promise((r) => setTimeout(r, 80));
  }
  return null;
}

/** Сумісність зі старими імпортами */
export function resolveTgId(): number | null {
  return getTgIdSync();
}