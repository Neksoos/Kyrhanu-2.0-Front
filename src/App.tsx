import * as React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { TopBar } from '@/components/TopBar'
import { storage } from '@/lib/storage'
import { withTgParams } from '@/lib/tgParams'

import { AuthPage } from '@/features/auth/AuthPage'
import { DailyPage } from '@/features/daily/DailyPage'
import { HomeMePage } from '@/features/home_me/HomeMePage'
import { NotFoundPage } from '@/features/home_me/NotFoundPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { PatronPage } from '@/features/patron/PatronPage'

function RootRedirect() {
  const loc = useLocation()
  const hasToken = !!storage.getAccessToken()
  const to = hasToken ? '/daily' : '/auth'
  return <Navigate to={withTgParams(to, loc)} replace />
}

export default function App() {
  return (
    <div className="min-h-dvh spd-bg">
      <TopBar />
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/auth" element={<AuthPage />} />
        <Route path="/daily" element={<DailyPage />} />
        <Route path="/home" element={<HomeMePage />} />

        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/patron" element={<PatronPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}