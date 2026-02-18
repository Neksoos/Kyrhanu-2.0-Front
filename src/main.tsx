import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import App from './App'
import './styles/globals.css'

import { applyThemeToCssVars, tgReady } from '@/lib/telegram'
import { initI18n } from '@/lib/i18n'

initI18n()
applyThemeToCssVars()
tgReady()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)