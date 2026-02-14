'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiPost } from '@/lib/api'

type AuthResponse = {
  access_token: string
  token_type: 'bearer'
  user: any
  is_new: boolean
}

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isTelegramMiniApp = useMemo(() => {
    return typeof window !== 'undefined' && !!(window as any)?.Telegram?.WebApp
  }, [])

  useEffect(() => {
    if (!isTelegramMiniApp) return

    const tg = (window as any).Telegram.WebApp
    const initData = tg?.initData

    if (!initData) {
      setErr('Telegram initData порожній. Відкрий гру через Mini App.')
      return
    }

    // Автологін/автореєстрація при старті Mini App
    ;(async () => {
      try {
        setErr(null)
        setLoading(true)

        const res = await apiPost<AuthResponse>('/api/auth/telegram', {
          init_data: initData,
        })

        localStorage.setItem('access_token', res.access_token)

        // Якщо новий — ведемо на онбординг/реєстрацію
        if (res.is_new) {
          window.location.href = '/onboarding'
          return
        }

        // Якщо існуючий — у гру
        window.location.href = '/game'
      } catch (e: any) {
        setErr(e?.message || 'Помилка авторизації Telegram')
      } finally {
        setLoading(false)
      }
    })()
  }, [isTelegramMiniApp])

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-2xl mb-4">Прокляті Кургани</h1>

        <p className="text-sm mb-4 opacity-80">
          Етно-українська гра міфології та долі
        </p>

        {isTelegramMiniApp ? (
          <>
            <div className="text-sm mb-3 opacity-80">
              {loading ? 'Входимо через Telegram…' : 'Запуск через Telegram Mini App'}
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
            <p className="text-sm mb-3 opacity-80">
              У браузері потрібен Telegram Login Widget (або пароль).
            </p>

            <button
              className="pixel-btn pixel-btn-primary w-full"
              onClick={() => (window.location.href = '/login-telegram')}
            >
              Увійти через Telegram
            </button>

            <div className="h-2" />

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