'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

export default function GamePage() {
  const [user, setUser] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      window.location.href = '/'
      return
    }

    ;(async () => {
      try {
        const res = await apiGet<{ user: any }>('/api/auth/me', token)
        setUser(res.user)
      } catch (e: any) {
        setErr(e?.message || 'Не вдалося отримати профіль')
      }
    })()
  }, [])

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-xl mb-4">Гра</h1>

        {err && (
          <div className="text-sm mb-3" style={{ color: '#b30c12' }}>
            {err}
          </div>
        )}

        {user ? (
          <>
            <div className="text-sm mb-2">
              Гравець: <b>{user.display_name || user.username || '—'}</b>
            </div>

            <div className="text-sm opacity-80 mb-4">
              Далі підключимо реальний ігровий інтерфейс.
            </div>

            <button
              className="pixel-btn w-full"
              onClick={() => {
                localStorage.removeItem('access_token')
                window.location.href = '/'
              }}
            >
              Вийти
            </button>
          </>
        ) : (
          <div className="text-sm opacity-80">Завантаження…</div>
        )}
      </div>
    </main>
  )
}