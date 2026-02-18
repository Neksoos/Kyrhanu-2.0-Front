// src/api/endpoints.ts
import { api } from './client'
import type {
  AuthOut,
  DailyClaimOut,
  DailyVariant,
  RunsCurrentOut,
  RunsStartOut,
  RunsChoiceOut,
  RunsCombatActOut,
  RunsFinishOut,
  InventoryOut,
  ShopOut,
  ShopBuyOut,
  AchievementsClaimOut,
  AchievementsShareCardOut,
  HealthzOut,
  TelegramInitDataIn,
  TelegramWidgetIn,
  AuthLoginIn,
  AuthRegisterIn,
} from './types'

export const endpoints = {
  healthz: () => api.get<HealthzOut>('/healthz'),

  auth: {
    register: (body: AuthRegisterIn) => api.post<AuthOut>('/auth/register', body),
    login: (body: AuthLoginIn) => api.post<AuthOut>('/auth/login', body),
    logout: () => api.post<{ ok: true }>('/auth/logout', {}),
    refresh: () => api.post<{ ok: boolean; accessToken: string }>('/auth/refresh', {}),
    telegramInitData: (body: TelegramInitDataIn) => api.post<AuthOut>('/auth/telegram/initdata', body),
    telegramWidget: (body: TelegramWidgetIn) => api.post<AuthOut>('/auth/telegram/widget', body),
  },

  daily: {
    claim: (body: { variant: DailyVariant }) => api.post<DailyClaimOut>('/daily/claim', body),
  },

  achievements: {
    list: () => api.get<{ ok: boolean; achievements: any[] }>('/achievements'),
    claim: (body: { achievement_id: string }) => api.post<AchievementsClaimOut>('/achievements/claim', body),
    shareCard: () => api.get<AchievementsShareCardOut>('/achievements/share-card'),
  },

  runs: {
    current: () => api.get<RunsCurrentOut>('/runs/current'),
    start: () => api.post<RunsStartOut>('/runs/start', {}),
    choice: (runId: string, body: { choice_id: string }) => api.post<RunsChoiceOut>(`/runs/${runId}/choice`, body),
    combatAct: (runId: string, body: { action: 'attack' | 'defend' | 'skill' }) =>
      api.post<RunsCombatActOut>(`/runs/${runId}/combat/act`, body),
    finish: (runId: string) => api.post<RunsFinishOut>(`/runs/${runId}/finish`, {}),
  },

  inventory: {
    get: () => api.get<InventoryOut>('/inventory'),
    equip: (body: { item_instance_id: string }) => api.post<{ ok: boolean; equipment: Record<string, string> }>(
      '/inventory/equip',
      body,
    ),
    unequip: (body: { slot: string }) => api.post<{ ok: boolean; equipment: Record<string, string> }>(
      '/inventory/unequip',
      body,
    ),
  },

  shop: {
    list: () => api.get<ShopOut>('/shop'),
    buy: (body: { offer_id: string }) => api.post<ShopBuyOut>('/shop/buy', body),
  },

  tutorial: {
    get: () => api.get<{ ok: boolean; step: number; completed: boolean; flags: any; rewards_claimed: any }>(
      '/tutorial',
    ),
  },
}