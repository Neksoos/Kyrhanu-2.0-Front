// src/api/endpoints.ts
import { api } from './client'
import type {
  AuthOut,
  DailyClaimOut,
  DailyVariant,
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
    claim: (body: { achievement_id: string }) => api.post<AchievementsClaimOut>('/achievements/claim', body),
    shareCard: () => api.get<AchievementsShareCardOut>('/achievements/share-card'),
  },
}