import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import App from './App'
import './styles/globals.css'

import { applyThemeToCssVars, tgReady } from '@/lib/telegram'

applyThemeToCssVars()
tgReady()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

// Railway/Telegram часто відкриває мініапку на /app/…
// Без basename React Router бачить шлях /app/* як «невідомий» і показує 404.
// Тому динамічно вмикаємо basename, якщо ми під /app.
const basename = (() => {
  const p = window.location.pathname
  return p === '/app' || p.startsWith('/app/') ? '/app' : ''
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)