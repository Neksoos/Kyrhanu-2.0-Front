const SERVER_API_BASE =
  (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ||
    'http://localhost:8000')

function getBase() {
  // ✅ У БРАУЗЕРІ: тільки /api/... (rewrites зробить проксі на бекенд)
  if (typeof window !== 'undefined') return ''
  // ✅ На сервері (SSR/route handlers): можна напряму на бекенд
  return SERVER_API_BASE
}

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
  const base = getBase()

  const res = await fetch(`${base}${path}`, {
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
  const base = getBase()

  const res = await fetch(`${base}${path}`, {
    method: 'GET',
    headers: {
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  })

  if (!res.ok) await parseError(res)
  return res.json()
}

/**
 * Сумісність зі старими імпортами:
 * import { api } from '@/lib/api'
 */
export const api: any = {
  get: <T>(path: string, token?: string) => apiGet<T>(path, token),
  post: <T>(path: string, body: any, token?: string) => apiPost<T>(path, body, token),

  // Auth
  telegramMiniAppAuth: (init_data: string) => apiPost('/api/auth/telegram', { init_data }),
  telegramWidgetAuth: (payload: any) => apiPost('/api/auth/telegram-widget', payload),
  me: () => apiGet<{ user: any }>('/api/auth/me'),

  // Bosses (якщо десь викликається)
  getActiveBosses: () => apiGet<{ bosses: any[] }>('/api/boss/active'),
  attackBoss: (boss_id: number, use_kleynodu: number = 0) =>
    apiPost('/api/boss/attack', { boss_id, use_kleynodu }),
}

export default api