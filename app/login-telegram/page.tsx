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
    onTelegramAuth?: (user: any) => void
  }
}

export default function LoginTelegramPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const botUsername = useMemo(() => process.env.NEXT_PUBLIC_TG_BOT_USERNAME, [])

  useEffect(() => {
    if (!botUsername) {
      setError('Не задано NEXT_PUBLIC_TG_BOT_USERNAME у Railway/ENV')
      return
    }

    window.onTelegramAuth = async (user: any) => {
      try {
        setError(null)
        setLoading(true)

        const res = await apiPost<AuthResponse>('/api/auth/telegram-widget', user)

        localStorage.setItem('access_token', res.access_token)
        window.location.href = res.is_new ? '/onboarding' : '/game'
      } catch (e: any) {
        setError(e?.message || 'Помилка авторизації Telegram Widget')
      } finally {
        setLoading(false)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'true')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')

    const container = document.getElementById('tg-widget')
    container?.appendChild(script)

    return () => {
      delete window.onTelegramAuth
      if (container) container.innerHTML = ''
    }
  }, [botUsername])

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-xl mb-4">Вхід через Telegram</h1>

        <p className="text-sm mb-4 opacity-80">
          Це працює у браузері через Telegram Login Widget.
        </p>

        {error && (
          <div className="text-sm mb-3" style={{ color: '#b30c12' }}>
            {error}
          </div>
        )}

        <div id="tg-widget" className="flex justify-center" />

        {loading && <div className="text-sm mt-4 opacity-80">Авторизація…</div>}

        <div className="h-4" />

        <button className="pixel-btn w-full" onClick={() => (window.location.href = '/')}>
          Назад
        </button>
      </div>
    </main>
  )
}