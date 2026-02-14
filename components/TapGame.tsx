'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { generateNonce } from '@/lib/crypto'
import { haptic } from '@/lib/telegram'

interface TapEffect {
  id: number
  x: number
  y: number
  value: string
}

export function TapGame() {
  const { user, energy, maxEnergy, updateEnergy, updateUser, incrementTapSequence } = useStore()
  const [tapping, setTapping] = useState(false)
  const [effects, setEffects] = useState<TapEffect[]>([])
  const [cooldown, setCooldown] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const effectIdRef = useRef(0)

  // Energy refill polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await api.getEnergy()
        updateEnergy(status.energy, status.max_energy)
      } catch (e) {
        // Ignore
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [updateEnergy])

  const handleTap = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    if (energy <= 0 || cooldown > 0 || !user) return

    setTapping(true)
    setCooldown(50) // 50ms cooldown

    // Visual effect position
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const rect = containerRef.current?.getBoundingClientRect()
    const x = rect ? clientX - rect.left : clientX
    const y = rect ? clientY - rect.top : clientY

    // Haptic
    if (energy % 5 === 0) {
      haptic.medium()
    } else {
      haptic.light()
    }

    // Add visual effect
    const newEffect: TapEffect = {
      id: effectIdRef.current++,
      x,
      y,
      value: '+⚡'
    }
    setEffects(prev => [...prev, newEffect])
    setTimeout(() => {
      setEffects(prev => prev.filter(ef => ef.id !== newEffect.id))
    }, 1000)

    // Anti-cheat signing
    const sequence = incrementTapSequence()
    const timestamp = Date.now()
    const nonce = generateNonce()
    try {
      const result = await api.tap(timestamp, sequence, nonce)
      
      updateEnergy(result.energy_left, result.max_energy)
      updateUser({
        chervontsi: result.total_chervontsi,
        glory: result.total_glory,
        level: result.current_level
      })

      if (result.drop) {
        haptic.success()
        useStore.getState().addNotification({
          id: `drop-${Date.now()}`,
          type: 'reward',
          title: 'Знахідка!',
          message: `${result.drop.name}`,
          duration: 3000
        })
      }

      if (result.level_up) {
        useStore.getState().addNotification({
          id: `level-${Date.now()}`,
          type: 'success',
          title: 'Новий рівень!',
          message: `Ти досяг рівня ${result.current_level}`,
          duration: 5000
        })
      }
    } catch (error: any) {
      haptic.error()
      if (error.message.includes('cooldown')) {
        // Sanction applied
      }
    }

    setTimeout(() => setTapping(false), 100)
  }, [energy, cooldown, user, updateEnergy, updateUser, incrementTapSequence])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 10), 10)
    return () => clearTimeout(timer)
  }, [cooldown])

  const energyPercent = (energy / maxEnergy) * 100

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-3 text-center">
          <p className="text-kurgan-muted text-xs uppercase">Черевонці</p>
          <p className="text-kurgan-accent text-xl font-bold">⚡ {user?.chervontsi.toLocaleString()}</p>
        </div>
        <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-3 text-center">
          <p className="text-kurgan-muted text-xs uppercase">Клейноди</p>
          <p className="text-yellow-400 text-xl font-bold">💎 {user?.kleynodu}</p>
        </div>
        <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-3 text-center">
          <p className="text-kurgan-muted text-xs uppercase">Слава</p>
          <p className="text-purple-400 text-xl font-bold">🏆 {user?.glory.toLocaleString()}</p>
        </div>
      </div>

      {/* Energy Bar */}
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-kurgan-muted">Енергія</span>
          <span className="text-kurgan-text">{energy} / {maxEnergy}</span>
        </div>
        <div className="h-4 bg-kurgan-bg rounded-full overflow-hidden border border-kurgan-border">
          <div 
            className="h-full energy-bar transition-all duration-300"
            style={{ width: `${energyPercent}%` }}
          />
        </div>
        {energy <= 0 && (
          <p className="text-center text-kurgan-accent mt-2 text-sm animate-pulse">
            Енергія закінчилася! Відпочинь або купи енергію ⚡
          </p>
        )}
      </div>

      {/* Tap Area */}
      <div 
        ref={containerRef}
        onClick={handleTap}
        onTouchStart={handleTap}
        className={`
          relative h-96 bg-gradient-to-b from-kurgan-card to-kurgan-bg 
          border-4 border-kurgan-border rounded-2xl 
          flex flex-col items-center justify-center
          cursor-pointer select-none overflow-hidden
          ${tapping ? 'scale-95' : 'scale-100'}
          ${energy <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-kurgan-accent'}
          transition-all duration-100
        `}
      >
        {/* Mound Visual */}
        <div className="text-center z-10">
          <div className="text-8xl mb-4 animate-float">⛰️</div>
          <h2 className="text-2xl font-bold text-kurgan-accent mb-2">Курган Предків</h2>
          <p className="text-kurgan-muted text-sm max-w-xs mx-auto">
            Тапай, щоб копати. Шукай артефакти та черевонці.
          </p>
        </div>

        {/* Tap Effects */}
        {effects.map(effect => (
          <div
            key={effect.id}
            className="tap-effect absolute text-kurgan-accent font-bold text-2xl"
            style={{ left: effect.x, top: effect.y }}
          >
            {effect.value}
          </div>
        ))}

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a227' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => useStore.getState().setActiveTab('shop')}
          className="py-3 bg-kurgan-accent-dim text-kurgan-text rounded-lg font-bold hover:bg-kurgan-accent transition"
        >
          🛒 Магазин
        </button>
        <button 
          onClick={() => useStore.getState().setActiveTab('daily')}
          className="py-3 bg-kurgan-card border border-kurgan-border text-kurgan-text rounded-lg font-bold hover:border-kurgan-accent transition"
        >
          📜 Доля дня
        </button>
      </div>
    </div>
  )
}