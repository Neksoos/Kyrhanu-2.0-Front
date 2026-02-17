// Runtime env support for Docker/Nginx deployments.
// We generate /config.js at container start and set window.__ENV__ there.

type RuntimeEnv = {
  VITE_API_BASE_URL?: string
  VITE_API_DEBUG?: string
  VITE_TG_BOT_USERNAME?: string
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnv
  }
}

function pickEnv(key: keyof RuntimeEnv): string {
  const fromRuntime = window.__ENV__?.[key]
  const fromBuild = (import.meta as any)?.env?.[key]
  return String(fromRuntime ?? fromBuild ?? '').trim()
}

function normalizeApiBase(raw: string): string {
  let s = (raw ?? '').trim()
  if (!s) return ''

  // If only hostname given, assume https.
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`

  // Remove trailing slashes
  return s.replace(/\/+$/, '')
}

export const API_BASE_URL = normalizeApiBase(pickEnv('VITE_API_BASE_URL'))
export const API_DEBUG = pickEnv('VITE_API_DEBUG') === 'true'
export const TG_BOT_USERNAME = pickEnv('VITE_TG_BOT_USERNAME')

export const env = {
  apiBaseUrl: API_BASE_URL,
  apiDebug: API_DEBUG,
  tgBotUsername: TG_BOT_USERNAME,
} as const