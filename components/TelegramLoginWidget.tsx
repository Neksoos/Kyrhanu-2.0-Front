// components/TelegramLoginWidget.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
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

export default function TelegramLoginWidget() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const botUsername =
    process.env.NEXT_PUBLIC_TG_BOT_USERNAME ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    ''

  useEffect(() => {
    if (!ref.current) return
    if (!botUsername) {
      setErr('Не задано NEXT_PUBLIC_TG_BOT_USERNAME у ENV')
      return
    }

    // колбек, який викличе Telegram widget
    window.onTelegramAuth = async (user: any) => {
      try {
        setErr(null)
        setLoading(true)

        const res = await apiPost<AuthResponse>('/api/auth/telegram-widget', user)

        localStorage.setItem('access_token', res.access_token)

        if (res.is_new) {
          window.location.href = '/onboarding'
          return
        }

        window.location.href = '/game'
      } catch (e: any) {
        setErr(e?.message || 'Помилка Telegram Widget авторизації')
      } finally {
        setLoading(false)
      }
    }

    // чистимо контейнер і вставляємо скрипт
    ref.current.innerHTML = ''

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botUsername) // без @
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'true')
    script.setAttribute('data-lang', 'uk')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    ref.current.appendChild(script)

    return () => {
      window.onTelegramAuth = undefined
    }
  }, [botUsername])

  return (
    <div>
      {err && (
        <div className="text-sm mb-3" style={{ color: '#b30c12' }}>
          {err}
        </div>
      )}

      <div ref={ref} />

      {loading && (
        <div className="text-sm mt-3 opacity-80">
          Входимо через Telegram…
        </div>
      )}
    </div>
  )
}