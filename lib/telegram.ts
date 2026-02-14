/**
 * Telegram WebApp integration.
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name?: string
            last_name?: string
            username?: string
            language_code?: string
            photo_url?: string
          }
        }
        ready: () => void
        expand: () => void
        close: () => void
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
        }
        MainButton: {
          setText: (text: string) => void
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
      }
    }
  }
}

export const isTelegram = (): boolean => {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp
}

export const getTelegramUser = () => {
  if (!isTelegram()) return null
  return window.Telegram!.WebApp.initDataUnsafe.user
}

export const getInitData = (): string | null => {
  if (!isTelegram()) return null
  return window.Telegram!.WebApp.initData
}

export const initTelegram = () => {
  if (!isTelegram()) return
  
  const tg = window.Telegram!.WebApp
  tg.ready()
  tg.expand()
  
  // Set colors
  tg.MainButton.setText('КОПАТИ!')
}

export const haptic = {
  light: () => window.Telegram?.WebApp.HapticFeedback.impactOccurred('light'),
  medium: () => window.Telegram?.WebApp.HapticFeedback.impactOccurred('medium'),
  heavy: () => window.Telegram?.WebApp.HapticFeedback.impactOccurred('heavy'),
  success: () => window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success'),
  error: () => window.Telegram?.WebApp.HapticFeedback.notificationOccurred('error'),
}