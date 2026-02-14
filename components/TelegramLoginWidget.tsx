'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'

declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void
  }
}

/**
 * Telegram Login Widget for browser auth.
 * Uses NEXT_PUBLIC_TELEGRAM_BOT_USERNAME (MUST be without "@").
 */
export function TelegramLoginWidget() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || ''
    const botUsername = raw.replace(/^@/, '').trim()

    if (!botUsername) {
      setError('NEXT_PUBLIC_TELEGRAM_BOT_USERNAME не задано (має бути без @)')
      return
    }

    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    window.onTelegramAuth = async (user: any) => {
      try {
        setError('')
        const res = await api.telegramWidgetAuth(user)
        useStore.getState().setAuth(res.access_token, res.user)

        if (res.is_new) {
          useStore.getState().addNotification({
            id: `welcome-${Date.now()}`,
            type: 'success',
            title: 'Вітаємо!',
            message: 'Акаунт створено. Можеш копати кургани 😊',
            duration: 4000,
          })
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Telegram auth failed')
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')

    containerRef.current.appendChild(script)

    return () => {
      delete window.onTelegramAuth
    }
  }, [])

  return (
    <div className="space-y-3">
      <div ref={containerRef} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
