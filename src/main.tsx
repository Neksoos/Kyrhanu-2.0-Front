import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from './App'
import './styles/globals.css'

import { applyThemeToCssVars, tgReady } from '@/lib/telegram'

const queryClient = new QueryClient()

function initTelegram() {
  try {
    tgReady()
    applyThemeToCssVars()
  } catch {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTelegram)
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