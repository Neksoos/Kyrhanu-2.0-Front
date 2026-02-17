import { API_BASE_URL } from '@/lib/env'

let accessToken = ''

export function setAccessToken(token: string) {
  accessToken = token
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    'Content-Type': 'application/json',
  }

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) return apiFetch<T>(path, options)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  return res.json()
}

async function refreshToken() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const data = await res.json()
    setAccessToken(data.accessToken)
    return true
  } catch {
    return false
  }
}