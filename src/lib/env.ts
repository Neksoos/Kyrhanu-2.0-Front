declare global {
  interface Window {
    __ENV__?: Record<string, string | undefined>
  }
}

export type AppEnv = {
  apiBaseUrl: string
  isDev: boolean
  buildSha: string | null
}

const read = (key: string): string | undefined => {
  const fromRuntime = typeof window !== 'undefined' ? window.__ENV__?.[key] : undefined
  const fromVite = (import.meta as any)?.env?.[key] as string | undefined
  return fromRuntime ?? fromVite
}

export const API_BASE_URL = read('VITE_API_BASE_URL') ?? 'http://localhost:8000'
export const IS_DEV = ((import.meta as any)?.env?.MODE ?? '') !== 'production'
export const BUILD_SHA = read('VITE_BUILD_SHA') ?? null

export const env: AppEnv = {
  apiBaseUrl: API_BASE_URL,
  isDev: IS_DEV,
  buildSha: BUILD_SHA,
}