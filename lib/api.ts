// lib/api.ts
export type ApiErrorPayload = {
  detail?: string
  message?: string
}

function normalizeBaseUrl(raw?: string) {
  if (!raw) return ''
  if (/^https?:\/\//.test(raw)) return raw
  return `https://${raw}`
}

export function getApiBase(): string {
  // підтримка різних назв ENV
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API ||
    ''

  const base = normalizeBaseUrl(raw)
  return base || 'http://localhost:8000'
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase()
  const url = path.startsWith('http') ? path : `${base}${path}`

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    let payload: ApiErrorPayload | null = null
    try {
      payload = (await res.json()) as ApiErrorPayload
    } catch {
      // ignore
    }

    const msg =
      payload?.detail ||
      payload?.message ||
      `HTTP ${res.status} ${res.statusText}`

    throw new Error(msg)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  return apiFetch<T>(path, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

export async function apiPost<T>(path: string, body: any, token?: string): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

/**
 * Важливо: BossBattle.tsx очікує named export `api`.
 * Тому залишаємо саме так.
 */
export const api = {
  // MiniApp auth (initData)
  telegramMiniappLogin: (payload: { init_data: string }) =>
    apiPost('/api/auth/telegram', payload),

  // Browser widget auth
  telegramWidgetLogin: (payload: any) =>
    apiPost('/api/auth/telegram-widget', payload),

  // інше (приклад)
  getMe: (token?: string) => apiGet('/api/me', token),
}