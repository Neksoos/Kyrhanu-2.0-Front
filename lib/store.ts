/**
 * Zustand store for global state management.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  username: string
  display_name: string
  avatar_url?: string
  chervontsi: number
  kleynodu: number
  level: number
  experience: number
  glory: number
  energy: number
  max_energy: number
  referral_code: string
}

interface GameState {
  // Auth
  token: string | null
  hmacKey: string | null
  user: User | null
  isAuthenticated: boolean
  
  // Game state
  energy: number
  maxEnergy: number
  lastTapSequence: number
  
  // UI
  activeTab: 'dig' | 'daily' | 'guild' | 'boss' | 'shop'
  notifications: Notification[]
  
  // Actions
  setAuth: (token: string, user: User, hmacKey: string) => void
  clearAuth: () => void
  updateUser: (updates: Partial<User>) => void
  updateEnergy: (energy: number, max?: number) => void
  incrementTapSequence: () => number
  setActiveTab: (tab: GameState['activeTab']) => void
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'reward'
  title: string
  message: string
  duration?: number
}

export const useStore = create<GameState>()(
  persist(
    (set, get) => ({
      token: null,
      hmacKey: null,
      user: null,
      isAuthenticated: false,
      energy: 0,
      maxEnergy: 100,
      lastTapSequence: 0,
      activeTab: 'dig',
      notifications: [],
      
      setAuth: (token, user, hmacKey) => set({
        token,
        user,
        hmacKey,
        isAuthenticated: true,
        energy: user.energy,
        maxEnergy: user.max_energy,
      }),
      
      clearAuth: () => set({
        token: null,
        user: null,
        hmacKey: null,
        isAuthenticated: false,
        energy: 0,
        maxEnergy: 100,
        lastTapSequence: 0,
      }),
      
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      
      updateEnergy: (energy, max) => set((state) => ({
        energy,
        maxEnergy: max ?? state.maxEnergy
      })),
      
      incrementTapSequence: () => {
        const newSeq = get().lastTapSequence + 1
        set({ lastTapSequence: newSeq })
        return newSeq
      },
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, notification]
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
    }),
    {
      name: 'cursed-mounds-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        hmacKey: state.hmacKey,
      }),
    }
  )
)