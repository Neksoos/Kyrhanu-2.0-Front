import * as React from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AuthPage } from '@/features/auth/AuthPage'
import { DailyPage } from '@/features/daily/DailyPage'
import { AchievementsPage } from '@/features/achievements/AchievementsPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { RunPage } from '@/features/runs/RunPage'
import { ShopPage } from '@/features/shop/ShopPage'
import { TutorialPage } from '@/features/tutorial/TutorialPage'
import { PatronPage } from '@/features/patron/PatronPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotFoundPage } from '@/features/home_me/NotFoundPage'

function TopBar() {
  return (
    <div className="safe px-4 pt-3">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <div className="text-outline-2 text-lg font-semibold">Прокляті Кургани</div>
        <LanguageSwitcher />
      </div>
    </div>
  )
}

export function App() {
  return (
    <HashRouter>
      <Toaster richColors position="top-center" />
      <TopBar />

      <div className="safe px-4 pb-24 pt-3 spd-bg min-h-dvh">
        <div className="mx-auto w-full max-w-md">
          <Routes>
            {/* стартова сторінка */}
            <Route path="/" element={<Navigate to="/auth" replace />} />

            {/* основні */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/daily" element={<DailyPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/runs" element={<RunPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/tutorial" element={<TutorialPage />} />
            <Route path="/patron" element={<PatronPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  )
}
