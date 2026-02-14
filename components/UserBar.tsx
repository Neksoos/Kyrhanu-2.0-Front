'use client'

import { useStore } from '@/lib/store'

export function UserBar() {
  const { user } = useStore()

  if (!user) return null

  return (
    <header className="sticky top-0 z-40 bg-kurgan-card/95 backdrop-blur border-b border-kurgan-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-kurgan-accent rounded-full flex items-center justify-center text-kurgan-bg font-bold text-lg">
              {user.display_name?.[0] || user.username?.[0] || '?'}
            </div>
            <div>
              <p className="text-kurgan-text font-bold text-sm">{user.display_name || user.username}</p>
              <p className="text-kurgan-muted text-xs">Рівень {user.level}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-kurgan-accent font-bold text-sm">⚡ {user.chervontsi.toLocaleString()}</p>
              <p className="text-yellow-400 font-bold text-sm">💎 {user.kleynodu}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}