'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export function Notifications() {
  const { notifications, removeNotification } = useStore()

  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.duration) {
        const timer = setTimeout(() => {
          removeNotification(notification.id)
        }, notification.duration)
        return () => clearTimeout(timer)
      }
    })
  }, [notifications, removeNotification])

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-16 left-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            pointer-events-auto p-4 rounded-lg shadow-lg animate-fade-in
            ${notification.type === 'success' ? 'bg-green-900/90 border border-green-700' : ''}
            ${notification.type === 'error' ? 'bg-red-900/90 border border-red-700' : ''}
            ${notification.type === 'reward' ? 'bg-kurgan-accent text-kurgan-bg' : ''}
            ${notification.type === 'info' ? 'bg-blue-900/90 border border-blue-700' : ''}
          `}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">{notification.title}</p>
              <p className={`text-sm ${notification.type === 'reward' ? 'text-kurgan-bg/80' : 'text-kurgan-muted'}`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-current opacity-50 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}