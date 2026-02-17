import React from 'react'
import { useTranslation } from 'react-i18next'
import { setLang } from '@/i18n'
import { cn } from '@/lib/cn'

const LANGS = [
  { code: 'uk' as const, label: 'UK' },
  { code: 'en' as const, label: 'EN' },
  { code: 'pl' as const, label: 'PL' },
]

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const current = (i18n.language ?? 'uk') as 'uk' | 'en' | 'pl'

  return (
    <div className={cn('spd-frame spd-panel spd-bevel-inset flex items-center gap-1 p-1', className)}>
      <div className="px-2 text-xs text-mutedForeground">{t('settings.language')}</div>
      <div className="flex-1" />
      {LANGS.map((l) => {
        const active = current === l.code
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            className={cn(
              'h-9 min-w-[44px] rounded-[4px] border-2 px-2 text-[12px] text-outline-2',
              'transition-[transform,opacity,border-color,background-color] duration-spd active:translate-y-px',
              active ? 'border-spd-gold bg-spd-panel2' : 'border-border bg-transparent opacity-80 hover:opacity-100',
            )}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}