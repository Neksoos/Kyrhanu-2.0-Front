import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { endpoints } from '@/api/endpoints'
import type { DailyVariant, Today } from '@/api/types'
import { useCapabilities } from '@/app/useCapabilities'
import { withTgParams } from '@/lib/tgNavigate'

const VARIANTS: DailyVariant[] = ['A', 'B', 'C']

export function DailyPage() {
  const nav = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const { t } = useTranslation()
  const capsQ = useCapabilities()

  const [selected, setSelected] = React.useState<DailyVariant>('A')

  const claim = useMutation({
    mutationFn: async (variant: DailyVariant) => endpoints.daily.claim({ variant }),
    onSuccess: (res) => {
      if (res?.today) qc.setQueryData<Today | null>(['daily:today'], res.today)
      toast.success(t('daily.claimed_toast'))
      nav(withTgParams('/home', location), { replace: true })
    },
    onError: (e: any) => toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' })),
  })

  const hasDaily = !!capsQ.data?.hasDailyClaim

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('daily.title')}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasDaily ? (
              <div className="space-y-2">
                <div className="text-sm text-mutedForeground">{t('common.soon_body')}</div>
                <div className="spd-divider" />
                <Button
                  variant="spd"
                  spdTone="neutral"
                  className="w-full"
                  onClick={() => nav(withTgParams('/home', location))}
                >
                  {t('common.nav_home')}
                </Button>
              </div>
            ) : (
              <>
                <div className="text-sm text-mutedForeground">{t('daily.choose_variant')}</div>

                <div className="grid grid-cols-3 gap-2">
                  {VARIANTS.map((v) => (
                    <Button
                      key={v}
                      variant="spd"
                      spdTone={v === selected ? 'primary' : 'neutral'}
                      className="h-12"
                      onClick={() => setSelected(v)}
                      disabled={claim.isPending}
                    >
                      {t(`daily.variant_${v}` as any)}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="spd"
                  spdTone="primary"
                  className="w-full"
                  onClick={() => claim.mutate(selected)}
                  disabled={claim.isPending}
                >
                  {claim.isPending ? t('common.loading') : t('daily.cta_claim')}
                </Button>

                <div className="text-xs text-mutedForeground">{t('daily.note_backend_determined')}</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}