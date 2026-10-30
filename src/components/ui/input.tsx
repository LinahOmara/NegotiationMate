import * as React from 'react'
import { cn } from '@/lib/cn'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3 text-[0.9375rem] text-ink tnum placeholder:text-muted/70 transition-[border-color,box-shadow] duration-150 hover:border-muted/50 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 aria-[invalid=true]:border-negative',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-20 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15',
        className,
      )}
      {...props}
    />
  )
}
