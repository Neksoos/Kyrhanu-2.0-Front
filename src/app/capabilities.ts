// src/app/capabilities.ts
import { api } from '@/api/client'
import { env } from '@/lib/env'
import type { HealthzOut } from '@/api/types'

export type Capabilities = {
  hasOpenApi: boolean
  hasHealthz: boolean

  hasMe: boolean
  hasDailyClaim: boolean

  hasAchievementsList: boolean
  hasAchievementsClaim: boolean
  hasAchievementsShareCard: boolean

  hasRuns: boolean
  hasInventory: boolean
  hasShop: boolean
  hasTutorial: boolean
}

function pathExists(openapi: any, path: string, methods?: string[]): boolean {
  const item = openapi?.paths?.[path]
  if (!item) return false
  if (!methods?.length) return true
  return methods.some((m) => !!item?.[m.toLowerCase()])
}

async function probePath(path: string): Promise<boolean> {
  try {
    const res = await fetch(`${env.apiBaseUrl}${path}`, { method: 'OPTIONS', credentials: 'include' })
    if (res.status === 404) return false
    if (res.status === 405) return true
    return res.ok || (res.status >= 200 && res.status < 500)
  } catch {
    return false
  }
}

export async function buildCapabilities(): Promise<Capabilities> {
  const base: Capabilities = {
    hasOpenApi: false,
    hasHealthz: false,
    hasMe: false,
    hasDailyClaim: false,
    hasAchievementsList: false,
    hasAchievementsClaim: false,
    hasAchievementsShareCard: false,
    hasRuns: false,
    hasInventory: false,
    hasShop: false,
    hasTutorial: false,
  }

  // healthz (hard probe)
  try {
    const h = await api.get<HealthzOut>('/healthz')
    base.hasHealthz = !!h?.ok
  } catch {
    base.hasHealthz = false
  }

  // openapi (best effort)
  let hasOpenApi = false
  let openapi: any = null
  try {
    const res = await fetch(`${env.apiBaseUrl}/openapi.json`, { credentials: 'include' })
    if (res.ok) {
      openapi = await res.json()
      hasOpenApi = true
    }
  } catch {}

  base.hasOpenApi = hasOpenApi

  const checks: Array<[keyof Capabilities, string, string[]]> = [
    ['hasMe', '/me', ['get']],
    ['hasDailyClaim', '/daily/claim', ['post']],
    ['hasAchievementsList', '/achievements', ['get']],
    ['hasAchievementsClaim', '/achievements/claim', ['post']],
    ['hasAchievementsShareCard', '/achievements/share-card', ['get']],
    ['hasRuns', '/runs/start', ['post']],
    ['hasInventory', '/inventory', ['get']],
    ['hasShop', '/shop', ['get']],
    ['hasTutorial', '/tutorial', ['get']],
  ]

  for (const [key, path, methods] of checks) {
    if (hasOpenApi) base[key] = pathExists(openapi, path, methods)
    else base[key] = await probePath(path)
  }

  return base
}