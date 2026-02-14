'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { haptic } from '@/lib/telegram'

interface Boss {
  id: number
  name: string
  description: string
  image_url?: string
  total_health: number
  current_health: number
  health_percent: number
  status: string
  despawn_at: string
  top_attackers: Array<{
    user_id: number
    damage: number
  }>
  rewards: {
    chervontsi_pool: number
    kleynodu_pool: number
    special_drops: string[]
  }
}

export function BossBattle() {
  const [bosses, setBosses] = useState<Boss[]>([])
  const [loading, setLoading] = useState(true)
  const [attacking, setAttacking] = useState<number | null>(null)
  const { user, updateUser } = useStore()

  useEffect(() => {
    loadBosses()
    const interval = setInterval(loadBosses, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  const loadBosses = async () => {
    try {
      const data = await api.getActiveBosses()
      setBosses(data.bosses)
    } catch (error) {
      console.error('Failed to load bosses:', error)
    } finally {
      setLoading(false)
    }
  }

  const attack = async (bossId: number, useKleynodu: number = 0) => {
    if (attacking) return
    
    setAttacking(bossId)
    haptic.heavy()

    try {
      const result = await api.attackBoss(bossId, useKleynodu)
      
      updateUser({
        energy: result.energy_left,
        kleynodu: result.kleynodu_remaining
      })

      if (result.boss_defeated) {
        haptic.success()
        useStore.getState().addNotification({
          id: `boss-dead-${Date.now()}`,
          type: 'success',
          title: 'Бос переможений!',
          message: 'Перевір нагороди в інвентарі',
          duration: 5000
        })
      }

      await loadBosses()
    } catch (error: any) {
      haptic.error()
      if (error.message.includes('energy')) {
        useStore.getState().addNotification({
          id: `boss-error-${Date.now()}`,
          type: 'error',
          title: 'Недостатньо енергії',
          message: 'Потрібно 5 енергії або 10 клейнод',
          duration: 3000
        })
      }
    } finally {
      setAttacking(null)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-kurgan-accent">Пошук босів...</div>
  }

  if (bosses.length === 0) {
    return (
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-8 text-center rune-border">
        <p className="text-6xl mb-4">😴</p>
        <h2 className="text-xl font-bold text-kurgan-accent mb-2">Немає активних босів</h2>
        <p className="text-kurgan-muted">Польові біси відпочивають. Заходь пізніше!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {bosses.map((boss) => (
        <div key={boss.id} className="bg-kurgan-card border-2 border-red-900/50 rounded-lg p-6 rune-border">
          {/* Boss Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="text-6xl">👹</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-red-400">{boss.name}</h2>
              <p className="text-kurgan-muted text-sm">{boss.description}</p>
            </div>
          </div>

          {/* Health Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-kurgan-muted">Здоров'я</span>
              <span className="text-kurgan-text">
                {boss.current_health.toLocaleString()} / {boss.total_health.toLocaleString()}
              </span>
            </div>
            <div className="h-6 bg-kurgan-bg rounded-full overflow-hidden border border-red-900">
              <div 
                className="h-full boss-health transition-all duration-500"
                style={{ width: `${boss.health_percent}%` }}
              />
            </div>
          </div>

          {/* Top Attackers */}
          {boss.top_attackers.length > 0 && (
            <div className="bg-kurgan-bg rounded p-3 mb-4">
              <p className="text-kurgan-muted text-xs uppercase mb-2">Топ бійців</p>
              <div className="flex gap-2">
                {boss.top_attackers.slice(0, 5).map((attacker, idx) => (
                  <div key={attacker.user_id} className="flex items-center gap-1">
                    <span className="text-kurgan-accent text-xs">#{idx + 1}</span>
                    <span className="text-kurgan-text text-sm">{attacker.damage.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewards */}
          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            <div className="bg-kurgan-bg rounded p-2">
              <p className="text-kurgan-accent text-lg">⚡ {boss.rewards.chervontsi_pool.toLocaleString()}</p>
            </div>
            <div className="bg-kurgan-bg rounded p-2">
              <p className="text-yellow-400 text-lg">💎 {boss.rewards.kleynodu_pool}</p>
            </div>
            <div className="bg-kurgan-bg rounded p-2">
              <p className="text-purple-400 text-lg">🎁 {boss.rewards.special_drops.length}</p>
            </div>
          </div>

          {/* Attack Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => attack(boss.id, 0)}
              disabled={attacking === boss.id}
              className="py-3 bg-red-900/50 border border-red-700 text-red-200 font-bold rounded hover:bg-red-800/50 transition disabled:opacity-50"
            >
              {attacking === boss.id ? 'Атака...' : 'Атакувати (5⚡)'}
            </button>
            <button
              onClick={() => attack(boss.id, 10)}
              disabled={attacking === boss.id || (user?.kleynodu || 0) < 10}
              className="py-3 bg-yellow-900/50 border border-yellow-700 text-yellow-200 font-bold rounded hover:bg-yellow-800/50 transition disabled:opacity-50"
            >
              Супер-удар (10💎)
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}