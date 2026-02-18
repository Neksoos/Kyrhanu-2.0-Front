import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { TopBar } from '@/components/TopBar'

import { AuthPage } from '@/features/auth/AuthPage'
import { DailyPage } from '@/features/daily/DailyPage'
import { HomeMePage } from '@/features/home_me/HomeMePage'
import { NotFoundPage } from '@/features/home_me/NotFoundPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

import { storage } from '@/lib/storage'
import { withTgParams } from '@/lib/tgNavigate'

function RootRedirect() {
  const location = useLocation()
  const token = storage.getAccessToken()

  return <Navigate to={withTgParams(token ? '/daily' : '/auth', location) as any} replace />
}

export default function App() {
  return (
    <>
      <TopBar />

      <div className="min-h-screen w-full">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-6">
          <Routes>
            <Route path="/" element={<RootRedirect />} />
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