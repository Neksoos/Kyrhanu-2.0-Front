import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageTopBar } from '@/components/PageTopBar'

export function ShopPage() {
  const { t } = useTranslation()

  const shopQ = useQuery({
    queryKey: ['shop'],
    queryFn: async () => endpoints.shop.list(),
    refetchOnWindowFocus: false,
  })

  const buyM = useMutation({
    mutationFn: async (offer_id: string) => endpoints.shop.buy({ offer_id }),
    onSuccess: () => {
      toast.success(t('shop.bought_toast'))
      shopQ.refetch()
    },
    onError: (e: any) => {
      console.error(e)
      toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' }))
    },
  })

  const busy = shopQ.isFetching || buyM.isPending

  return (
    <div className="spd-bg min-h-dvh">
      <div className="safe px-4 pb-20">
        <PageTopBar title={t('shop.title')} backTo="/home" />

        <div className="mx-auto w-full max-w-md space-y-3">
          {(shopQ.data?.offers ?? []).map((o) => (
            <Card key={o.offer_id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="spd-label text-outline-2 truncate">
                      {t(`items.${o.item_id}.name`, { defaultValue: o.name })}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-mutedForeground">
                        {o.slot}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-mutedForeground">
                        {o.rarity}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-mutedForeground">{t('shop.price')}</div>
                    <div className="text-lg font-semibold text-[rgb(var(--spd-text))]">{o.price_chervontsi}</div>
                  </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="spd"
                  spdTone="primary"
                  className="w-full"
                  onClick={() => buyM.mutate(o.offer_id)}
                  disabled={busy}
                >
                  {buyM.isPending ? t('common.loading') : t('shop.buy')}
                </Button>
              </CardContent>
            </Card>
          ))}

          {!shopQ.isLoading && (shopQ.data?.offers?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-mutedForeground">{t('common.soon_body')}</CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
