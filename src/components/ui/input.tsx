import * as React from 'react'
import { cn } from '@/lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-[6px] border-2 border-border bg-spd-panel px-3 text-sm outline-none',
        'focus:border-spd-gold/80',
        className,
      )}
      {...props}
    />
  )
})