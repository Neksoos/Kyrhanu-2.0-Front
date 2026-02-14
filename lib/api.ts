export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000')

async function parseError(res: Response) {
  let msg = `HTTP ${res.status}`
  try {
    const data = await res.json()
    msg = data?.detail || data?.message || msg
  } catch {}
  throw new Error(msg)
}

export async function apiPost<T>(path: string, body: any, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) await parseError(res)
  return res.json()
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) await parseError(res)
  return res.json()
}

/**
 * ✅ Backward-compatible export for old imports:
 * import { api } from '@/lib/api'
 */
export const api = {
  get: <T>(path: string, token?: string) => apiGet<T>(path, token),
  post: <T>(path: string, body: any, token?: string) => apiPost<T>(path, body, token),
}

// (опційно) дефолтний експорт, якщо десь було: import api from '@/lib/api'
export default api