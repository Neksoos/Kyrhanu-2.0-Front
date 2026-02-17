import { env } from '@/lib/env'
import { storage } from '@/lib/storage'

export const API_BASE_URL = env.apiBaseUrl

export class ApiError extends Error {
  status: number
  body: unknown
  detail?: unknown
  constructor(status: number, message: string, body: unknown, detail?: unknown) {
    super(message)
    this.status = status
    this.body = body
    this.detail = detail
  }
}

type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>
}

function extractDetail(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined
  if ('detail' in body) return (body as any).detail
  return undefined
}

function detailToMessage(detail: unknown): string {
  if (detail == null) return ''
  if (typeof detail === 'string') return detail
  try { return JSON.stringify(detail) } catch { return String(detail) }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return text }
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) return false
    const data = (await res.json()) as { ok: boolean; accessToken?: string }
    if (!data.ok || !data.accessToken) return false
    storage.setAccessToken(data.accessToken)
    return true
  } catch {
    return false
  }
}

async function doFetch<T>(path: string, options: FetchOptions, retryOn401: boolean): Promise<T> {
  const token = storage.getAccessToken()

  const headers: Record<string, string> = { ...(options.headers ?? {}) }
  if (!headers['Content-Type'] && options.body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  const text = await res.text()
  const body = text ? safeJson(text) : null
  const detail = extractDetail(body)

  if (res.status === 401 && retryOn401) {
    const refreshed = await tryRefresh()
    if (refreshed) return doFetch<T>(path, options, false)

    storage.clearAll()
    window.location.assign('/auth')
    throw new ApiError(401, 'Unauthorized', body, detail)
  }

  if (!res.ok) {
    const msg = detailToMessage(detail) || res.statusText || `HTTP ${res.status}`
    throw new ApiError(res.status, msg, body, detail)
  }

  return body as T
}

export const api = {
  get<T>(path: string) {
    return doFetch<T>(path, { method: 'GET' }, true)
  },
  post<T>(path: string, body?: unknown) {
    return doFetch<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, true)
  },
}