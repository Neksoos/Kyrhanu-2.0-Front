'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'

interface GuildData {
  in_guild: boolean
  guild?: {
    id: number
    name: string
    tag?: string
    members: Array<{
      user_id: number
      username: string
      role: string
      contribution: number
    }>
    total_glory: number
    war_wins: number
    war_losses: number
  }
  my_role?: string
}

export function GuildPanel() {
  const [guildData, setGuildData] = useState<GuildData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [guildName, setGuildName] = useState('')

  useEffect(() => {
    loadGuild()
  }, [])

  const loadGuild = async () => {
    try {
      const data = await api.getMyGuild()
      setGuildData(data)
    } catch (error) {
      console.error('Failed to load guild:', error)
    } finally {
      setLoading(false)
    }
  }

  const createGuild = async () => {
    if (!guildName.trim()) return
    try {
      await api.createGuild(guildName)
      setCreating(false)
      await loadGuild()
    } catch (error: any) {
      alert(error.message)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-kurgan-accent">Завантаження...</div>
  }

  if (!guildData?.in_guild) {
    return (
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-6 rune-border">
        <h2 className="text-2xl font-bold text-kurgan-accent mb-4 text-center">Громада</h2>
        <p className="text-kurgan-muted text-center mb-6">
          Об'єднайся з іншими козаками. Разом сила!
        </p>

        {creating ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Назва громади"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              className="w-full p-3 bg-kurgan-bg border border-kurgan-border rounded text-kurgan-text"
            />
            <div className="flex gap-2">
              <button
                onClick={createGuild}
                className="flex-1 py-2 bg-kurgan-accent text-kurgan-bg font-bold rounded"
              >
                Створити (1000 💎)
              </button>
              <button
                onClick={() => setCreating(false)}
                className="flex-1 py-2 bg-kurgan-card border border-kurgan-border text-kurgan-text rounded"
              >
                Скасувати
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full py-3 bg-kurgan-accent text-kurgan-bg font-bold rounded hover:bg-kurgan-accent-dim transition"
          >
            Створити громаду
          </button>
        )}

        <div className="mt-6 pt-6 border-t border-kurgan-border">
          <p className="text-kurgan-muted text-sm text-center">Або приєднайся до існуючої через запрошення</p>
        </div>
      </div>
    )
  }

  const guild = guildData.guild!

  return (
    <div className="space-y-6">
      {/* Guild Header */}
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-6 rune-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-kurgan-accent">
              {guild.tag && <span className="text-kurgan-muted mr-2">[{guild.tag}]</span>}
              {guild.name}
            </h2>
            <p className="text-kurgan-muted">Твоя роль: {guildData.my_role}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-kurgan-accent">{guild.total_glory.toLocaleString()}</p>
            <p className="text-kurgan-muted text-sm">слава громади</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-kurgan-bg rounded p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{guild.war_wins}</p>
            <p className="text-kurgan-muted text-sm">перемог</p>
          </div>
          <div className="bg-kurgan-bg rounded p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{guild.war_losses}</p>
            <p className="text-kurgan-muted text-sm">поразок</p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-4">
        <h3 className="text-kurgan-accent font-bold mb-4">Члени громади ({guild.members.length})</h3>
        <div className="space-y-2">
          {guild.members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between bg-kurgan-bg rounded p-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {member.role === 'leader' ? '👑' : member.role === 'officer' ? '⚔️' : '⚡'}
                </span>
                <div>
                  <p className="text-kurgan-text font-medium">{member.username}</p>
                  <p className="text-kurgan-muted text-xs capitalize">{member.role}</p>
                </div>
              </div>
              <p className="text-kurgan-accent text-sm">{member.contribution.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Placeholder - WebSocket would connect here */}
      <div className="bg-kurgan-card border border-kurgan-border rounded-lg p-4">
        <h3 className="text-kurgan-accent font-bold mb-4">Чат громади</h3>
        <div className="bg-kurgan-bg rounded h-40 flex items-center justify-center">
          <p className="text-kurgan-muted">WebSocket chat підключення...</p>
        </div>
      </div>
    </div>
  )
}