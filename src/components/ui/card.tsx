import * as React from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: React.ComponentProps<'section'>) {
  return <section className={cn('card min-w-0 p-5 sm:p-6', className)} {...props} />
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-5 flex flex-wrap items-start justify-between gap-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('font-display-tight text-xl font-semibold text-ink sm:text-[1.375rem]', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('mt-1 text-sm text-muted', className)} {...props} />
}

export function Eyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted', className)} {...props} />
}
