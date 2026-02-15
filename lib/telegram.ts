export function isMiniApp(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).Telegram?.WebApp?.initData);
}

export function getInitData(): string {
  return (window as any).Telegram?.WebApp?.initData ?? "";
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