// components/TelegramLoginWidget.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { apiPost, type AuthResponse as ApiAuthResponse } from '@/lib/api'

type AuthResponse = ApiAuthResponse & {
  // backward-compat for older backend / frontend naming
  is_new?: boolean
}

export default function TelegramLoginWidget({
  onAuthed,
}: {
  onAuthed?: (res: AuthResponse) => void
}) {
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
      setErr('Не задано NEXT_PUBLIC_TG_BOT_USERNAME (або NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) у ENV')
      return
    }

    // колбек, який викличе Telegram widget
    window.onTelegramAuth = async (user: any) => {
      try {
        setErr(null)
        setLoading(true)

        // Telegram widget передає user + hash + auth_date в одному обʼєкті.
        const res = await apiPost<AuthResponse>('/api/auth/telegram-widget', user)

        localStorage.setItem('access_token', res.access_token)
        onAuthed?.(res)

        const isNew = Boolean((res as any).is_new_user ?? (res as any).is_new)
        window.location.href = isNew ? '/onboarding' : '/game'
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
  }, [botUsername, onAuthed])

  return (
    <div>
      {err && (
        <div className="text-sm mb-3" style={{ color: '#b30c12' }}>
          {err}
        </div>
      )}

      <div ref={ref} />

      {loading && <div className="text-sm mt-3 opacity-80">Входимо через Telegram…</div>}
    </div>
  )
}