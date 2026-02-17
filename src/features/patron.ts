const KEY = 'kyrhanu_patron_seen'

export const JAR_URL = 'https://send.monobank.ua/jar/6mY3vVdQbE' // можеш змінити на свій

export function utcDayKey(d = new Date()): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function markPatronSeen(dayKey: string) {
  try {
    const raw = localStorage.getItem(KEY)
    const obj = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    obj[dayKey] = true
    localStorage.setItem(KEY, JSON.stringify(obj))
  } catch {
    // ignore
  }
}