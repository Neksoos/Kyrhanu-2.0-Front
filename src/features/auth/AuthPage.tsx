import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'
import { storage } from '@/lib/storage'
import { withTgParams } from '@/lib/tgNavigate'
import { setAccessToken } from '@/api/client'

export function AuthPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const qc = useQueryClient()
  const { t } = useTranslation()

  const login = useMutation({
    mutationFn: async () => endpoints.auth.telegramInitData({}),
    onSuccess: (res) => {
      // ✅ правильні поля відповіді
      storage.setAccessToken(res.accessToken)
      if (res.refreshToken) storage.setRefreshToken(res.refreshToken)

      // ✅ щоб API клієнт одразу почав слати Bearer
      setAccessToken(res.accessToken)

      qc.invalidateQueries()
      toast.success(t('auth.logged_in'))

      // ✅ після логіну на головну
      nav(withTgParams('/home', loc), { replace: true })
    },
    onError: (e: any) =>
      toast.error(t('errors.backend_generic', { message: e?.detail ?? e?.message ?? 'Error' })),
  })

  React.useEffect(() => {
    login.mutate()
  }, [])

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center text-sm text-mutedForeground">{t('common.loading')}</div>
      </div>
    </div>
  )
}