// src/lib/storage.ts

const ACCESS_TOKEN_KEY = 'access_token'

let inMemoryAccessToken: string | null = null

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken

  try {
    const t = localStorage.getItem(ACCESS_TOKEN_KEY)
    inMemoryAccessToken = t
    return t
  } catch {
    return null
  }
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token

  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token)
    else localStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    // ignore
  }
}

export function clearAll(): void {
  setAccessToken(null)
}

export const storage = {
  getAccessToken,
  setAccessToken,
  clearAll,
}