'use client'

import { useStore } from '@/lib/store'

export function Navigation() {
  const { activeTab, setActiveTab } = useStore()

  const tabs = [
    { id: 'dig', label: 'Копати', icon: '⛏️' },
    { id: 'daily', label: 'Доля', icon: '📜' },
    { id: 'boss', label: 'Боси', icon: '👹' },
    { id: 'guild', label: 'Громада', icon: '🏰' },
    { id: 'shop', label: 'Магазин', icon: '🛒' },
  ] as const

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-kurgan-card border-t border-kurgan-border z-50">
      <div className="container mx-auto px-2">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex flex-col items-center py-3 px-2 flex-1 transition
                ${activeTab === tab.id 
                  ? 'text-kurgan-accent' 
                  : 'text-kurgan-muted hover:text-kurgan-text'
                }
              `}
            >
              <span className="text-2xl mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}