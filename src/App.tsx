import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'

import { TopBar } from '@/components/TopBar'
import { AuthPage } from '@/features/auth/AuthPage'
import { DailyPage } from '@/features/daily/DailyPage'
import { HomeMePage } from '@/features/home_me/HomeMePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotFoundPage } from '@/features/home_me/NotFoundPage'

import { storage } from '@/lib/storage'

function AppRoutes() {
  const location = useLocation()

  const targetPath = storage.getAccessToken() ? '/daily' : '/auth'
  const to = `${targetPath}${location.search}${location.hash}`

  return (
    <>
      <Toaster richColors position="top-center" />
      <TopBar />

      <div className="min-h-screen w-full">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-6">
          <Routes>
            <Route path="/" element={<Navigate to={to} replace />} />

            <Route path="/auth" element={<AuthPage />} />
            <Route path="/daily" element={<DailyPage />} />
            <Route path="/home" element={<HomeMePage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}