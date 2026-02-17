import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './resources/en.json'
import uk from './resources/uk.json'
import pl from './resources/pl.json'
import { detectTelegramLangCode, mapLang } from '@/lib/telegram'

const STORAGE_KEY = 'lang'

export function getInitialLang(): 'uk' | 'en' | 'pl' {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'uk' || saved === 'en' || saved === 'pl') return saved
  return mapLang(detectTelegramLangCode())
}

export function setLang(lang: 'uk' | 'en' | 'pl') {
  localStorage.setItem(STORAGE_KEY, lang)
  i18n.changeLanguage(lang)
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
      pl: { translation: pl },
    },
    lng: getInitialLang(),
    fallbackLng: 'uk',
    interpolation: { escapeValue: false },
    returnNull: false,
  })

export default i18n