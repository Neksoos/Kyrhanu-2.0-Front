import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from './App'
import './styles/globals.css'

import { applyThemeToCssVars, tgReady } from '@/lib/telegram'

// ✅ щоб не створювався заново при HMR/StrictMode
const queryClient = new QueryClient()

// ✅ Telegram init (safe even outside Telegram)
function initTelegram() {
  try {
    tgReady()
    applyThemeToCssVars()
  } catch {}
}

// В деяких webview краще після готовності DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTelegram, { once: true })
} else {
  initTelegram()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from './App'
import './styles/globals.css'

import { applyThemeToCssVars, tgReady } from '@/lib/telegram'

// ✅ щоб не створювався заново при HMR/StrictMode
const queryClient = new QueryClient()

// ✅ Telegram init (safe even outside Telegram)
function initTelegram() {
  try {
    tgReady()
    applyThemeToCssVars()
  } catch {}
}

// В деяких webview краще після готовності DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTelegram, { once: true })
} else {
  initTelegram()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)