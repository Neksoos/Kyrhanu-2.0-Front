export type TgWebApp = {
  ready: () => void
  expand: () => void
  initData?: string
  initDataUnsafe?: any
  colorScheme?: 'light' | 'dark'
  themeParams?: Record<string, string>
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  }
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

export function getWebApp(): TgWebApp | undefined {
  return window.Telegram?.WebApp
}

/**
 * Get Telegram initData.
 * Sources:
 * 1) window.Telegram.WebApp.initData (normal)
 * 2) URL query: ?tgWebAppData=...
 * 3) URL hash:  #tgWebAppData=...
 * 4) Local debug: ?initData=...
 */
export function getInitData(): string {
  const tg = getWebApp()
  const real = tg?.initData
  if (real && typeof real === 'string') return real

  try {
    const sp = new URLSearchParams(window.location.search)
    const q = sp.get('initData') ?? sp.get('tgWebAppData')
    if (q) return decodeURIComponent(q)

    const hash = (window.location.hash ?? '').replace(/^#/, '')
    const hs = new URLSearchParams(hash)
    const h = hs.get('tgWebAppData')
    if (h) return decodeURIComponent(h)

    return ''
  } catch {
    return ''
  }
}

export function tgReady() {
  const tg = getWebApp()
  if (!tg) return
  try {
    tg.ready()
    tg.expand()
  } catch {}
}

export function haptic(kind: 'light' | 'medium' = 'light') {
  const tg = getWebApp()
  if (!tg?.HapticFeedback) return
  try {
    tg.HapticFeedback.impactOccurred(kind)
  } catch {}
}

export function openExternalLink(url: string) {
  const tg = getWebApp()
  if (tg?.openLink) {
    try {
      tg.openLink(url)
      return
    } catch {}
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
function hexToRgbTriplet(hex?: string): [number, number, number] | null {
  if (!hex) return null
  const h = hex.replace('#', '').trim()
  if (h.length !== 6) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some((x) => Number.isNaN(x))) return null
  return [r, g, b]
}
function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}
function lighten([r, g, b]: [number, number, number], t: number): [number, number, number] {
  return [mix(r, 255, t), mix(g, 255, t), mix(b, 255, t)]
}
function darken([r, g, b]: [number, number, number], t: number): [number, number, number] {
  return [mix(r, 0, t), mix(g, 0, t), mix(b, 0, t)]
}
function toTripletStr(rgb: [number, number, number]) {
  return `${clamp(rgb[0], 0, 255)} ${clamp(rgb[1], 0, 255)} ${clamp(rgb[2], 0, 255)}`
}

/** Apply Telegram themeParams to SPD vars. Never switch to white UI. */
export function applyThemeToCssVars() {
  const tg = getWebApp()
  const root = document.documentElement
  const scheme = tg?.colorScheme ?? 'dark'
  const params = tg?.themeParams ?? {}

  const tgBg = hexToRgbTriplet(params.bg_color)
  const tgText = hexToRgbTriplet(params.text_color)

  const baseBg: [number, number, number] = [14, 12, 10]
  const basePanel: [number, number, number] = [28, 22, 18]

  const bg = tgBg ? darken(lighten(tgBg, 0.05), 0.55) : baseBg
  const brighten = scheme === 'light' ? 0.1 : 0
  const panel = lighten(basePanel, brighten)
  const panel2 = lighten([23, 18, 15], brighten)

  root.style.setProperty('--spd-bg', toTripletStr(bg))
  root.style.setProperty('--spd-panel', toTripletStr(panel))
  root.style.setProperty('--spd-panel-2', toTripletStr(panel2))

  if (tgText) {
    const text = scheme === 'light' ? darken(tgText, 0.65) : lighten(tgText, 0.05)
    root.style.setProperty('--spd-text', toTripletStr(text))
  }

  root.style.setProperty('--background', getComputedStyle(root).getPropertyValue('--spd-bg').trim())
  root.style.setProperty('--foreground', getComputedStyle(root).getPropertyValue('--spd-text').trim())
  root.style.setProperty('--card', getComputedStyle(root).getPropertyValue('--spd-panel').trim())
  root.style.setProperty('--card-foreground', getComputedStyle(root).getPropertyValue('--spd-text').trim())
  root.style.setProperty('--muted', getComputedStyle(root).getPropertyValue('--spd-panel-2').trim())
  root.style.setProperty('--muted-foreground', getComputedStyle(root).getPropertyValue('--spd-text-dim').trim())
}

export function detectTelegramLangCode(): string | null {
  const tg = getWebApp()
  const code = tg?.initDataUnsafe?.user?.language_code
  if (!code || typeof code !== 'string') return null
  return code.toLowerCase()
}
export function mapLang(code: string | null | undefined): 'uk' | 'en' | 'pl' {
  const c = (code ?? '').toLowerCase()
  if (c.startsWith('uk')) return 'uk'
  if (c.startsWith('pl')) return 'pl'
  if (c.startsWith('ru')) return 'uk'
  return 'en'
}