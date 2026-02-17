import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL, api } from '@/api/client'
import type { HealthzOut } from '@/api/types'

export type Capabilities = {
  health?: HealthzOut
  openApiOk: boolean
  paths: Set<string>
  hasDailyClaim: boolean
  hasAchievementsClaim: boolean
  hasAchievementsShareCard: boolean
  hasMe: boolean
  hasInventory: boolean
  hasRuns: boolean
  hasShop: boolean
  hasTutorial: boolean
}

function key(path: string, method: string) {
  return `${method.toUpperCase()} ${path}`
}

async function fetchOpenApi(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/openapi.json`, { method: 'GET', credentials: 'include' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function useCapabilities() {
  return useQuery({
    queryKey: ['capabilities'],
    queryFn: async (): Promise<Capabilities> => {
      const [health, openapi] = await Promise.all([
        api.get<HealthzOut>('/healthz').catch(() => undefined),
        fetchOpenApi(),
      ])

      const paths = new Set<string>()
      const openApiOk = !!openapi?.paths
      if (openApiOk) {
        for (const [p, methods] of Object.entries<any>(openapi.paths)) {
          for (const m of Object.keys(methods ?? {})) paths.add(key(p, m))
        }
      }

      const has = (p: string, m: string) => (openApiOk ? paths.has(key(p, m)) : false)

      return {
        health,
        openApiOk,
        paths,
        hasDailyClaim: has('/daily/claim', 'post'),
        hasAchievementsClaim: has('/achievements/claim', 'post'),
        hasAchievementsShareCard: has('/achievements/share-card', 'get'),
        hasMe: has('/me', 'get'),
        hasInventory: has('/inventory', 'get'),
        hasRuns: has('/runs/start', 'post') && has('/runs/act', 'post'),
        hasShop: has('/shop/offers', 'get'),
        hasTutorial: has('/tutorial/state', 'get'),
      }
    },
    staleTime: 60_000,
  })
}