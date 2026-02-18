// src/api/types.ts
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

// ---- Runs ----
export type RunChoice = {
  id: string
  label: string
}

export type RunNode = {
  type: 'event' | 'combat' | 'rest' | 'treasure' | 'final'
  title: string
  body: string
  choices: RunChoice[]
  enemy?: { name: string; hp: number; atk: number }
}

export type CombatState = {
  enemy_name: string
  enemy_hp: number
  enemy_max_hp: number
  enemy_atk: number
  player_defending?: boolean
  log: string[]
}

export type RunState = {
  seed: number
  step: number
  total?: number
  current?: RunNode | null
  player: { hp: number; max_hp: number; energy: number }
  gold: number
  loot: Array<{ item_id: string; source?: string }>
  combat: CombatState | null
  log: string[]
  rewards?: { gold: number; items: string[] }
  result?: 'victory' | 'defeat'
}

export type RunOut = {
  id: string
  mode: string
  state: RunState
}

export type RunsCurrentOut = { ok: boolean; run: RunOut | null }
export type RunsStartOut = { ok: boolean; run: RunOut }
export type RunsChoiceOut = { ok: boolean; run: RunOut }
export type RunsCombatActOut = { ok: boolean; run: RunOut }
export type RunsFinishOut = { ok: boolean; run: RunOut }

// ---- Inventory / Shop ----
export type InventoryItem = {
  item_instance_id: string
  qty: number
  item_id: string
  name: string
  slot: string
  rarity: string
  stats: Record<string, any>
  created_at: string
}

export type InventoryOut = {
  ok: boolean
  equipment: Record<string, string>
  items: InventoryItem[]
}

export type ShopOffer = {
  offer_id: string
  item_id: string
  name: string
  slot: string
  rarity: string
  stats: Record<string, any>
  price_chervontsi: number
  stock: number
  tag: string
}

export type ShopOut = { ok: boolean; offers: ShopOffer[] }
export type ShopBuyOut = {
  ok: boolean
  bought: { item_instance_id: string; item_id: string; price_chervontsi: number }
}

export type FastApiErrorBody = { detail: string | unknown }

/**
 * ---- Compatibility aliases (щоб існуючі імпорти не ламалися) ----
 * В тебе в коді вже є імпорти типів AuthResponse / Today / ... — додаємо їх як alias.
 */
export type AuthResponse = AuthOut
export type HealthzResponse = HealthzOut
export type DailyClaimResponse = DailyClaimOut
export type AchievementClaimResponse = AchievementsClaimOut
export type AchievementShareCardResponse = AchievementsShareCardOut
export type Today = TodayState