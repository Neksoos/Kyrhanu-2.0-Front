import * as React from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'

type Intent = 'primary' | 'neutral' | 'danger'

export function CTAButton({
  intent = 'neutral',
  icon,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { intent?: Intent; icon?: string }) {
  return (
    <Button
      variant="spd"
      spdTone={intent}
      className={cn('w-full justify-center flex items-center gap-2', className)}
      {...props}
    >
      {icon ? <span className="text-lg leading-none">{icon}</span> : null}
      <span>{children}</span>
    </Button>
  )
}