/**
 * API client for Cursed Mounds backend.
 */
import { useStore } from './store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiClient {
  private getToken() {
    return useStore.getState().token
  }
  
  private async fetch(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken()
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    })
    
    if (response.status === 401) {
      useStore.getState().clearAuth()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Request failed')
    }
    
    return response.json()
  }
  
  // Auth
  async telegramAuth(initData: string) {
    return this.fetch('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ init_data: initData }),
    })
  }
  
  async emailLogin(username: string, password: string) {
    return this.fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email: username, password }),
    })
  }
  
  async emailRegister(username: string, email: string, password: string) {
    return this.fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, age_confirm: true }),
    })
  }
  
  // Game
  async tap(clientTimestamp: number, sequence: number, hmac: string, nonce: string) {
    return this.fetch('/api/game/tap', {
      method: 'POST',
      body: JSON.stringify({
        client_timestamp: clientTimestamp,
        sequence_number: sequence,
        hmac_signature: hmac,
        nonce,
      }),
    })
  }
  
  async getDaily() {
    return this.fetch('/api/game/daily')
  }
  
  async makeChoice(choice: string) {
    return this.fetch('/api/game/daily/choice', {
      method: 'POST',
      body: JSON.stringify({ choice }),
    })
  }
  
  async getEnergy() {
    return this.fetch('/api/game/energy')
  }
  
  // Shop
  async getShopCatalog() {
    return this.fetch('/api/shop/catalog')
  }
  
  async buyItem(itemKey: string) {
    return this.fetch('/api/shop/buy-item', {
      method: 'POST',
      body: JSON.stringify({ item_key: itemKey }),
    })
  }
  
  async watchAd() {
    return this.fetch('/api/shop/watch-ad', { method: 'POST' })
  }
  
  // Guild
  async getMyGuild() {
    return this.fetch('/api/guild/my')
  }
  
  async createGuild(name: string, tag?: string) {
    return this.fetch('/api/guild/create', {
      method: 'POST',
      body: JSON.stringify({ name, tag }),
    })
  }
  
  async joinGuild(guildId: number) {
    return this.fetch('/api/guild/join', {
      method: 'POST',
      body: JSON.stringify({ guild_id: guildId }),
    })
  }
  
  // Boss
  async getActiveBosses() {
    return this.fetch('/api/boss/active')
  }
  
  async attackBoss(bossId: number, useKleynodu: number = 0) {
    return this.fetch('/api/boss/attack', {
      method: 'POST',
      body: JSON.stringify({ boss_id: bossId, use_kleynodu: useKleynodu }),
    })
  }
  
  // Social
  async getLeaderboard() {
    return this.fetch('/api/social/leaderboard/global')
  }
  
  async useReferral(code: string) {
    return this.fetch('/api/social/referral/claim', {
      method: 'POST',
      body: JSON.stringify({ referral_code: code }),
    })
  }
}

export const api = new ApiClient()