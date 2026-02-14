'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { isTelegram, getInitData, initTelegram } from '@/lib/telegram'
import { api } from '@/lib/api'
import { TapGame } from '@/components/TapGame'
import { DailyFate } from '@/components/DailyFate'
import { GuildPanel } from '@/components/GuildPanel'
import { BossBattle } from '@/components/BossBattle'
import { Shop } from '@/components/Shop'
import { Navigation } from '@/components/Navigation'
import { UserBar } from '@/components/UserBar'
import { Notifications } from '@/components/Notifications'
import { TelegramLoginWidget } from '@/components/TelegramLoginWidget'

export default function Home() {
  const { isAuthenticated, setAuth, activeTab } = useStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        if (isTelegram()) {
          initTelegram()
          const initData = getInitData()
          if (initData) {
            const response = await api.telegramAuth(initData)
            setAuth(response.access_token, response.user)

            if (response.is_new) {
              useStore.getState().addNotification({
                id: `welcome-${Date.now()}`,
                type: 'success',
                title: 'Вітаємо!',
                message: 'Акаунт створено. Можеш копати кургани 😊',
                duration: 4000,
              })
            }
          }
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [setAuth])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kurgan-bg">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">ᛉ</div>
          <p className="text-kurgan-accent text-xl">Завантаження долі...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <main className="min-h-screen pb-20">
      <UserBar />
      <Notifications />
      
      <div className="container mx-auto px-4 py-4">
        {activeTab === 'dig' && <TapGame />}
        {activeTab === 'daily' && <DailyFate />}
        {activeTab === 'guild' && <GuildPanel />}
        {activeTab === 'boss' && <BossBattle />}
        {activeTab === 'shop' && <Shop />}
      </div>
      
      <Navigation />
    </main>
  )
}

function LoginScreen() {
  const [mode, setMode] = useState<'telegram' | 'login' | 'register'>('telegram')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await api.emailLogin(username, password)
      useStore.getState().setAuth(response.access_token, response.user)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await api.emailRegister(username, email, password)
      useStore.getState().setAuth(response.access_token, response.user)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-kurgan-card border border-kurgan-border rounded-lg p-8 rune-border">
        <h1 className="text-3xl font-bold text-kurgan-accent text-center mb-2">
          Прокляті Кургани
        </h1>
        <p className="text-kurgan-muted text-center mb-8">
          Етно-українська гра міфології та долі
        </p>

        {mode === 'telegram' && (
          <div className="text-center space-y-4">
            <p className="text-kurgan-text">
              Увійди через Telegram (один акаунт працює і в Mini App, і в браузері)
            </p>

            {/* Browser Telegram auth (Login Widget). In Mini App, auth happens automatically через initData. */}
            <div className="flex justify-center">
              <TelegramLoginWidget />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={() => setMode('login')}
              className="w-full py-3 bg-kurgan-card border border-kurgan-border text-kurgan-text font-bold rounded hover:border-kurgan-accent transition"
            >
              Або увійти паролем
            </button>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Логін або email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-kurgan-bg border border-kurgan-border rounded text-kurgan-text"
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-kurgan-bg border border-kurgan-border rounded text-kurgan-text"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-kurgan-accent text-kurgan-bg font-bold rounded hover:bg-kurgan-accent-dim transition"
            >
              Увійти
            </button>
            <p className="text-center text-kurgan-muted text-sm">
              Немає акаунту?{' '}
              <button onClick={() => setMode('register')} className="text-kurgan-accent">
                Зареєструватися
              </button>
            </p>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Логін"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-kurgan-bg border border-kurgan-border rounded text-kurgan-text"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-kurgan-bg border border-kurgan-border rounded text-kurgan-text"
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-kurgan-bg border border-kurgan-border rounded text-kurgan-text"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-kurgan-accent text-kurgan-bg font-bold rounded hover:bg-kurgan-accent-dim transition"
            >
              Зареєструватися
            </button>
            <p className="text-center text-kurgan-muted text-sm">
              Вже є акаунт?{' '}
              <button onClick={() => setMode('login')} className="text-kurgan-accent">
                Увійти
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}