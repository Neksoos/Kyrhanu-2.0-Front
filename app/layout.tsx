import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Прокляті Кургани',
  description: 'Етно-українська real-time гра. Копай кургани, бий босів, збудуй громаду.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1814',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk">
      <body className="antialiased bg-kurgan-bg text-kurgan-text relative min-h-screen">
        {children}
      </body>
    </html>
  )
}