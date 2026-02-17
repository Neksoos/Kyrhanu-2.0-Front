import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="safe min-h-dvh spd-bg px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('common.not_found_title')}</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-mutedForeground">{t('common.not_found_body')}</div>
            <Link to="/home" className="block">
              <Button variant="spd" spdTone="neutral" className="w-full">
                {t('common.nav_home')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}