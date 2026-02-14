// src/lib/api.ts
const RAW_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  ''

export const API_BASE = RAW_BASE.replace(/\/$/, '')

function makeUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`

  // Якщо API_BASE не заданий (dev) — йдемо в same-origin /api
  if (!API_BASE) return p

  // Якщо передали вже повний URL
  if (p.startsWith('http://') || p.startsWith('https://')) return p

  return `${API_BASE}${p}`
}

async function parseError(res: Response) {
  const text = await res.text().catch(() => '')
  return text || `HTTP ${res.status}`
}

export async function apiGet<T>(path: string, token?: string) {
  const res = await fetch(makeUrl(path), {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  })

  if (!res.ok) throw new Error(await parseError(res))
  return (await res.json()) as T
}

export async function apiPost<T>(path: string, body: any, token?: string) {
  const res = await fetch(makeUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: 'include',
  })

  if (!res.ok) throw new Error(await parseError(res))
  return (await res.json()) as T
}