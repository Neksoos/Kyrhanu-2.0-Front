import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { endpoints } from '@/api/endpoints'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { tgReady } from '@/lib/telegram'
import { storage } from '@/lib/storage'
import { useTgNavigate } from '@/lib/tgNavigate'

export function HomeMePage() {
  const nav = useTgNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()

  React.useEffect(() => {
    tgReady()
  }, [])

  const logout = useMutation({
    mutationFn: async () => endpoints.auth.logout(),
    onSuccess: () => {
      storage.clearAll()
      qc.clear()
      nav('/auth', { replace: true })
    },
    onError: () => {
      storage.clearAll()
      qc.clear()
      nav('/auth', { replace: true })
    },
  })

  const hasToken = !!storage.getAccessToken()

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('home.title')}</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="spd" spdTone="primary" className="w-full" onClick={() => nav('/daily')}>
              {t('home.cta_daily')}
            </Button>

            <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/settings')}>
              {t('home.cta_settings')}
            </Button>

            <div className="spd-divider" />

            {hasToken ? (
              <Button
                variant="spd"
                spdTone="danger"
                className="w-full"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                {logout.isPending ? t('common.loading') : t('auth.logout')}
              </Button>
            ) : (
              <Button variant="spd" spdTone="primary" className="w-full" onClick={() => nav('/auth')}>
                {t('auth.title')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}