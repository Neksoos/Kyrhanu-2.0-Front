'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { haptic } from '@/lib/telegram'

interface DailyData {
  id: number
  hero: {
    name: string
    archetype_name: string
    archetype_description: string
    emoji: string
    stats: {
      strength: number
      cunning: number
      endurance: number
      fate: number
    }
  }
  amulet: {
    name: string
    power: number
  }
  mound_story: string
  choices: Record<string, {
    name: string
    description: string
    risk: string
  }>
  completed: boolean
  choice_made?: string
  result?: {
    glory_delta: number
    chervontsi_earned: number
    text: string
  }
}

export function DailyFate() {
  const [daily, setDaily] = useState<DailyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [choosing, setChoosing] = useState(false)
  const { updateUser } = useStore()

  useEffect(() => {
    loadDaily()
  }, [])

  const loadDaily = async () => {
    try {
      const data = await api.getDaily()
      setDaily(data)
    } catch (error) {
      console.error('Failed to load daily:', error)
    } finally {
      setLoading(false)
    }
  }

  const makeChoice = async (choice: string) => {
    if (!daily || choosing) return
    
    setChoosing(true)
    haptic.medium()

    try {
      const result = await api.makeChoice(choice)
      
      updateUser({
        glory: result.total_glory,
        chervontsi: result.total_chervontsi
      })

      haptic.success()
      
      // Reload to show result
      await loadDaily()
    } catch (error) {
      haptic.error()
    } finally {
      setChoosing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-kurgan-accent text-xl animate-pulse">ᛉ Завантаження долі...</div>
      </div>
    )
  }

  if (!daily) return null

  if (daily.completed) {
    return (
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-6 rune-border animate-fade-in">
        <h2 className="text-2xl font-bold text-kurgan-accent mb-4 text-center">Доля визначена</h2>
        
        <div className="text-center mb-6">
          <p className="text-6xl mb-4">{daily.hero.emoji}</p>
          <h3 className="text-xl font-bold text-kurgan-text">{daily.hero.name}</h3>
          <p className="text-kurgan-muted">{daily.hero.archetype_name}</p>
        </div>

        <div className="bg-kurgan-bg rounded-lg p-4 mb-4">
          <p className="text-kurgan-text italic text-center">"{daily.mound_story}"</p>
        </div>

        <div className="text-center">
          <p className="text-kurgan-muted mb-2">Твій вибір:</p>
          <p className="text-kurgan-accent font-bold text-lg mb-4">
            {daily.choices[daily.choice_made!]?.name}
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-kurgan-bg rounded p-3">
              <p className="text-kurgan-muted text-sm">Слава</p>
              <p className={`text-xl font-bold ${(daily.result?.glory_delta || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(daily.result?.glory_delta || 0) > 0 ? '+' : ''}{daily.result?.glory_delta}
              </p>
            </div>
            <div className="bg-kurgan-bg rounded p-3">
              <p className="text-kurgan-muted text-sm">Черевонці</p>
              <p className="text-kurgan-accent text-xl font-bold">+{daily.result?.chervontsi_earned}</p>
            </div>
          </div>

          <p className="text-kurgan-muted text-sm mt-6">
            Нова доля чекатиме завтра після півночі UTC
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Card */}
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-6 rune-border">
        <div className="flex items-start gap-4">
          <div className="text-6xl">{daily.hero.emoji}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-kurgan-accent">{daily.hero.name}</h2>
            <p className="text-kurgan-muted">{daily.hero.archetype_name}</p>
            <p className="text-sm text-kurgan-text mt-2">{daily.hero.archetype_description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {Object.entries(daily.hero.stats).map(([stat, value]) => (
            <div key={stat} className="bg-kurgan-bg rounded p-2">
              <div className="flex justify-between text-sm">
                <span className="text-kurgan-muted capitalize">{stat}</span>
                <span className="text-kurgan-accent font-bold">{value}/10</span>
              </div>
              <div className="h-2 bg-kurgan-card rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-kurgan-accent"
                  style={{ width: `${value * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Amulet */}
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-4">
        <h3 className="text-kurgan-muted text-sm uppercase mb-2">Оберіг дня</h3>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🜂</span>
          <div>
            <p className="text-kurgan-accent font-bold">{daily.amulet.name}</p>
            <p className="text-kurgan-muted text-sm">Сила: {daily.amulet.power}</p>
          </div>
        </div>
      </div>

      {/* Story */}
      <div className="bg-gradient-to-b from-kurgan-card to-kurgan-bg border border-kurgan-border rounded-lg p-6 relative">
        <div className="absolute -top-3 left-4 bg-kurgan-bg px-2 text-kurgan-accent-dim text-xs uppercase tracking-widest">
          Курган дня
        </div>
        <p className="text-kurgan-text italic text-center leading-relaxed">
          "{daily.mound_story}"
        </p>
      </div>

      {/* Choices */}
      <div className="space-y-3">
        <h3 className="text-center text-kurgan-muted text-sm uppercase">Обери свій шлях</h3>
        
        {Object.entries(daily.choices).map(([key, choice]) => (
          <button
            key={key}
            onClick={() => makeChoice(key)}
            disabled={choosing}
            className={`
              w-full p-4 rounded-lg border-2 text-left transition-all
              ${choosing ? 'opacity-50 cursor-not-allowed' : 'hover:border-kurgan-accent hover:bg-kurgan-card'}
              ${key === 'accept' ? 'border-green-900/50' : key === 'redeem' ? 'border-yellow-900/50' : 'border-gray-700'}
              bg-kurgan-bg
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-bold ${
                  key === 'accept' ? 'text-green-400' : key === 'redeem' ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {choice.name}
                </p>
                <p className="text-sm text-kurgan-muted mt-1">{choice.description}</p>
              </div>
              <span className="text-2xl opacity-50">
                {key === 'accept' ? 'ᛒ' : key === 'redeem' ? 'ᛟ' : 'ᚷ'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}