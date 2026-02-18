import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { tgReady } from '@/lib/telegram'
import { useTgNavigate } from '@/lib/tgNavigate'

export function NotFoundPage() {
  const nav = useTgNavigate()
  const { t } = useTranslation()

  React.useEffect(() => {
    tgReady()
  }, [])

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('common.not_found_title')}</div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="text-sm text-mutedForeground">{t('common.not_found_body')}</div>

            <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/home', { replace: true })}>
              {t('common.nav_home')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}