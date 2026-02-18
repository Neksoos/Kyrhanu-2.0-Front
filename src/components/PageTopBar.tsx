import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTgNavigate } from '@/lib/tgNavigate'

export function PageTopBar({
  title,
  backTo = '/home',
  className,
}: {
  title: string
  backTo?: string
  className?: string
}) {
  const { t } = useTranslation()
  const nav = useTgNavigate()

  return (
    <div
      className={cn(
        'sticky top-0 z-10 -mx-4 mb-3 border-b border-white/10 bg-[rgba(0,0,0,0.15)] backdrop-blur',
        className,
      )}
    >
      <div className="safe px-4 py-3">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button
            variant="spd"
            spdTone="neutral"
            className="h-10 w-24"
            onClick={() => nav(backTo)}
          >
            {t('common.back')}
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold tracking-wide text-[rgb(var(--spd-text))]">
              {title}
            </div>
            <div className="text-[11px] text-[rgb(var(--spd-text-dim))]">{t('app.title')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
