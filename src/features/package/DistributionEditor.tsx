import { Lock, LockOpen } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { COMPONENTS, type ComponentKey, type Distribution } from '@/domain/schema'
import { rebalance } from '@/calc/distribution'
import { MoneyField } from '@/components/MoneyField'
import { NumberField } from '@/components/NumberField'
import { Slider } from '@/components/ui/slider'
import { COMPONENT_META } from '@/lib/componentMeta'
import { useMoney } from '@/lib/useMoney'
import { annualIn } from '@/calc/money'
import { cn } from '@/lib/cn'

interface Props {
  idPrefix: string
  value: Distribution
  onChange: (d: Distribution) => void
  locks: ComponentKey[]
  onToggleLock: (k: ComponentKey) => void
  totalLabel: string
  size?: 'md' | 'lg'
}


/** Total + linked percentage split. Edits rebalance only unlocked components, and say which ones moved. */
export function DistributionEditor({ idPrefix, value, onChange, locks, onToggleLock, totalLabel, size = 'md' }: Props) {
  const { fmt, rate } = useMoney()
  const [moved, setMoved] = useState<string | null>(null)
  const pcts = { base: value.basePct, bonus: value.bonusPct, equity: value.equityPct }
  const totalUsd = annualIn(value.total, 'USD', rate)
  const sum = pcts.base + pcts.bonus + pcts.equity

  const set = (k: ComponentKey, v: number) => {
    const r = rebalance(pcts, k, v, locks)
    onChange({ ...value, basePct: r.pcts.base, bonusPct: r.pcts.bonus, equityPct: r.pcts.equity })
    const names = r.changed.map((c) => COMPONENT_META[c].short)
    setMoved(
      r.clamped && !r.changed.length
        ? 'Unlock another component to change this split.'
        : names.length
          ? `Rebalanced ${names.join(' & ')} to keep the total at 100%.${r.clamped ? ' Limited by locked components.' : ''}`
          : null,
    )
  }

  return (
    <div className="space-y-5">
      <MoneyField label={totalLabel} value={value.total} onChange={(total) => onChange({ ...value, total })} size={size} testId={`${idPrefix}-total`} />
      <fieldset className="space-y-3">
        <legend className="mb-1 flex w-full items-center justify-between text-[0.8125rem] font-semibold text-ink-soft">
          <span>Distribution</span>
          <span className={cn('tnum text-xs font-semibold', Math.abs(sum - 100) > 0.05 ? 'text-negative' : 'text-muted')} data-testid={`${idPrefix}-pct-sum`}>
            {Math.round(sum * 10) / 10}% of 100%
          </span>
        </legend>
        {COMPONENTS.map((k) => {
          const meta = COMPONENT_META[k]
          const locked = locks.includes(k)
          const amount = (totalUsd * pcts[k]) / Math.max(sum, 1e-9)
          return (
            <div key={k} className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.5rem] items-center gap-x-2 gap-y-1 rounded-2xl bg-surface-2/60 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn('size-2.5 shrink-0 rounded-full', meta.swatch)} aria-hidden />
                <span className="truncate text-sm font-semibold">{meta.short}</span>
                <span className="truncate text-xs text-muted tnum">{fmt(sum > 0 ? amount : 0)}</span>
              </div>
              <NumberField
                label={`${meta.short} percentage`}
                hideLabel
                size="sm"
                value={pcts[k]}
                onChange={(v) => set(k, v)}
                min={0}
                max={100}
                step={1}
                decimals={1}
                suffix="%"
                testId={`${idPrefix}-pct-${k}`}
              />
              <button
                type="button"
                onClick={() => onToggleLock(k)}
                aria-pressed={locked}
                aria-label={`${locked ? 'Unlock' : 'Lock'} ${meta.short} percentage`}
                title={locked ? 'Locked: will not change when you edit others' : 'Lock this share'}
                className={cn('inline-flex size-10 items-center justify-center rounded-lg transition-colors', locked ? 'bg-ink text-white' : 'text-muted hover:bg-surface-3 hover:text-ink')}
              >
                {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
              </button>
              <Slider
                className="col-span-3"
                value={[pcts[k]]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => set(k, v)}
                disabled={locked}
                thumbLabel={`${meta.short} share`}
                rangeClassName={meta.swatch}
              />
            </div>
          )
        })}
        <AnimatePresence initial={false}>
          {moved && (
            <motion.p
              key={moved}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="text-xs text-muted"
              role="status"
            >
              {moved}
            </motion.p>
          )}
        </AnimatePresence>
      </fieldset>
    </div>
  )
}
