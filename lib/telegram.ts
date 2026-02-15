export type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: any;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  platform?: string;
  version?: string;
};

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const tg = (window as any).Telegram?.WebApp;
  return tg ?? null;
}

/**
 * На деяких збірках/при повільній ініціалізації WebView `window.Telegram` з'являється
 * не в перший момент гідрації. Ця функція дає маленький "grace period".
 */
export async function waitForTelegramWebApp(timeoutMs = 800, intervalMs = 50): Promise<TelegramWebApp | null> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const tg = getTelegramWebApp();
    if (tg) return tg;
    if (Date.now() - start >= timeoutMs) return null;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * IMPORTANT:
 * Mini App визначаємо по Telegram.WebApp (не по initData).
 * initData може бути порожнім якщо WebApp відкрито неправильно/не через бота.
 */
export function isMiniApp(): boolean {
  return Boolean(getTelegramWebApp());
}

export function ensureTelegramReady() {
  const tg = getTelegramWebApp();
  if (!tg) return;
  try {
    tg.ready?.();
  } catch {}
  try {
    tg.expand?.();
  } catch {}
}

export function getInitData(): string {
  const tg = getTelegramWebApp();
  if (!tg) return "";
  return typeof tg.initData === "string" ? tg.initData : "";
}

export function telegramDebugInfo() {
  const tg: any = getTelegramWebApp();
  if (!tg) return null;
  return {
    hasWebApp: true,
    initDataLen: typeof tg.initData === "string" ? tg.initData.length : 0,
    platform: tg.platform ?? null,
    version: tg.version ?? null,
    hasUnsafe: Boolean(tg.initDataUnsafe),
    unsafeUserId: tg.initDataUnsafe?.user?.id ?? null
  };
}

export type TelegramWidgetUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void;
  }
}