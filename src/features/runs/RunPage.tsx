import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'
import type { RunOut } from '@/api/types'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTgNavigate } from '@/lib/tgNavigate'

function StatLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-mutedForeground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

export function RunPage() {
  const { t } = useTranslation()
  const nav = useTgNavigate()

  const runQ = useQuery({
    queryKey: ['runs:current'],
    queryFn: async () => endpoints.runs.current(),
    refetchOnWindowFocus: false,
  })

  const run = runQ.data?.run as RunOut | null | undefined

  const startRun = useMutation({
    mutationFn: async () => endpoints.runs.start(),
    onSuccess: () => runQ.refetch(),
    onError: (e: any) => {
      console.error(e)
      toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' }))
    },
  })

  const choose = useMutation({
    mutationFn: async ({ runId, choiceId }: { runId: string; choiceId: string }) =>
      endpoints.runs.choice(runId, { choice_id: choiceId }),
    onSuccess: () => runQ.refetch(),
    onError: (e: any) => {
      console.error(e)
      toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' }))
    },
  })

  const act = useMutation({
    mutationFn: async ({ runId, action }: { runId: string; action: 'attack' | 'defend' | 'skill' }) =>
      endpoints.runs.combatAct(runId, { action }),
    onSuccess: () => runQ.refetch(),
    onError: (e: any) => {
      console.error(e)
      toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' }))
    },
  })

  const finish = useMutation({
    mutationFn: async (runId: string) => endpoints.runs.finish(runId),
    onSuccess: () => runQ.refetch(),
    onError: (e: any) => {
      console.error(e)
      toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' }))
    },
  })

  const busy = startRun.isPending || choose.isPending || act.isPending || finish.isPending || runQ.isFetching

  // If no active run, show start
  if (!runQ.isLoading && !run) {
    return (
      <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="spd-label text-outline-2">{t('run.title')}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-mutedForeground">{t('run.no_active')}</div>
              <Button variant="spd" spdTone="primary" className="w-full" onClick={() => startRun.mutate()} disabled={busy}>
                {busy ? t('common.loading') : t('run.cta_start')}
              </Button>
              <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/home')}>
                {t('common.nav_home')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Card>
            <CardContent className="py-6 text-sm text-mutedForeground">{t('common.loading')}</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const state = run.state
  const current = state?.current

  const isFinished = !!state?.rewards || state?.result === 'defeat'

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('run.title')}</div>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatLine label={t('run.hp')} value={`${state?.player?.hp ?? 0}/${state?.player?.max_hp ?? 0}`} />
            <StatLine label={t('run.energy')} value={state?.player?.energy ?? 0} />
            <StatLine label={t('run.gold')} value={state?.gold ?? 0} />
            <div className="spd-divider" />
            <div className="text-xs text-mutedForeground">
              {t('run.progress', { step: (state?.step ?? 0) + 1, total: state?.total ?? 0 })}
            </div>
          </CardContent>
        </Card>

        {isFinished ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="spd-label text-outline-2">{t(state?.result === 'defeat' ? 'run.defeat' : 'run.victory')}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-mutedForeground">{t('run.rewards_title')}</div>
              <div className="space-y-1">
                <StatLine label={t('run.reward_gold')} value={state?.rewards?.gold ?? 0} />
                <StatLine label={t('run.reward_items')} value={(state?.rewards?.items?.length ?? 0) || 0} />
              </div>
              <Button variant="spd" spdTone="primary" className="w-full" onClick={() => nav('/inventory')}>
                {t('run.cta_inventory')}
              </Button>
              <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/home')}>
                {t('common.nav_home')}
              </Button>
            </CardContent>
          </Card>
        ) : state?.combat ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="spd-label text-outline-2">{t('run.combat_title')}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{state.combat.enemy_name}</div>
                <div className="text-xs text-mutedForeground">
                  {t('run.enemy_hp', { hp: state.combat.enemy_hp, max: state.combat.enemy_max_hp })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="spd"
                  spdTone="primary"
                  className="h-12"
                  onClick={() => act.mutate({ runId: run.id, action: 'attack' })}
                  disabled={busy}
                >
                  {t('run.act_attack')}
                </Button>
                <Button
                  variant="spd"
                  spdTone="neutral"
                  className="h-12"
                  onClick={() => act.mutate({ runId: run.id, action: 'defend' })}
                  disabled={busy}
                >
                  {t('run.act_defend')}
                </Button>
                <Button
                  variant="spd"
                  spdTone="neutral"
                  className="h-12"
                  onClick={() => act.mutate({ runId: run.id, action: 'skill' })}
                  disabled={busy || (state.player?.energy ?? 0) <= 0}
                >
                  {t('run.act_skill')}
                </Button>
              </div>

              <div className="rounded-xl border border-white/10 p-3">
                <div className="text-xs text-mutedForeground">{t('run.combat_log')}</div>
                <div className="mt-2 space-y-1">
                  {(state.combat.log ?? []).slice(-6).map((l, idx) => (
                    <div key={idx} className="text-xs">
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : current ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="spd-label text-outline-2">{current.title}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-mutedForeground">{current.body}</div>

              <div className="space-y-2">
                {(current.choices ?? []).map((c) => (
                  <Button
                    key={c.id}
                    variant="spd"
                    spdTone="primary"
                    className="w-full"
                    onClick={() => choose.mutate({ runId: run.id, choiceId: c.id })}
                    disabled={busy}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>

              {current.type === 'final' ? (
                <Button
                  variant="spd"
                  spdTone="neutral"
                  className="w-full"
                  onClick={() => finish.mutate(run.id)}
                  disabled={busy}
                >
                  {busy ? t('common.loading') : t('run.cta_finish')}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <div className="spd-label text-outline-2">{t('run.title')}</div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-mutedForeground">{t('common.loading')}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('run.log_title')}</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {(state?.log ?? []).slice(-8).map((l, idx) => (
                <div key={idx} className="text-xs text-mutedForeground">
                  {l}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
