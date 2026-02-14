'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

export default function OnboardingPage() {
  const [me, setMe] = useState<any>(null)
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
        setMe(res.user)
      } catch (e: any) {
        setErr(e?.message || 'Не вдалося отримати профіль')
      }
    })()
  }, [])

  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-xl mb-4">Ласкаво просимо!</h1>

        {err && <div className="text-sm mb-3" style={{ color: '#b30c12' }}>{err}</div>}

        {me ? (
          <>
            <p className="text-sm mb-3 opacity-80">
              Гравець створений ✅
            </p>
            <div className="text-sm mb-4">
              Нік: <b>{me.display_name || me.username || '—'}</b>
            </div>

            <button
              className="pixel-btn pixel-btn-primary w-full"
              onClick={() => (window.location.href = '/game')}
            >
              У гру
            </button>
          </>
        ) : (
          <div className="text-sm opacity-80">Завантаження…</div>
        )}
      </div>
    </main>
  )
}