import { ArrowDownRight, ArrowUpRight, Equal } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback } from 'react'
import { useDerived } from '@/lib/useDerived'
import { useMoney } from '@/lib/useMoney'
import { DualMoney } from '@/components/Money'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Eyebrow } from '@/components/ui/card'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/cn'

function Figure({ eyebrow, usd, monthlyUsd, baseMonthlyUsd, extra, testId, tone }: { eyebrow: string; usd: number; monthlyUsd: number; baseMonthlyUsd: number; extra?: React.ReactNode; testId: string; tone: 'target' | 'offer' }) {
  const { fmt } = useMoney()
  return (
    <div className={cn('card relative min-w-0 overflow-hidden p-4 sm:p-6', tone === 'target' && 'bg-[linear-gradient(180deg,#fff,#fbfbf8)]')} data-testid={testId}>
      <div className={cn('absolute inset-x-0 top-0 h-1', tone === 'target' ? 'bg-accent' : 'bg-ink')} aria-hidden />
      <Eyebrow>{eyebrow}</Eyebrow>
      <DualMoney
        usd={usd}
        testId={`${testId}-total`}
        className="mt-2"
        primaryClassName="font-display-tight text-[clamp(1.5rem,6.2vw,3.25rem)] font-semibold leading-[1.05] text-ink"
        secondaryClassName="mt-1 text-[clamp(0.75rem,2.6vw,0.9375rem)] font-semibold tnum"
      />
      <p className="mt-1 text-xs text-muted">per year, gross</p>
      <dl className="mt-4 grid gap-2 border-t border-line pt-3 text-[0.8125rem]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <dt className="text-muted">Monthly equivalent</dt>
          <dd className="font-semibold tnum" data-testid={`${testId}-monthly`}>{fmt(monthlyUsd)}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <dt className="text-muted">Base / month</dt>
          <dd className="font-semibold tnum">{fmt(baseMonthlyUsd)}</dd>
        </div>
        {extra}
      </dl>
    </div>
  )
}

export function HeroComparison() {
  const { target, offer, comparison: c } = useDerived()
  const { fmt, primary } = useMoney()
  const reduce = useReducedMotion()
  const fmtGap = useCallback((v: number) => fmt(v, primary, { signed: true }), [fmt, primary])
  const fmtMonthlyGap = useCallback((v: number) => fmt(v, primary, { signed: true }), [fmt, primary])

  const reach = c.reachPct
  const status = target.recurring <= 0 ? 'none' : Math.abs(c.totalGap) < 0.5 ? 'even' : c.totalGap > 0 ? 'above' : 'below'
  const Icon = status === 'above' ? ArrowUpRight : status === 'even' ? Equal : ArrowDownRight
  const barPct = reach === null ? 0 : Math.max(0, Math.min(100, reach))
  const showFirstYear = Math.abs(offer.firstYear - offer.recurring) >= 0.5

  return (
    <section aria-labelledby="hero-title" className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)_minmax(0,1fr)]">
      <h2 id="hero-title" className="sr-only">
        Target versus current offer
      </h2>
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:contents">
        <div className="min-w-0 lg:order-1">
          <Figure eyebrow="Your Target" usd={target.recurring} monthlyUsd={target.monthly} baseMonthlyUsd={target.guaranteedMonthly} testId="hero-target" tone="target" />
        </div>
        <div className="min-w-0 lg:order-3">
          <Figure
            eyebrow="Current Offer"
            usd={offer.recurring}
            monthlyUsd={offer.monthly}
            baseMonthlyUsd={offer.guaranteedMonthly}
            testId="hero-offer"
            tone="offer"
            extra={
              showFirstYear ? (
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <dt className="text-muted">First year</dt>
                  <dd className="font-semibold tnum" data-testid="hero-offer-first-year">{fmt(offer.firstYear)}</dd>
                </div>
              ) : null
            }
          />
        </div>
      </div>

      <div
        className={cn(
          'card relative flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-6 lg:order-2',
          status === 'below' && 'border-negative/25 bg-[linear-gradient(180deg,var(--negative-soft),#fff_70%)]',
          (status === 'above' || status === 'even') && 'border-positive/25 bg-[linear-gradient(180deg,var(--positive-soft),#fff_70%)]',
        )}
        data-testid="hero-gap"
      >
        <div>
          <Eyebrow>Live gap · annual</Eyebrow>
          <div className={cn('mt-2 flex flex-wrap items-center gap-x-3 gap-y-1', status === 'below' ? 'text-negative' : status === 'none' ? 'text-muted' : 'text-positive')}>
            <Icon className="size-7 shrink-0" aria-hidden />
            <AnimatedNumber value={c.totalGap} format={fmtGap} testId="hero-gap-amount" className="font-display-tight text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-none" />
          </div>
          <p className="mt-2 text-sm font-semibold text-ink-soft">
            <span data-testid="hero-gap-pct">{formatPct(c.totalGapPct, { signed: true })}</span>{' '}
            <span className="font-medium text-muted">{status === 'below' ? 'below target' : status === 'above' ? 'above target' : status === 'even' ? 'on target' : 'set a target to compare'}</span>
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold" data-testid="hero-reach">
              {reach === null ? 'Enter a target to compare' : `Offer reaches ${Math.round(reach)}% of your target.`}
            </span>
          </div>
          <div
            className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-surface-3"
            role="meter"
            aria-label="Offer as a share of your target"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(barPct)}
          >
            <motion.div
              className={cn('absolute inset-y-0 left-0 rounded-full', status === 'below' ? 'bg-negative' : 'bg-positive')}
              initial={false}
              animate={{ width: `${barPct}%` }}
              transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-muted">Share of your target total — not a likelihood of agreement.</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-[0.8125rem]">
          <div className="min-w-0">
            <dt className="text-muted">Base gap / month</dt>
            <dd className="font-semibold tnum" data-testid="hero-base-gap-monthly">
              <AnimatedNumber value={c.monthlyBaseGap} format={fmtMonthlyGap} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted">Total gap / month</dt>
            <dd className="font-semibold tnum">
              <AnimatedNumber value={c.monthlyGap} format={fmtMonthlyGap} />
            </dd>
          </div>
          {showFirstYear && (
            <div className="col-span-2 min-w-0">
              <dt className="text-muted">First-year gap</dt>
              <dd className="font-semibold tnum">{fmt(c.firstYearGap, primary, { signed: true })}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  )
}
