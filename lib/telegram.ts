// lib/telegram.ts
export type TelegramWebAppUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export type TelegramWebApp = {
  initData: string
  initDataUnsafe?: {
    user?: TelegramWebAppUser
  }
  ready?: () => void
  expand?: () => void
}

export function isTelegramMiniApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any)?.Telegram?.WebApp
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (!isTelegramMiniApp()) return null
  return (window as any).Telegram.WebApp as TelegramWebApp
}