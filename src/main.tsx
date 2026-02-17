import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import './styles/globals.css'

import '@/i18n'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)