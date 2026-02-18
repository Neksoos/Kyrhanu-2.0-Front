import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { TopBar } from '@/components/TopBar'
import { AuthPage } from '@/features/auth/AuthPage'
import { DailyPage } from '@/features/daily/DailyPage'
import { HomeMePage } from '@/features/home_me/HomeMePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotFoundPage } from '@/features/home_me/NotFoundPage'

import { storage } from '@/lib/storage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" />
      <TopBar />

      <div className="min-h-screen w-full">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-6">
          <Routes>
            <Route
              path="/"
              element={<Navigate to={storage.getAccessToken() ? '/daily' : '/auth'} replace />}
            />

            <Route path="/auth" element={<AuthPage />} />
            <Route path="/daily" element={<DailyPage />} />
            <Route path="/home" element={<HomeMePage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}