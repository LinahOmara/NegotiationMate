import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-ink-soft',
      accent: 'bg-accent-soft text-accent-ink',
      negative: 'bg-negative-soft text-negative',
      positive: 'bg-positive-soft text-positive',
      outline: 'border border-line-strong text-muted',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export function Badge({ className, tone, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
