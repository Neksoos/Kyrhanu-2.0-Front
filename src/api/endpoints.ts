import { api } from './client'
import type {
  AchievementsClaimIn,
  AchievementsClaimOut,
  AchievementsShareCardOut,
  AuthLoginIn,
  AuthOut,
  AuthRegisterIn,
  DailyClaimIn,
  DailyClaimOut,
  HealthzOut,
  TelegramInitDataIn,
  TelegramWidgetIn,
} from './types'

export const endpoints = {
  healthz: () => api.get<HealthzOut>('/healthz'),

  authTelegramInitData: (initData: TelegramInitDataIn) => api.post<AuthOut>('/auth/telegram/initdata', initData),
  authTelegramWidget: (payload: TelegramWidgetIn) => api.post<AuthOut>('/auth/telegram/widget', payload),
  authRegister: (body: AuthRegisterIn) => api.post<AuthOut>('/auth/register', body),
  authLogin: (body: AuthLoginIn) => api.post<AuthOut>('/auth/login', body),
  authLogout: () => api.post<{ ok: true }>('/auth/logout'),

  dailyClaim: (body: DailyClaimIn) => api.post<DailyClaimOut>('/daily/claim', body),

  achievementsClaim: (body: AchievementsClaimIn) => api.post<AchievementsClaimOut>('/achievements/claim', body),
  achievementsShareCard: () => api.get<AchievementsShareCardOut>('/achievements/share-card'),
}