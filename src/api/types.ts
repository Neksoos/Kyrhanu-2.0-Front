export type User = {
  id: string
  email: string | null
  display_name: string
  created_at: string
}

export type AuthOut = {
  ok: boolean
  user: User
  accessToken: string
}

export type TelegramInitDataIn = { initData: string }
export type TelegramWidgetIn = { payload: unknown }
export type AuthRegisterIn = { email: string; password: string }
export type AuthLoginIn = { email: string; password: string }

export type HealthzOut = { ok: boolean; dbOk: boolean }

export type DailyVariant = 'A' | 'B' | 'C'
export type TodayState = {
  day_key: string
  claimed: boolean
  variant: DailyVariant | null
  reward: { gold: number; thread: number; turq: number } | null
  story: string
}
export type DailyClaimIn = { variant: DailyVariant }
export type DailyClaimOut = { ok: boolean; today: TodayState }

export type Reward = { type: string; amount: number }
export type AchievementsClaimIn = { achievement_id: string }
export type AchievementsClaimOut = { ok: boolean; achievement_id: string; reward: Reward }
export type AchievementsShareCardOut = { card_payload?: unknown; card_url?: string }

export type FastApiErrorBody = { detail: string | unknown }