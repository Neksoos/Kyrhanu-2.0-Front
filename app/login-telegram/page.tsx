'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiPost } from '@/lib/api'

type WidgetUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

type AuthResponse = {
  access_token: string
  token_type: 'bearer'
  user: any
  is_new: boolean
}

declare global {
  interface Window {
    // НЕ оголошуємо Telegram тут, щоб не конфліктувати з типами бібліотек
    onTelegramAuth?: (user: WidgetUser) => void
  }
}

export default function LoginTelegramPage() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const botUsername =
    process.env.NEXT_PUBLIC_TG_BOT_USERNAME ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    ''

  const isTelegramMiniApp = useMemo(() => {
    if (typeof window === 'undefined') return false
    const tg = (window as any).Telegram
    return !!tg?.WebApp && typeof tg.WebApp.initData === 'string' && tg.WebApp.initData.length > 0
  }, [])

  useEffect(() => {
    // Якщо раптом сюди зайшли з Mini App — не даємо віджет, вертаємо на головну (там initData-логін)
    if (isTelegramMiniApp) {
      window.location.href = '/'
      return
    }
  }, [isTelegramMiniApp])

  useEffect(() => {
    if (!botUsername) {
      setErr('Не задано NEXT_PUBLIC_TG_BOT_USERNAME (або NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) у ENV.')
      return
    }

    setErr(null)

    window.onTelegramAuth = async (user: WidgetUser) => {
      try {
        setLoading(true)
        setErr(null)

        // Browser -> тільки widget payload
        const res = await apiPost<AuthResponse>('/api/auth/telegram-widget', user)

        localStorage.setItem('access_token', res.access_token)

        if (res.is_new) {
          window.location.href = '/onboarding'
          return
        }

        window.location.href = '/game'
      } catch (e: any) {
        setErr(e?.message || 'Помилка авторизації Telegram (widget)')
      } finally {
        setLoading(false)
      }
    }

    // Вставляємо Telegram Widget скрипт
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')

    const container = document.getElementById('tg-widget')
    if (container) {
      container.innerHTML = ''
      container.appendChild(script)
    }

    return () => {
      if (window.onTelegramAuth) delete window.onTelegramAuth
    }
  }, [botUsername])

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-2xl mb-4">Вхід через Telegram</h1>

        <p className="text-sm mb-4 opacity-80">
          Це працює тільки у браузері через Telegram Login Widget.
        </p>

        {err && (
          <div className="text-sm mb-3" style={{ color: '#b30c12' }}>
            {err}
          </div>
        )}

        <div id="tg-widget" className="mb-4" />

        {loading && <div className="text-sm opacity-80">Авторизація…</div>}

        <button className="pixel-btn w-full" onClick={() => (window.location.href = '/')}>
          Назад
        </button>
      </div>
    </main>
  )
}