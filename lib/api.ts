// lib/api.ts
// Centralized API helpers + high-level API wrapper used across the app.
// In production we proxy all `/api/*` calls to the backend via Next.js rewrites.

export type AuthResponse = {
  access_token: string
  user: any
  is_new_user?: boolean
}

type FetchInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>
}

const isBrowser = () => typeof window !== 'undefined'

const getStoredToken = (): string | undefined => {
  if (!isBrowser()) return undefined
  return localStorage.getItem('access_token') || undefined
}

function safeJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function apiFetch<T>(path: string, init: FetchInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers || {}),
  }

  // Add JSON content-type automatically for body payloads
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'

  const authToken = token ?? getStoredToken()
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(path, {
    ...init,
    headers,
  })

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || res.statusText || 'Request failed'
    throw new Error(String(msg))
  }
  return data as T
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' }, token)
}

export async function apiPost<T>(path: string, body: any, token?: string): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, token)
}

// --- High-level wrapper (components use this) ---

let lastDailyRollId: number | null = null

// Monotonic counter used by backend anti-cheat for /api/game/tap
const nextTapSeq = (): number => {
  if (!isBrowser()) return 1
  const key = 'tap_seq'
  const prev = Number(localStorage.getItem(key) || '0')
  const next = Number.isFinite(prev) ? prev + 1 : 1
  localStorage.setItem(key, String(next))
  return next
}

const nonce = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function tapOnce(token?: string): Promise<any> {
  return apiPost(
    '/api/game/tap',
    {
      client_timestamp: Date.now(),
      sequence_number: nextTapSeq(),
      nonce: nonce(),
    },
    token,
  )
}

export const api = {
  // Auth
  telegramMiniappLogin: (initData: string) => apiPost<AuthResponse>('/api/auth/telegram', { init_data: initData }),
  tgWidgetLogin: (payload: { tg_user: any; hash: string; auth_date: number }) =>
    apiPost<AuthResponse>('/api/auth/telegram-widget', payload),
  getMe: (token?: string) => apiGet('/api/auth/me', token),

  // Daily fate
  getDaily: async () => {
    const token = getStoredToken()
    const res: any = await apiGet('/api/game/daily', token)
    const daily = res?.daily ?? res
    if (daily?.id) lastDailyRollId = daily.id
    return daily
  },
  makeChoice: async (choice: string) => {
    const token = getStoredToken()
    if (!lastDailyRollId) {
      const res: any = await apiGet('/api/game/daily', token)
      const daily = res?.daily ?? res
      if (daily?.id) lastDailyRollId = daily.id
    }
    if (!lastDailyRollId) throw new Error('Daily roll id is missing')
    return apiPost('/api/game/choice', { daily_roll_id: lastDailyRollId, choice }, token)
  },

  // Energy / taps
  getEnergy: () => apiGet('/api/game/energy', getStoredToken()),
  // UI batches taps; backend processes one tap per request.
  tap: async (taps: number) => {
    const token = getStoredToken()
    const n = Math.max(0, Math.floor(taps || 0))
    let last: any = null
    for (let i = 0; i < n; i++) last = await tapOnce(token)
    return last ?? { ok: true }
  },

  // Shop
  getShopCatalog: () => apiGet('/api/shop/catalog', getStoredToken()),
  buyItem: (itemId: string) => apiPost('/api/shop/buy-item', { item_id: itemId }, getStoredToken()),
  watchAd: () => apiPost('/api/shop/watch-ad', {}, getStoredToken()),

  // Guild
  getMyGuild: () => apiGet('/api/guild/my', getStoredToken()),
  createGuild: (name: string) => apiPost('/api/guild/create', { name }, getStoredToken()),
  joinGuild: (inviteCode: string) => apiPost('/api/guild/join', { invite_code: inviteCode }, getStoredToken()),

  // Boss
  getActiveBosses: () => apiGet('/api/boss/active', getStoredToken()),
  attackBoss: (bossId: number, damage: number) =>
    apiPost('/api/boss/attack', { boss_id: bossId, damage }, getStoredToken()),
}