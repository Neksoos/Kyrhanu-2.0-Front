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
 * Backward/compat layer for imports like:
 *   import { storage } from '@/lib/storage'
 */
export const storage = {
  ACCESS_TOKEN_KEY,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  lsGet,
  lsSet,
  lsRemove,
} as const