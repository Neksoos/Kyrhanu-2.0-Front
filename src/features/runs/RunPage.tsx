import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useCapabilities } from '@/app/useCapabilities'

export function RunPage() {
  const { t } = useTranslation()
  const capsQ = useCapabilities()
  const supported = !!capsQ.data?.hasRuns

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('run.title')}</div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-mutedForeground">{supported ? t('common.soon_body') : t('common.soon_body')}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}