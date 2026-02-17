import { api } from './client'
import type {
  AuthResponse,
  DailyClaimResponse,
  DailyVariant,
  AchievementClaimResponse,
  AchievementShareCardResponse,
  HealthzResponse,
} from './types'

export const endpoints = {
  healthz: () => api.get<HealthzResponse>('/healthz'),

  auth: {
    register: (body: { email: string; password: string }) => api.post<AuthResponse>('/auth/register', body),
    login: (body: { email: string; password: string }) => api.post<AuthResponse>('/auth/login', body),
    logout: () => api.post<{ ok: true }>('/auth/logout', {}),
    refresh: () => api.post<{ ok: boolean; accessToken: string }>('/auth/refresh', {}),
    telegramInitData: (body: { initData: string }) => api.post<AuthResponse>('/auth/telegram/initdata', body),
    telegramWidget: (body: { payload: Record<string, any> }) => api.post<AuthResponse>('/auth/telegram/widget', body),
  },

  daily: {
    claim: (body: { variant: DailyVariant }) => api.post<DailyClaimResponse>('/daily/claim', body),
  },

  achievements: {
    claim: (body: { achievement_id: string }) =>
      api.post<AchievementClaimResponse>('/achievements/claim', body),
    shareCard: () => api.get<AchievementShareCardResponse>('/achievements/share-card'),
  },
}