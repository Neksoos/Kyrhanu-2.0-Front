import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/api/client'
import { endpoints } from '@/api/endpoints'
import { storage } from '@/lib/storage'
import { tgReady } from '@/lib/telegram'

/**
 * Простий "Дім". Тут ми не тягнемо профіль з API (у фронті немає /users/me),
 * але даємо користувачу базову навігацію і вихід.
 */
export function HomeMePage() {
  const nav = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const tgUser = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      return w?.Telegram?.WebApp?.initDataUnsafe?.user ?? null
    } catch {
      return null
    }
  }, [])

  const hasToken = Boolean(storage.getAccessToken())

  const onLogout = async () => {
    try {
      setIsLoggingOut(true)

      // якщо токена немає — просто чистимо локально
      if (storage.getAccessToken()) {
        await api.post(endpoints.auth.logout)
      }
    } catch {
      // навіть якщо бек не відповів — чистимо локально
    } finally {
      storage.clear()
      setIsLoggingOut(false)
      toast.success('Вихід виконано')
      nav('/auth', { replace: true })
    }
  }

  // Telegram WebApp readiness (safe in browser too)
  tgReady()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Дім</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm text-outline-2/80">
          {tgUser ? (
            <div>
              <div>
                Telegram: <b>{tgUser.first_name}</b>
                {tgUser.username ? ` (@${tgUser.username})` : ''}
              </div>
              <div>ID: {tgUser.id}</div>
            </div>
          ) : (
            <div>Telegram user не визначений (відкрий міні-ап через бота).</div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button spdTone="primary" onClick={() => nav('/daily')}>
            Daily Rebirth
          </Button>

          <Button onClick={() => nav('/settings')}>Налаштування</Button>

          {hasToken ? (
            <Button spdTone="danger" disabled={isLoggingOut} onClick={onLogout}>
              {isLoggingOut ? 'Вихід…' : 'Вийти'}
            </Button>
          ) : (
            <Button onClick={() => nav('/auth')}>Увійти</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}