import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'
import { storage } from '@/lib/storage'
import { getInitData, tgReady, waitForWebApp } from '@/lib/telegram'

export function AuthPage() {
  const nav = useNavigate()
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'error' | 'ok'>('idle')

  React.useEffect(() => {
    ;(async () => {
      // In some WebViews Telegram injects WebApp object with a delay.
      await waitForWebApp(2000)
      await tgReady()

      const initData = getInitData()

      if (!initData) {
        setStatus('error')
        toast.error('Нема Telegram initData. Відкрий міні-ап через Telegram (Menu Button).')
        return
      }

      setStatus('loading')

      try {
        const res = await endpoints.auth.telegramInitData({ initData })
        storage.setAccessToken(res.accessToken)
        setStatus('ok')
        nav('/daily', { replace: true })
      } catch (e: any) {
        setStatus('error')
        toast.error(e?.detail ?? e?.message ?? 'Помилка Telegram авторизації')
      }
    })()
  }, [nav])

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md spd-panel spd-frame spd-bevel-inset p-4">
        <div className="spd-label text-outline-2">Вхід до Курганів</div>

        {status === 'loading' && (
          <div className="mt-3 text-sm opacity-80">Авторизація через Telegram…</div>
        )}

        {status === 'error' && (
          <div className="mt-3 text-sm opacity-80">
            InitData відсутній або бек недоступний.
            <br />
            Відкрий міні-ап через Telegram → бот → кнопка меню (Web App).
          </div>
        )}

        {status === 'ok' && (
          <div className="mt-3 text-sm opacity-80">Готово…</div>
        )}
      </div>
    </div>
  )
}