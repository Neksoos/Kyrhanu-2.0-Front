import * as React from 'react'
import { cn } from '@/lib/cn'

type SpdTone = 'primary' | 'neutral' | 'danger'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'spd'
  spdTone?: SpdTone
}

export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'spd', spdTone = 'neutral', type, ...props },
  ref,
) {
  const tone =
    spdTone === 'primary'
      ? 'border-spd-gold bg-spd-panel2'
      : spdTone === 'danger'
        ? 'border-red-500/60 bg-red-500/10'
        : 'border-border bg-spd-panel'

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'h-11 w-auto rounded-[6px] border-2 px-3 text-sm text-outline-2',
        'transition-[transform,opacity] duration-spd active:translate-y-px',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        variant === 'spd' ? tone : '',
        className,
      )}
      {...props}
    />
  )
})