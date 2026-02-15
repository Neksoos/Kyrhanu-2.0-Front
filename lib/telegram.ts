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
 * Detect Mini App by Telegram.WebApp existence (NOT by initData truthiness).
 * initData can be empty in misconfigured launches, but we still want Telegram-specific UX.
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
  const tg = getTelegramWebApp() as any;
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