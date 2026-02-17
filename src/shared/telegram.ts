declare global {
  interface Window {
    Telegram?: any
  }
}

export function getTelegramInitData(): string | null {
  const tg = window.Telegram?.WebApp
  if (!tg) return null

  // Важливо: саме initData (рядок), не initDataUnsafe
  const initData: string = tg.initData || ''
  return initData.length > 0 ? initData : null
}