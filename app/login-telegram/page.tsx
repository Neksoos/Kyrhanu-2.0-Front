'use client'

import { useEffect, useState } from 'react'
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
  const [botUsername, setBotUsername] = useState<string>('')
  const [widgetReady, setWidgetReady] = useState(false)

  useEffect(() => {
    // беремо username з runtime-конфіга, щоб не залежати від build env
    ;(async () => {
      try {
        const res = await fetch('/api/public-config', { cache: 'no-store' })
        const data = await res.json()
        if (!data?.tgBotUsername) {
          setError('Не задано TG bot username у Railway Variables')
          return
        }
        setBotUsername(data.tgBotUsername)
      } catch {
        setError('Не вдалося завантажити public-config')
      }
    })()
  }, [])

  useEffect(() => {
    if (!botUsername) return

    window.onTelegramAuth = async (user: any) => {
      try {
        setError(null)
        const res = await apiPost<AuthResponse>('/api/auth/telegram-widget', user)

        localStorage.setItem('access_token', res.access_token)
        window.location.href = res.is_new ? '/onboarding' : '/game'
      } catch (e: any) {
        setError(e?.message || 'Помилка авторизації Telegram Widget')
      }
    }

    const container = document.getElementById('tg-widget')
    if (!container) return

    container.innerHTML = '' // щоб не дублювався при навігації

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.onload = () => setWidgetReady(true)

    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'true')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')

    container.appendChild(script)

    return () => {
      delete window.onTelegramAuth
      container.innerHTML = ''
    }
  }, [botUsername])

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-xl mb-4">Вхід через Telegram</h1>

        {error && (
          <div className="text-sm mb-3" style={{ color: '#b30c12' }}>
            {error}
          </div>
        )}

        {!error && !widgetReady && (
          <div className="text-sm mb-3 opacity-80">Завантажуємо Telegram Widget…</div>
        )}

        <div id="tg-widget" className="flex justify-center" />

        <div className="h-4" />
        <button className="pixel-btn w-full" onClick={() => (window.location.href = '/')}>
          Назад
        </button>
      </div>
    </main>
  )
}