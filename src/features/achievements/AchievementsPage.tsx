import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'
import { useCapabilities } from '@/app/useCapabilities'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { openExternalLink } from '@/lib/telegram'

const claimSchema = z.object({
  achievement_id: z.string().min(1),
})

type ClaimForm = z.infer<typeof claimSchema>

export function AchievementsPage() {
  const { t } = useTranslation()
  const capsQ = useCapabilities()
  const caps = capsQ.data

  const form = useForm<ClaimForm>({
    resolver: zodResolver(claimSchema),
    defaultValues: { achievement_id: '' },
  })

  const claim = useMutation({
    mutationFn: (body: { achievement_id: string }) => endpoints.achievements.claim(body),
    onSuccess: (res) => {
      toast.success(t('achievements.claimed_toast', { id: res.achievement_id }))
      form.reset({ achievement_id: '' })
    },
    onError: (e: any) => toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' })),
  })

  const share = useMutation({
    mutationFn: () => endpoints.achievements.shareCard(),
    onSuccess: (res) => {
      toast.success(t('achievements.share_ready'))
      if (res.card_url) openExternalLink(res.card_url)
    },
    onError: (e: any) => toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' })),
  })

  const showSoon = !caps || (!caps.hasAchievementsList && !caps.hasAchievementsClaim && !caps.hasAchievementsShareCard)

  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('achievements.title')}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSoon ? <div className="text-sm text-mutedForeground">{t('common.soon_body')}</div> : null}

            {caps?.hasAchievementsClaim ? (
              <form
                className="space-y-3"
                onSubmit={form.handleSubmit((v) => claim.mutate({ achievement_id: v.achievement_id }))}
              >
                <div>
                  <div className="text-xs text-mutedForeground mb-2">{t('achievements.claim_id')}</div>
                  <Input
                    className="w-full"
                    placeholder={t('achievements.claim_id_placeholder')}
                    {...form.register('achievement_id')}
                  />
                </div>
                <Button variant="spd" spdTone="primary" className="w-full" disabled={claim.isPending} type="submit">
                  {claim.isPending ? t('common.loading') : t('achievements.cta_claim')}
                </Button>
              </form>
            ) : null}

            {caps?.hasAchievementsShareCard ? (
              <div className="space-y-3">
                <div className="spd-divider" />
                <div className="text-sm text-mutedForeground">{t('achievements.share_title')}</div>
                <Button
                  variant="spd"
                  spdTone="neutral"
                  className="w-full"
                  disabled={share.isPending}
                  onClick={() => share.mutate()}
                >
                  {share.isPending ? t('common.loading') : t('achievements.cta_share')}
                </Button>

                {share.data && !share.data.card_url ? (
                  <pre className="spd-frame spd-bevel-inset spd-panel p-3 text-xs overflow-auto max-h-56">
                    {JSON.stringify(share.data.card_payload ?? null, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : null}

            {!caps?.hasAchievementsClaim && !caps?.hasAchievementsShareCard ? (
              <div className="text-xs text-mutedForeground">{t('common.soon')}</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}