import { env } from '@/lib/env'
import { storage } from '@/lib/storage'

export type ApiError = {
  status: number
  detail: string
  data?: unknown
}

const joinUrl = (base: string, path: string) => {
  const b = base.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

async function parseJsonSafe(res: Response) {
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function apiFetch<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  opts?: {
    body?: unknown
    query?: Record<string, string | number | boolean | undefined | null>
    headers?: Record<string, string>
  },
): Promise<T> {
  const qs = new URLSearchParams()
  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null) continue
      qs.set(k, String(v))
    }
  }

  const url = joinUrl(env.apiBaseUrl, path) + (qs.toString() ? `?${qs.toString()}` : '')

  const headers: Record<string, string> = { ...(opts?.headers ?? {}) }

  const token = storage.getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opts?.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: 'include', // ✅ потрібне для refresh-cookie
  })

  const data = await parseJsonSafe(res)

  if (!res.ok) {
    const detail =
      (data as any)?.detail ??
      (data as any)?.message ??
      res.statusText ??
      'Request failed'

    throw { status: res.status, detail, data } satisfies ApiError
  }

  return (data ?? null) as T
}

export const api = {
  get: <T>(path: string, query?: Record<string, any>) => apiFetch<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>('PATCH', path, { body }),
  del: <T>(path: string, body?: unknown) => apiFetch<T>('DELETE', path, { body }),
}