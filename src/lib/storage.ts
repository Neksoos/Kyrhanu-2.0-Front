const ACCESS_KEY = 'access_token'
const TG_WIDGET_KEY = 'tg_widget_payload'

export const storage = {
  getAccessToken(): string {
    return localStorage.getItem(ACCESS_KEY) ?? ''
  },
  setAccessToken(token: string) {
    localStorage.setItem(ACCESS_KEY, token)
  },
  clearAll() {
    localStorage.removeItem(ACCESS_KEY)
  },
  getWidgetPayload(): unknown | null {
    const raw = localStorage.getItem(TG_WIDGET_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  },
}