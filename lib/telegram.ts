// lib/telegram.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

export function getTelegramWebApp(): any | null {
  if (typeof window === 'undefined') return null
  return (window as any)?.Telegram?.WebApp || null
}

export function isTelegramMiniApp(): boolean {
  return !!getTelegramWebApp()
}

export function getTelegramInitData(): string {
  const tg = getTelegramWebApp()
  return tg?.initData || ''
}

/**
 * Safe haptic wrapper for Telegram Mini App.
 * Працює тільки в Telegram WebApp, у браузері просто нічого не робить.
 */
export const haptic = {
  impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    try {
      const hf = getTelegramWebApp()?.HapticFeedback
      hf?.impactOccurred?.(style)
    } catch {}
  },

  notification: (type: 'error' | 'success' | 'warning' = 'success') => {
    try {
      const hf = getTelegramWebApp()?.HapticFeedback
      hf?.notificationOccurred?.(type)
    } catch {}
  },

  selection: () => {
    try {
      const hf = getTelegramWebApp()?.HapticFeedback
      hf?.selectionChanged?.()
    } catch {}
  },
}