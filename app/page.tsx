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

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // для браузера-виджета
  const [botUsername, setBotUsername] = useState<string>('')
  const [widgetReady, setWidgetReady] = useState(false)

  const isTelegramMiniApp = useMemo(() => {
    return typeof window !== 'undefined' && !!(window as any)?.Telegram?.WebApp
  }, [])

  // 1) Mini App: автологін/автореєстрація одразу
  useEffect(() => {
    if (!isTelegramMiniApp) return

    const tg = (window as any).Telegram.WebApp
    const initData = tg?.initData

    if (!initData) {
      setErr('Telegram initData порожній. Відкрий гру через Mini App.')
      return
    }

    ;(async () => {
      try {
        setErr(null)
        setLoading(true)

        const res = await apiPost<AuthResponse>('/api/auth/telegram', {
          init_data: initData,
        })

        localStorage.setItem('access_token', res.access_token)
        window.location.href = res.is_new ? '/onboarding' : '/game'
      } catch (e: any) {
        setErr(e?.message || 'Помилка авторизації Telegram')
      } finally {
        setLoading(false)
      }
    })()
  }, [isTelegramMiniApp])

  // 2) Browser: беремо бот юзернейм з runtime-конфігу (щоб не залежати від build env)
  useEffect(() => {
    if (isTelegramMiniApp) return

    ;(async () => {
      try {
        const res = await fetch('/api/public-config', { cache: 'no-store' })
        const data = await res.json()
        if (!data?.tgBotUsername) {
          setErr('Не задано TG bot username у Railway Variables')
          return
        }
        setBotUsername(data.tgBotUsername)
      } catch {
        setErr('Не вдалося завантажити public-config')
      }
    })()
  }, [isTelegramMiniApp])

  // 3) Browser: вставляємо Telegram Login Widget прямо на головну
  useEffect(() => {
    if (isTelegramMiniApp) return
    if (!botUsername) return

    window.onTelegramAuth = async (user: any) => {
      try {
        setErr(null)
        setLoading(true)

        const res = await apiPost<AuthResponse>('/api/auth/telegram-widget', user)

        localStorage.setItem('access_token', res.access_token)
        window.location.href = res.is_new ? '/onboarding' : '/game'
      } catch (e: any) {
        setErr(e?.message || 'Помилка авторизації Telegram Widget')
      } finally {
        setLoading(false)
      }
    }

    const container = document.getElementById('tg-widget')
    if (!container) return

    container.innerHTML = ''
    setWidgetReady(false)

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
  }, [isTelegramMiniApp, botUsername])

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-2xl mb-4">Прокляті Кургани</h1>

        <p className="text-sm mb-4 opacity-80">
          Етно-українська гра міфології та долі
        </p>

        {err && (
          <div className="text-sm mb-3" style={{ color: '#b30c12' }}>
            {err}
          </div>
        )}

        {isTelegramMiniApp ? (
          <>
            <div className="text-sm mb-3 opacity-80">
              {loading ? 'Входимо через Telegram…' : 'Запуск через Telegram Mini App'}
            </div>

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
            {!err && !widgetReady && (
              <div className="text-sm mb-3 opacity-80">Завантажуємо Telegram Widget…</div>
            )}

            <div id="tg-widget" className="flex justify-center" />

            <div className="h-3" />

            <button
              className="pixel-btn w-full"
              onClick={() => (window.location.href = '/login')}
              disabled={loading}
            >
              Або увійти паролем
            </button>
          </>
        )}
      </div>
    </main>
  )
}