import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'
import { API_BASE_URL } from '@/lib/env'
import { getInitData, getWebApp } from '@/lib/telegram'
import { storage } from '@/lib/storage'

type Status = 'idle' | 'loading' | 'done' | 'error'

async function waitForWebApp(timeoutMs = 1500): Promise<ReturnType<typeof getWebApp> | null> {
  const start = Date.now()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const tg = getWebApp()
    if (tg) return tg
    if (Date.now() - start > timeoutMs) return null
    await new Promise((r) => setTimeout(r, 50))
  }
}

export function AuthPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('idle')
  const [details, setDetails] = useState<string>('')

  const debugInfo = useMemo(() => {
    const tg = getWebApp()
    const initData = getInitData()
    const u = tg?.initDataUnsafe?.user
    return {
      tg: tg ? 'ok' : 'missing',
      initDataLen: initData?.length ?? 0,
      apiBase: API_BASE_URL || '(empty)',
      user: u ? `${u.id}${u.username ? ` (@${u.username})` : ''}` : '(unknown)',
    }
  }, [status])

  const doTelegramAuth = useCallback(async () => {
    setDetails('')
    setStatus('loading')

    const tg = await waitForWebApp(1800)
    const initData = getInitData()

    if (!tg || !initData) {
      setStatus('error')
      setDetails(
        [
          `TG WebApp: ${tg ? 'ok' : 'missing'}`,
          `initData length: ${initData?.length ?? 0}`,
          `API base: ${API_BASE_URL || '(empty)'}`,
          '',
          'Tip: open via Telegram bot → Menu button (Web App). A plain link usually has no initData.',
        ].join('\n'),
      )
      return
    }

    try {
      // Backend: POST /auth/telegram/initdata { initData }
      const res = await endpoints.auth.telegramInitData({ initData })
      storage.setToken(res.accessToken)
      setStatus('done')
      navigate('/daily', { replace: true })
    } catch (e: any) {
      console.error(e)
      toast.error('Auth failed')
      setStatus('error')
      setDetails(
        [
          `Request failed: ${String(e?.message ?? e)}`,
          `API base: ${API_BASE_URL || '(empty)'}`,
        ].join('\n'),
      )
    }
  }, [navigate])

  useEffect(() => {
    doTelegramAuth()
  }, [doTelegramAuth])

  if (status === 'loading') {
    return <div className="text-center">Auth…</div>
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-center text-xl font-semibold">Вхід до Курганів</h1>

      {status === 'error' && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm opacity-80">
            InitData відсутній або бек недоступний.
            <br />
            Відкрий міні-ап через Telegram → бот → кнопка меню (Web App).
          </div>

          <button
            className="mt-4 w-full rounded-xl border border-[rgb(var(--spd-gold))]/40 bg-[rgb(var(--spd-panel))] px-4 py-3 text-sm"
            onClick={doTelegramAuth}
          >
            Спробувати ще раз
          </button>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-left text-xs opacity-80">
            <div>Debug</div>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {details ||
                [
                  `TG WebApp: ${debugInfo.tg}`,
                  `initData length: ${debugInfo.initDataLen}`,
                  `API base: ${debugInfo.apiBase}`,
                  `user: ${debugInfo.user}`,
                ].join('\n')}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}