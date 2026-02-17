import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CTAButton } from '@/components/CTAButton'
import { openExternalLink } from '@/lib/telegram'
import { JAR_URL, markPatronSeen, utcDayKey } from './patron'

export function PatronPage() {
  const nav = useNavigate()
  const loc = useLocation() as any
  const { t } = useTranslation()

  const dayKey = React.useMemo(() => utcDayKey(), [])

  React.useEffect(() => { markPatronSeen(dayKey) }, [dayKey])

  const goBack = () => {
    const from = loc?.state?.from
    if (typeof from === 'string' && from.startsWith('/')) {
      nav(from, { replace: true })
      return
    }
    nav(-1)
  }

  return (
    <div className="safe-x">
      <Card>
        <CardHeader>
          <CardTitle className="spd-label text-outline-3">{t('patron.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="spd-divider" />

          <div className="spd-frame spd-panel spd-bevel-inset p-3">
            <div className="text-sm text-mutedForeground">{t('patron.body')}</div>
            <div className="mt-2 text-xs text-mutedForeground">{t('patron.where_goes')}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <CTAButton
              intent="primary"
              icon="♥"
              onClick={() => {
                markPatronSeen(dayKey)
                openExternalLink(JAR_URL)
                toast.success(t('patron.thanks'))
              }}
            >
              {t('patron.cta_support')}
            </CTAButton>

            <CTAButton
              intent="neutral"
              icon="×"
              onClick={() => {
                markPatronSeen(dayKey)
                goBack()
              }}
            >
              {t('patron.cta_not_now')}
            </CTAButton>
          </div>

          <CTAButton intent="neutral" icon="↗" onClick={() => openExternalLink(JAR_URL)}>
            {t('patron.cta_open_jar')}
          </CTAButton>
        </CardContent>
      </Card>
    </div>
  )
}