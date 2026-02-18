const ACCESS_TOKEN_KEY = 'kyrhanu:accessToken'
const LANG_KEY = 'kyrhanu:lang'

export type AppLang = 'uk' | 'en' | 'pl'

export const storage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY)
    } catch {
      return null
    }
  },

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token)
    } catch {
      // ignore
    }
  },

  clearAccessToken(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    } catch {
      // ignore
    }
  },

  getLang(): AppLang | null {
    try {
      const v = localStorage.getItem(LANG_KEY)
      if (v === 'uk' || v === 'en' || v === 'pl') return v
      return null
    } catch {
      return null
    }
  },

  setLang(lang: AppLang): void {
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      // ignore
    }
  },

  clearAll(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      // lang не чистимо навмисно, щоб не скидати вибір мови
    } catch {
      // ignore
    }
  },
}