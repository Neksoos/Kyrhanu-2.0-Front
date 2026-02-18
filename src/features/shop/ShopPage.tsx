import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTgNavigate } from '@/lib/tgNavigate'

export function ShopPage() {
  const { t } = useTranslation()
  const nav = useTgNavigate()

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
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="spd-label text-outline-2">{t('shop.title')}</div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="spd" spdTone="neutral" className="w-full" onClick={() => nav('/home')}>
              {t('common.nav_home')}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {(shopQ.data?.offers ?? []).map((o) => (
            <Card key={o.offer_id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="spd-label text-outline-2">{o.name}</div>
                  <div className="text-xs text-mutedForeground">{o.slot}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-mutedForeground">
                  {t('shop.price')}: {o.price_chervontsi}
                </div>
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
