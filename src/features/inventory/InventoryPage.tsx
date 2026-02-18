import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'
import type { InventoryItem } from '@/api/types'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageTopBar } from '@/components/PageTopBar'

function ItemCard({
  item,
  equippedSlot,
  onEquip,
  onUnequip,
  busy,
}: {
  item: InventoryItem
  equippedSlot: string | null
  onEquip: () => void
  onUnequip: () => void
  busy: boolean
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="spd-label text-outline-2">
            {t(`items.${item.item_id}.name`, { defaultValue: item.name })}
          </div>
          <div className="text-xs text-mutedForeground">{item.slot || 'misc'}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-mutedForeground">{item.rarity}</div>
        <div className="text-xs text-mutedForeground">x{item.qty}</div>
        <div className="flex gap-2">
          {equippedSlot ? (
            <Button variant="spd" spdTone="neutral" className="w-full" onClick={onUnequip} disabled={busy}>
              {t('inventory.unequip')} ({equippedSlot})
            </Button>
          ) : (
            <Button variant="spd" spdTone="primary" className="w-full" onClick={onEquip} disabled={busy}>
              {t('inventory.equip')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function InventoryPage() {
  const { t } = useTranslation()

  const invQ = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => endpoints.inventory.get(),
    refetchOnWindowFocus: false,
  })

  const equipM = useMutation({
    mutationFn: async (item_instance_id: string) => endpoints.inventory.equip({ item_instance_id }),
    onSuccess: () => invQ.refetch(),
    onError: (e: any) => {
      console.error(e)
      toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' }))
    },
  })

  const unequipM = useMutation({
    mutationFn: async (slot: string) => endpoints.inventory.unequip({ slot }),
    onSuccess: () => invQ.refetch(),
    onError: (e: any) => {
      console.error(e)
      toast.error(t('errors.backend_generic', { message: e?.detail ?? 'Error' }))
    },
  })

  const busy = invQ.isFetching || equipM.isPending || unequipM.isPending
  const equipment = invQ.data?.equipment ?? {}

  const equippedByInstance = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const [slot, iid] of Object.entries(equipment)) map[iid] = slot
    return map
  }, [equipment])

  return (
    <div className="spd-bg min-h-dvh">
      <div className="safe px-4 pb-20">
        <PageTopBar title={t('inventory.title')} backTo="/home" />

        <div className="mx-auto w-full max-w-md space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="text-sm font-semibold text-[rgb(var(--spd-text))]">{t('inventory.equipped')}</div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                <div className="text-[11px] text-mutedForeground">weapon</div>
                <div className="text-sm font-semibold">{equipment.weapon ? '✓' : '—'}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                <div className="text-[11px] text-mutedForeground">armor</div>
                <div className="text-sm font-semibold">{equipment.armor ? '✓' : '—'}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                <div className="text-[11px] text-mutedForeground">trinket</div>
                <div className="text-sm font-semibold">{equipment.trinket ? '✓' : '—'}</div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
          {(invQ.data?.items ?? []).map((it) => {
            const slot = equippedByInstance[it.item_instance_id] ?? null
            return (
              <ItemCard
                key={it.item_instance_id}
                item={it}
                equippedSlot={slot}
                busy={busy}
                onEquip={() => equipM.mutate(it.item_instance_id)}
                onUnequip={() => unequipM.mutate(slot || it.slot)}
              />
            )
          })}

          {!invQ.isLoading && (invQ.data?.items?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-mutedForeground">{t('common.soon_body')}</CardContent>
            </Card>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
