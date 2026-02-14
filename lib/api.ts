export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000')

function getToken(explicitToken?: string) {
  if (explicitToken) return explicitToken
  if (typeof window === 'undefined') return undefined
  return localStorage.getItem('access_token') || undefined
}

async function parseError(res: Response) {
  let msg = `HTTP ${res.status}`
  try {
    const data = await res.json()
    msg = data?.detail || data?.message || msg
  } catch {}
  throw new Error(msg)
}

export async function apiPost<T>(path: string, body: any, token?: string): Promise<T> {
  const t = getToken(token)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) await parseError(res)
  return res.json()
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const t = getToken(token)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  })
  if (!res.ok) await parseError(res)
  return res.json()
}

/**
 * ✅ Backward-compatible API object used across components.
 * Important: typed as `any` to avoid build breaks when components call helpers
 * that weren't declared yet (getActiveBosses, getShop, etc).
 */
export const api: any = {
  // generic
  get: <T>(path: string, token?: string) => apiGet<T>(path, token),
  post: <T>(path: string, body: any, token?: string) => apiPost<T>(path, body, token),

  // ---- Auth ----
  me: () => apiGet<{ user: any }>('/api/auth/me'),

  // ---- Bosses ----
  getActiveBosses: () => apiGet<{ bosses: any[] }>('/api/boss/active'),
  attackBoss: (boss_id: number, use_kleynodu: number = 0) =>
    apiPost('/api/boss/attack', { boss_id, use_kleynodu }),

  // (додатково, якщо десь треба)
  telegramMiniAppAuth: (init_data: string) =>
    apiPost('/api/auth/telegram', { init_data }),
  telegramWidgetAuth: (payload: any) =>
    apiPost('/api/auth/telegram-widget', payload),
}

// (опційно) якщо десь було: import api from '@/lib/api'
export default api