import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'
import { storage } from '@/lib/storage'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export function SettingsPage() {
  const nav = useNavigate()
  const { t } = useTranslation()

  const [health, setHealth] = React.useState<{ ok: boolean; dbOk?: boolean } | null>(null)

  React.useEffect(() => {
    endpoints
      .healthz()
      .then((r) => setHealth(r))
      .catch(() => setHealth({ ok: false }))
  }, [])

  async function onLogout() {
    try {
      await endpoints.auth.logout()
    } catch {
      // ignore
    }
    storage.clearAll()
    toast(t('auth.logout'))
    nav('/auth', { replace: true })
  }

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('settings.title')}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-mutedForeground mb-2">{t('settings.language')}</div>
              <LanguageSwitcher />
            </div>

            <div className="spd-divider" />

            <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/patron')}>
              {t('settings.patron')}
            </Button>

            <Button variant="spd" spdTone="danger" className="w-full" onClick={onLogout}>
              {t('settings.logout')}
            </Button>

            <div className="spd-divider" />

            <div className="text-xs text-mutedForeground">
              {t('settings.health')}:{' '}
              {!health
                ? t('common.loading')
                : !health.ok
                  ? t('settings.health_fail')
                  : health.dbOk === false
                    ? t('settings.health_ok_db_fail')
                    : t('settings.health_ok')}
            </div>
            <div className="text-[11px] text-mutedForeground">
              {t('settings.token')}: {storage.getAccessToken() ? t('settings.token_present') : t('settings.token_missing')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}