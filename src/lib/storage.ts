// src/lib/storage.ts
const ACCESS_TOKEN_KEY = 'access_token'
let inMemoryAccessToken: string | null = null

export function getAccessToken(): string | null {
  return inMemoryAccessToken
}
export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token
}
export function clearAccessToken(): void {
  setAccessToken(null)
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {}
}

export function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
export function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {}
}
export function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {}
}

/**
 * Clear everything this app stored.
 * (Used by SettingsPage + client auth error handler)
 */
export function clearAll(): void {
  clearAccessToken()

  // якщо пізніше додаси інші ключі — додай їх сюди
  const keys = [ACCESS_TOKEN_KEY]

  try {
    for (const k of keys) localStorage.removeItem(k)
  } catch {}
}

/**
 * Backward/compat layer for imports like:
 *   import { storage } from '@/lib/storage'
 */
export const storage = {
  ACCESS_TOKEN_KEY,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  clearAll,
  lsGet,
  lsSet,
  lsRemove,
} as const