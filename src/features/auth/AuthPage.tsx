import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { endpoints } from '@/api/endpoints'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { storage } from '@/lib/storage'
import { getInitData } from '@/lib/telegram'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormValues = z.infer<typeof schema>
type Tab = 'login' | 'register'

export function AuthPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [tab, setTab] = React.useState<Tab>('login')

  const initData = getInitData()
  const isTelegram = Boolean(initData)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  // ✅ Telegram login
  const tgAuth = useMutation({
    mutationFn: async () => {
      if (!initData) throw new Error('No initData')
      return endpoints.auth.telegramInitData({ initData })
    },
    onSuccess: (data) => {
      storage.setAccessToken(data.accessToken)
      toast.success('Telegram OK')
      nav('/daily', { replace: true })
    },
    onError: (e: any) => {
      toast.error(t('errors.backend_generic', { message: e?.detail ?? e?.message ?? 'Error' }))
    },
  })

  // ✅ Auto-run in Telegram
  React.useEffect(() => {
    if (isTelegram && !tgAuth.isPending && !tgAuth.isSuccess) {
      tgAuth.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTelegram])

  // ✅ Email/password fallback (only for non-telegram)
  const auth = useMutation({
    mutationFn: async (body: FormValues) => {
      if (tab === 'login') return endpoints.auth.login(body)
      return endpoints.auth.register(body)
    },
    onSuccess: (data) => {
      storage.setAccessToken(data.accessToken)
      toast.success(tab === 'login' ? t('auth.login_success') : t('auth.register_success'))
      nav('/daily', { replace: true })
    },
    onError: (e: any) => {
      toast.error(t('errors.backend_generic', { message: e?.detail ?? e?.message ?? 'Error' }))
    },
  })

  // Якщо телеграм — показуємо “йде вхід”
  if (isTelegram) {
    return (
      <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="spd-label text-outline-2">Вхід через Telegram</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm opacity-80">
                {tgAuth.isPending ? 'Авторизація…' : tgAuth.isError ? 'Помилка авторизації' : 'Готово'}
              </div>
              {tgAuth.isError && (
                <Button className="w-full" variant="spd" spdTone="primary" onClick={() => tgAuth.mutate()}>
                  Спробувати знову
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Веб-версія (не Telegram): email/password
  return (
    <div className="safe px-4 pb-20 pt-4 spd-bg min-h-dvh">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="spd-label text-outline-2">{t('auth.title')}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="spd"
                spdTone={tab === 'login' ? 'primary' : 'neutral'}
                onClick={() => setTab('login')}
              >
                {t('auth.tab_login')}
              </Button>
              <Button
                type="button"
                variant="spd"
                spdTone={tab === 'register' ? 'primary' : 'neutral'}
                onClick={() => setTab('register')}
              >
                {t('auth.tab_register')}
              </Button>
            </div>

            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((v) => auth.mutate({ email: v.email, password: v.password }))}
            >
              <div className="space-y-2">
                <div className="text-xs text-mutedForeground">{t('auth.email_label')}</div>
                <Input placeholder={t('auth.email_placeholder')} {...form.register('email')} />
              </div>

              <div className="space-y-2">
                <div className="text-xs text-mutedForeground">{t('auth.password_label')}</div>
                <Input type="password" placeholder={t('auth.password_placeholder')} {...form.register('password')} />
              </div>

              <Button className="w-full" type="submit" variant="spd" spdTone="primary" disabled={auth.isPending}>
                {auth.isPending ? t('common.loading') : tab === 'login' ? t('auth.cta_login') : t('auth.cta_register')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}