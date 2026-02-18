const KEY = 'kyrhanu:accessToken'

export const storage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },

  setAccessToken(token: string | null) {
    try {
      if (!token) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, token)
    } catch {}
  },

  clearAll() {
    try {
      localStorage.removeItem(KEY)
    } catch {}
  },

  clear() {
    storage.clearAll()
  },
}