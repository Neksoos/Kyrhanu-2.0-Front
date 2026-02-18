import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'

import { TopBar } from '@/components/TopBar'
import { AuthPage } from '@/features/auth/AuthPage'
import { DailyPage } from '@/features/daily/DailyPage'
import { HomeMePage } from '@/features/home_me/HomeMePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotFoundPage } from '@/features/home_me/NotFoundPage'

import { storage } from '@/lib/storage'
import { tg } from '@/lib/telegram'

function getRuntimeBasename(): string {
  // Railway/Telegram can open the app under a sub-path (for example: /app).
  // If we don't set basename, routes like "/home" won't match "/app/home".
  if (typeof window === 'undefined') return ''

  const p = window.location.pathname

  // Common case: Telegram WebApp URL set to https://<domain>/app
  if (p === '/app' || p.startsWith('/app/')) return '/app'

  // If Vite base is configured, respect it.
  const viteBase = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  if (viteBase && viteBase !== '/' && (p === viteBase || p.startsWith(viteBase + '/'))) return viteBase

  return ''
}

function AppRoutes() {
  const location = useLocation()

  const to = `/${storage.getAccessToken() ? 'daily' : 'auth'}${location.search}${location.hash}`

  return (
    <>
      <Toaster richColors position="top-center" />
      <TopBar />

      <div className="min-h-screen w-full">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-6">
          <Routes>
            <Route path="/" element={<Navigate to={to} replace />} />

            <Route path="/auth/*" element={<AuthPage />} />
            <Route path="/daily/*" element={<DailyPage />} />
            <Route path="/home/*" element={<HomeMePage />} />
            <Route path="/settings/*" element={<SettingsPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </>
  )
}

export default function App() {
  // ✅ HashRouter стабільніший в Telegram WebView, але якщо tgWebAppData у hash — HashRouter ламає все
  const hasTgHashData = typeof window !== 'undefined' && window.location.hash.includes('tgWebAppData=')
  const Router = tg.isInTelegram() && !hasTgHashData ? HashRouter : BrowserRouter

  const basename = getRuntimeBasename()

  return (
    <Router basename={basename}>
      <AppRoutes />
    </Router>
  )
}