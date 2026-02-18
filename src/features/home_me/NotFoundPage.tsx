import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTgNavigate } from '@/lib/tgNavigate'

export function NotFoundPage() {
  const nav = useTgNavigate()
  const { t } = useTranslation()

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('notfound.title')}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-mutedForeground">{t('notfound.body')}</div>
            <div className="spd-divider" />

            {/* Повертаємось на корінь: RootRedirect сам вирішить /auth чи /home */}
            <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/', { replace: true })}>
              {t('common.nav_home')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}