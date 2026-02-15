'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import TelegramLoginWidget from '@/components/TelegramLoginWidget'
import { api, type AuthResponse } from '@/lib/api'
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram'

export default function HomePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const inMiniApp = useMemo(() => (typeof window !== 'undefined' ? isTelegramMiniApp() : false), [])

  const finishAuth = (res: AuthResponse) => {
    localStorage.setItem('access_token', res.access_token)
    if (res.is_new_user) router.replace('/onboarding')
    else router.replace('/game')
  }

  useEffect(() => {
    // If already logged in — go to game
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (token) {
      router.replace('/game')
      return
    }

    // Mini App: auto-login by initData
    if (inMiniApp) {
      const tg = getTelegramWebApp()
      const initData = tg?.initData
      if (!initData) {
        setError('Не знайдено Telegram initData. Відкрий гру через Telegram Mini App.')
        setLoading(false)
        return
      }

      api
        .telegramMiniappLogin(initData)
        .then(finishAuth)
        .catch((e) => {
          setError(e?.message || 'Помилка входу через Telegram Mini App')
          setLoading(false)
        })

      return
    }

    // Browser: show Telegram widget
    setLoading(false)
  }, [inMiniApp, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white/80 p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Прокляті Кургани</h1>
        <p className="text-sm text-neutral-600 mb-6">Етно-українська гра міфології та долі</p>

        {loading && <p className="text-sm">Зачекай…</p>}

        {!loading && error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && !inMiniApp && (
          <div className="mb-4">
            <TelegramLoginWidget
              onAuthed={(res) => {
                if (res?.access_token) finishAuth(res)
              }}
            />
          </div>
        )}

        <Link
          href="/login"
          className="block w-full rounded-xl border border-neutral-300 px-4 py-3 text-center text-sm hover:bg-neutral-50"
        >
          Або увійти паролем
        </Link>

        <p className="mt-4 text-xs text-neutral-500">
          * В Telegram Mini App використовується <b>initData</b>. У браузері — тільки <b>Telegram Login Widget</b>.
        </p>
      </div>
    </div>
  )
}