import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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

  const currentRunQ = useQuery({
    queryKey: ['runs:current'],
    queryFn: async () => endpoints.runs.current(),
    enabled: hasToken,
    retry: 0,
  })

  const startRun = useMutation({
    mutationFn: async () => endpoints.runs.start(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['runs:current'] })
      nav('/run')
    },
    onError: (e: any) => {
      console.error(e)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' }))
    },
  })

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('home.title')}</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="spd"
              spdTone="primary"
              className="w-full"
              onClick={() => {
                const hasRun = !!currentRunQ.data?.run
                if (hasRun) nav('/run')
                else startRun.mutate()
              }}
              disabled={!hasToken || startRun.isPending || currentRunQ.isFetching}
            >
              {currentRunQ.isFetching || startRun.isPending
                ? t('common.loading')
                : currentRunQ.data?.run
                  ? t('home.cta_continue')
                  : t('home.cta_start')}
            </Button>

            <Button variant="spd" spdTone="primary" className="w-full" onClick={() => nav('/daily')}>
              {t('home.cta_daily')}
            </Button>

            <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/inventory')}>
              {t('home.cta_inventory')}
            </Button>

            <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/shop')}>
              {t('home.cta_shop')}
            </Button>

            <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/achievements')}>
              {t('home.cta_achievements')}
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