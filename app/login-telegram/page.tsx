'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiPost } from '@/lib/api'

type AuthResponse = {
  access_token: string
  token_type: 'bearer'
  user: any
  is_new: boolean
}

declare global {
  interface Window {
    Telegram?: any
    onTelegramAuth?: (user: any) => void
  }
}

export default function LoginTelegramPage() {
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isTelegramMiniApp = useMemo(() => {
    return typeof window !== 'undefined' && !!(window as any)?.Telegram?.WebApp
  }, [])

  // беремо або NEXT_PUBLIC_TG_BOT_USERNAME або NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  const botUsername = useMemo(() => {
    if (typeof window === 'undefined') return ''
    // @ts-ignore
    return (
      process.env.NEXT_PUBLIC_TG_BOT_USERNAME ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      ''
    )
  }, [])

  useEffect(() => {
    // ❌ якщо це Mini App — не показуємо віджет, повертаємо на головну
    if (isTelegramMiniApp) {
      window.location.replace('/')
      return
    }
  }, [isTelegramMiniApp])

  useEffect(() => {
    if (isTelegramMiniApp) return

    if (!botUsername) {
      setErr(
        'Не задано NEXT_PUBLIC_TG_BOT_USERNAME (або NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) у змінних середовища.'
      )
      return
    }

    // глобальний callback, який викличе Telegram widget
    window.onTelegramAuth = async (tgUser: any) => {
      try {
        setErr(null)
        setLoading(true)

        // ✅ Браузер логін ТІЛЬКИ через widget payload
        const res = await apiPost<AuthResponse>('/api/auth/telegram-widget', tgUser)

        localStorage.setItem('access_token', res.access_token)

        if (res.is_new) {
          window.location.href = '/onboarding'
          return
        }

        window.location.href = '/game'
      } catch (e: any) {
        setErr(e?.message || 'Помилка авторизації Telegram (Widget)')
      } finally {
        setLoading(false)
      }
    }

    // вставляємо скрипт віджета
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')

    const mount = document.getElementById('tg-widget-mount')
    mount?.appendChild(script)

    return () => {
      try {
        mount?.removeChild(script)
      } catch {}
      window.onTelegramAuth = undefined
    }
  }, [botUsername, isTelegramMiniApp])

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-2xl mb-2">Вхід через Telegram</h1>

        <p className="text-sm mb-4 opacity-80">
          Це працює у браузері через Telegram Login Widget.
        </p>

        {err && (
          <div className="text-sm mb-3" style={{ color: '#b30c12' }}>
            {err}
          </div>
        )}

        <div id="tg-widget-mount" className="mb-4" />

        <button
          className="pixel-btn w-full"
          onClick={() => (window.location.href = '/')}
          disabled={loading}
        >
          Назад
        </button>
      </div>
    </main>
  )
}