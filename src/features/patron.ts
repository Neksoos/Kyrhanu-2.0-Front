export const JAR_URL = 'https://send.monobank.ua/jar/2uKXz7bzqk'

export function utcDayKey(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function markPatronSeen(dayKey: string) {
  try {
    localStorage.setItem(`patron_seen_${dayKey}`, '1')
  } catch {}
}