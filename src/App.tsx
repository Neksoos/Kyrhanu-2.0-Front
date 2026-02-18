import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'

import { TopBar } from '@/components/TopBar'

import { AuthPage } from '@/features/auth/AuthPage'
import { DailyPage } from '@/features/daily/DailyPage'
import { HomeMePage } from '@/features/home_me/HomeMePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotFoundPage } from '@/features/home_me/NotFoundPage'

import { AchievementsPage } from '@/features/achievements/AchievementsPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { ShopPage } from '@/features/shop/ShopPage'
import { RunPage } from '@/features/run/RunPage'
import { TutorialPage } from '@/features/tutorial/TutorialPage'
import { PatronPage } from '@/features/patron/PatronPage'

import { storage } from '@/lib/storage'
import { tg } from '@/lib/telegram'

function AppRoutes() {
  const location = useLocation()

  // ✅ Зберігаємо TG params (search/hash), щоб не губився initData
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

            {/* ✅ додаємо /* щоб ловити /route/ і підшляхи */}
            <Route path="/auth/*" element={<AuthPage />} />
            <Route path="/daily/*" element={<DailyPage />} />
            <Route path="/home/*" element={<HomeMePage />} />
            <Route path="/settings/*" element={<SettingsPage />} />

            {/* ✅ сторінки з Settings */}
            <Route path="/achievements/*" element={<AchievementsPage />} />
            <Route path="/inventory/*" element={<InventoryPage />} />
            <Route path="/shop/*" element={<ShopPage />} />
            <Route path="/run/*" element={<RunPage />} />
            <Route path="/tutorial/*" element={<TutorialPage />} />
            <Route path="/patron/*" element={<PatronPage />} />

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

  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}