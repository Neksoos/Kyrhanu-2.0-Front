import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'

import { TopBar } from '@/components/TopBar'
import { AuthPage } from '@/features/auth/AuthPage'
import { DailyPage } from '@/features/daily/DailyPage'
import { HomeMePage } from '@/features/home_me/HomeMePage'
import { NotFoundPage } from '@/features/home_me/NotFoundPage'
import { PatronPage } from '@/features/patron/PatronPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

import { storage } from '@/lib/storage'
import { tg } from '@/lib/telegram'
import { INITIAL_TG_HASH, INITIAL_TG_SEARCH } from '@/lib/tgParams'

function getRuntimeBasename(): string {
  if (typeof window === 'undefined') return ''
  const p = window.location.pathname
  if (p === '/app' || p.startsWith('/app/')) return '/app'
  const viteBase = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  if (viteBase && viteBase !== '/' && (p === viteBase || p.startsWith(viteBase + '/'))) return viteBase
  return ''
}

// Router повинен бути СТАБІЛЬНИЙ весь час
const ROUTER_KIND: 'browser' | 'hash' = tg.isInTelegram() && !INITIAL_TG_HASH ? 'hash' : 'browser'

function AppRoutes() {
  const location = useLocation()
  const preserveSearch = location.search || INITIAL_TG_SEARCH
  const preserveHash = location.hash || INITIAL_TG_HASH

  const targetPath = storage.getAccessToken() ? '/daily' : '/auth'

  return (
    <>
      <Toaster richColors position="top-center" />
      <TopBar />

      <div className="min-h-screen w-full">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-6">
          <Routes>
            <Route
              path="/"
              element={
                <Navigate to={{ pathname: targetPath, search: preserveSearch, hash: preserveHash }} replace />
              }
            />

            <Route path="/auth/*" element={<AuthPage />} />
            <Route path="/daily/*" element={<DailyPage />} />
            <Route path="/home/*" element={<HomeMePage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
            <Route path="/patron/*" element={<PatronPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </>
  )
}

export default function App() {
  const Router = ROUTER_KIND === 'hash' ? HashRouter : BrowserRouter
  const basename = getRuntimeBasename()

  return (
    <Router basename={basename}>
      <AppRoutes />
    </Router>
  )
}