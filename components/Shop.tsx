'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import { haptic } from '@/lib/telegram'

interface ShopItem {
  key: string
  name: string
  description: string
  kleynodu_cost: number
  effect: Record<string, any>
}

interface CurrencyPack {
  kleynodu: number
  price_usd: number
  bonus_chervontsi: number
}

export function Shop() {
  const [catalog, setCatalog] = useState<{
    currency_packs: Record<string, CurrencyPack>
    items: Record<string, ShopItem>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const { user, updateUser } = useStore()

  useEffect(() => {
    loadCatalog()
  }, [])

  const loadCatalog = async () => {
    try {
      const data = await api.getShopCatalog()
      setCatalog(data)
    } catch (error) {
      console.error('Failed to load shop:', error)
    } finally {
      setLoading(false)
    }
  }

  const buyItem = async (itemKey: string) => {
    setPurchasing(itemKey)
    try {
      const result = await api.buyItem(itemKey)
      updateUser({ kleynodu: result.kleynodu_remaining })
      haptic.success()
      useStore.getState().addNotification({
        id: `shop-${Date.now()}`,
        type: 'success',
        title: 'Придбано!',
        message: result.item,
        duration: 3000
      })
    } catch (error: any) {
      haptic.error()
      useStore.getState().addNotification({
        id: `shop-error-${Date.now()}`,
        type: 'error',
        title: 'Помилка',
        message: error.message,
        duration: 3000
      })
    } finally {
      setPurchasing(null)
    }
  }

  const watchAd = async () => {
    try {
      const result = await api.watchAd()
      updateUser({
        kleynodu: result.kleynodu_remaining,
        chervontsi: (user?.chervontsi || 0) + result.chervontsi_reward
      })
      haptic.success()
      useStore.getState().addNotification({
        id: `ad-${Date.now()}`,
        type: 'reward',
        title: 'Нагорода за рекламу!',
        message: `+${result.kleynodu_reward} 💎 +${result.chervontsi_reward} ⚡`,
        duration: 3000
      })
    } catch (error: any) {
      haptic.error()
      useStore.getState().addNotification({
        id: `ad-error-${Date.now()}`,
        type: 'error',
        title: 'Не вдалося',
        message: error.message,
        duration: 3000
      })
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-kurgan-accent">Завантаження...</div>
  }

  if (!catalog) return null

  return (
    <div className="space-y-6">
      {/* Currency Packs */}
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-4">
        <h2 className="text-xl font-bold text-kurgan-accent mb-4">Клейноди (преміум)</h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(catalog.currency_packs).map(([key, pack]) => (
            <div key={key} className="bg-kurgan-bg rounded-lg p-3 border border-kurgan-border">
              <div className="text-center mb-2">
                <p className="text-3xl font-bold text-yellow-400">{pack.kleynodu} 💎</p>
                {pack.bonus_chervontsi > 0 && (
                  <p className="text-kurgan-accent text-sm">+{pack.bonus_chervontsi.toLocaleString()} ⚡</p>
                )}
              </div>
              <button
                className="w-full py-2 bg-green-700 text-white font-bold rounded hover:bg-green-600 transition"
                onClick={() => {/* Payment flow */}}
              >
                ${pack.price_usd}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-4">
        <h2 className="text-xl font-bold text-kurgan-accent mb-4">Товари</h2>
        <div className="space-y-3">
          {Object.entries(catalog.items).map(([key, item]) => (
            <div key={key} className="flex items-center justify-between bg-kurgan-bg rounded p-3">
              <div>
                <p className="text-kurgan-text font-bold">{item.name}</p>
                <p className="text-kurgan-muted text-sm">{item.description}</p>
              </div>
              <button
                onClick={() => buyItem(key)}
                disabled={purchasing === key || (user?.kleynodu || 0) < item.kleynodu_cost}
                className="px-4 py-2 bg-kurgan-accent text-kurgan-bg font-bold rounded disabled:opacity-50"
              >
                {item.kleynodu_cost} 💎
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Free Kleynodu */}
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-4">
        <h2 className="text-xl font-bold text-kurgan-accent mb-4">Безкоштовні клейноди</h2>
        <button
          onClick={watchAd}
          className="w-full py-3 bg-blue-900/50 border border-blue-700 text-blue-200 rounded hover:bg-blue-800/50 transition"
        >
          📺 Подивитися рекламу (+5 💎)
        </button>
        <p className="text-kurgan-muted text-xs text-center mt-2">
          Обмеження: 10 переглядів на день з перервою 5 хвилин
        </p>
      </div>
    </div>
  )
}