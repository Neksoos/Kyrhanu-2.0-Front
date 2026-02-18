import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'
import { storage } from '@/lib/storage'
import { useTgNavigate } from '@/lib/tgNavigate'

function getTelegramInitData(): string | null {
  const tg = (window as any)?.Telegram?.WebApp
  const initData = (tg?.initData as string | undefined) ?? ''
  return initData.trim() ? initData : null
}

export function AuthPage() {
  const nav = useTgNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()

  const login = useMutation({
    mutationFn: async () => {
      try {
        const r = await endpoints.auth.refresh()
        if (r?.accessToken) return r
      } catch {}

      const initData = getTelegramInitData()
      if (!initData) {
        throw { detail: 'Telegram initData missing. Open from Telegram Mini App.' }
      }

      return endpoints.auth.telegramInitData({ initData })
    },
    onSuccess: (res) => {
      storage.setAccessToken(res.accessToken)
      qc.invalidateQueries()
      toast.success(t('auth.login_success'))
      nav('/daily', { replace: true })
    },
    onError: (e: any) => toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' })),
  })

  React.useEffect(() => {
    login.mutate()
  }, [])

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md text-center text-sm text-mutedForeground">
        {t('common.loading')}
      </div>
    </div>
  )
}