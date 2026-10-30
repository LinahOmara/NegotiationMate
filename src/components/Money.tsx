import { useCallback } from 'react'
import { AnimatedNumber } from './AnimatedNumber'
import { useMoney } from '@/lib/useMoney'
import { cn } from '@/lib/cn'
import type { MoneyFormatOptions } from '@/lib/format'

interface DualMoneyProps {
  usd: number
  className?: string
  primaryClassName?: string
  secondaryClassName?: string
  opts?: MoneyFormatOptions
  testId?: string
  suffix?: string
  stacked?: boolean
}

/** Primary (emphasized) currency, with the other currency beneath when display mode is Both. */
export function DualMoney({ usd, className, primaryClassName, secondaryClassName, opts, testId, suffix, stacked = true }: DualMoneyProps) {
  const { primary, secondary, fmt } = useMoney()
  const fp = useCallback((v: number) => fmt(v, primary, opts), [fmt, primary, opts])
  const fs = useCallback((v: number) => (secondary ? fmt(v, secondary, opts) : ''), [fmt, secondary, opts])
  return (
    <span className={cn('inline-flex min-w-0 max-w-full', stacked ? 'flex-col' : 'flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('min-w-0 break-words', primaryClassName)}>
        <AnimatedNumber value={usd} format={fp} testId={testId} />
        {suffix && <span className="ml-0.5 text-[0.55em] font-medium text-muted">{suffix}</span>}
      </span>
      {secondary && (
        <span className={cn('min-w-0 text-muted', secondaryClassName)}>
          <AnimatedNumber value={usd} format={fs} testId={testId ? `${testId}-secondary` : undefined} />
          {suffix && <span className="ml-0.5">{suffix}</span>}
        </span>
      )}
    </span>
  )
}

export function SignedMoney({ usd, className, testId, compact }: { usd: number; className?: string; testId?: string; compact?: boolean }) {
  const { primary, fmt, compact: c } = useMoney()
  const f = useCallback((v: number) => (compact ? c(v, primary, { signed: true }) : fmt(v, primary, { signed: true })), [fmt, c, primary, compact])
  return <AnimatedNumber value={usd} format={f} className={className} testId={testId} />
}
