import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { setLang } from '@/i18n'

export type Lang = 'uk' | 'en' | 'pl'

export function useI18n() {
  const { t, i18n } = useTranslation()

  return useMemo(() => {
    const raw = (i18n.resolvedLanguage || i18n.language || 'uk') as string
    const lang = raw.toLowerCase() as Lang

    return {
      t,
      i18n,
      lang: (['uk', 'en', 'pl'] as const).includes(lang) ? (lang as Lang) : ('uk' as Lang),
      setLang: (next: Lang) => setLang(next),
    }
  }, [i18n, t])
}