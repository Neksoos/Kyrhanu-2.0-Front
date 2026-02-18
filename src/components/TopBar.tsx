import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useI18n } from '@/lib/i18n'

export function TopBar() {
  const { t } = useI18n()

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-screen-xl px-4 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="text-left">
            <div className="text-2xl font-semibold leading-none">{t('app.title')}</div>
          </div>

          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}