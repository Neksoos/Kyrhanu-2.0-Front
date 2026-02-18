import { env } from '@/lib/env'
import { storage } from '@/lib/storage'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

function getToken() {
  return accessToken ?? storage.getAccessToken()
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as any),
  }

  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    let detail = 'Request failed'
    try {
      const data = await res.json()
      detail = data?.detail ?? detail
    } catch {}
    throw { status: res.status, detail }
  }

  return res.json()
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : '{}' }),
}