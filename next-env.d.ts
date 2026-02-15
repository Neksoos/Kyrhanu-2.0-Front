/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Custom global typings

declare global {
  interface TelegramWebApp {
    initData?: string
    initDataUnsafe?: {
      user?: {
        id: number
        first_name?: string
        last_name?: string
        username?: string
        language_code?: string
        photo_url?: string
      }
      [key: string]: any
    }
    ready?: () => void
    expand?: () => void
    close?: () => void
    HapticFeedback?: {
      impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
      notificationOccurred?: (type: 'error' | 'success' | 'warning') => void
      selectionChanged?: () => void
    }
    [key: string]: any
  }

  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }

    // Telegram Login Widget callback
    onTelegramAuth?: (user: any) => void
  }
}

export {}