import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { TopBar } from '@/components/TopBar'

import { AuthPage } from '@/features/auth/AuthPage'
import { DailyPage } from '@/features/daily/DailyPage'
import { HomeMePage } from '@/features/home_me/HomeMePage'
import { NotFoundPage } from '@/features/home_me/NotFoundPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AchievementsPage } from '@/features/achievements/AchievementsPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { ShopPage } from '@/features/shop/ShopPage'
import { RunPage } from '@/features/runs/RunPage'
import { TutorialPage } from '@/features/tutorial/TutorialPage'
import { PatronPage } from '@/features/patron/PatronPage'

import { storage } from '@/lib/storage'
import { withTgParams } from '@/lib/tgNavigate'

function RootRedirect() {
  const location = useLocation()
  const token = storage.getAccessToken()

  // ✅ Якщо користувач уже авторизований — ведемо на головний екран.
  // Daily (вибір долі) лишається окремою сторінкою, куди можна зайти з Home.
  return <Navigate to={withTgParams(token ? '/home' : '/auth', location) as any} replace />
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
          <Route path="/run" element={<RunPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/tutorial" element={<TutorialPage />} />
          <Route path="/patron" element={<PatronPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </>
  )
}