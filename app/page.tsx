// app/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiPost } from '@/lib/api'
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram'
import TelegramLoginWidget from '@/components/TelegramLoginWidget'

type AuthResponse = {
  access_token: string
  token_type: 'bearer'
  user: any
  is_new: boolean
}

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const inMiniApp = useMemo(() => {
    return isTelegramMiniApp()
  }, [])

  useEffect(() => {
    if (!inMiniApp) return

    const tg = getTelegramWebApp()
    const initData = tg?.initData

    if (!initData) {
      setErr('Telegram initData порожній. Відкрий гру через Mini App.')
      return
    }

    ;(async () => {
      try {
        setErr(null)
        setLoading(true)

        // ТІЛЬКИ MiniApp: initData -> /api/auth/telegram
        const res = await apiPost<AuthResponse>('/api/auth/telegram', {
          init_data: initData,
        })

        localStorage.setItem('access_token', res.access_token)

        if (res.is_new) {
          window.location.href = '/onboarding'
          return
        }

        window.location.href = '/game'
      } catch (e: any) {
        setErr(e?.message || 'Помилка авторизації Telegram (Mini App)')
      } finally {
        setLoading(false)
      }
    })()
  }, [inMiniApp])

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-2xl mb-2">Прокляті Кургани</h1>

        <p className="text-sm mb-4 opacity-80">
          Етно-українська гра міфології та долі
        </p>

        {inMiniApp ? (
          <>
            <div className="text-sm mb-3 opacity-80">
              {loading ? 'Входимо через Telegram Mini App…' : 'Запуск через Telegram Mini App'}
            </div>

            {err && (
              <div className="text-sm mb-3" style={{ color: '#b30c12' }}>
                {err}
              </div>
            )}

            <button
              className="pixel-btn pixel-btn-primary w-full"
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              Перезапустити вхід
            </button>
          </>
        ) : (
          <>
            {/* ТІЛЬКИ БРАУЗЕР: Widget */}
            <TelegramLoginWidget />

            <div className="h-3" />

            <button
              className="pixel-btn w-full"
              onClick={() => (window.location.href = '/login')}
            >
              Або увійти паролем
            </button>
          </>
        )}
      </div>
    </main>
  )
}