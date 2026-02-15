// lib/telegram.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

export function isTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any)?.Telegram?.WebApp
}

export function getTelegramInitData(): string {
  if (typeof window === 'undefined') return ''
  const tg = (window as any)?.Telegram?.WebApp
  return tg?.initData || ''
}

/**
 * Safe haptic wrapper for Telegram Mini App.
 * Працює тільки в Telegram WebApp, у браузері просто нічого не робить.
 */
export const haptic = {
  impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    try {
      const hf = (window as any)?.Telegram?.WebApp?.HapticFeedback
      hf?.impactOccurred?.(style)
    } catch {}
  },

  notification: (type: 'error' | 'success' | 'warning' = 'success') => {
    try {
      const hf = (window as any)?.Telegram?.WebApp?.HapticFeedback
      hf?.notificationOccurred?.(type)
    } catch {}
  },

  selection: () => {
    try {
      const hf = (window as any)?.Telegram?.WebApp?.HapticFeedback
      hf?.selectionChanged?.()
    } catch {}
  },
}