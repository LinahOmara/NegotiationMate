import { useEffect, useId, useRef, useState } from 'react'
import type { Currency, Money, Period } from '@/domain/schema'
import { parseAmount } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Label } from '@/components/ui/label'

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

interface MoneyFieldProps {
  label: string
  value: Money
  onChange: (m: Money) => void
  /** Show the monthly/annual toggle. Lump sums (grants, sign-on) hide it. */
  periodToggle?: boolean
  currencyToggle?: boolean
  hint?: React.ReactNode
  size?: 'md' | 'lg'
  testId?: string
  className?: string
  labelAside?: React.ReactNode
}

function MiniToggle<T extends string>({ value, options, onChange, label, size }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; size: 'md' | 'lg' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-lg bg-surface-2 p-0.5">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                const i = options.findIndex((x) => x.value === value)
                const next = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length]
                onChange(next.value)
              }
            }}
            tabIndex={on ? 0 : -1}
            className={cn(
              'rounded-md px-2 font-semibold transition-colors duration-150',
              size === 'lg' ? 'h-9 min-w-11 text-sm' : 'h-8 min-w-10 text-xs',
              on ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Currency- and period-aware amount input with formatting, validation and k/m shorthand. */
export function MoneyField({ label, value, onChange, periodToggle = true, currencyToggle = true, hint, size = 'md', testId, className, labelAside }: MoneyFieldProps) {
  const id = useId()
  const [text, setText] = useState(() => grouped.format(value.amount))
  const [error, setError] = useState<string | null>(null)
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(grouped.format(value.amount))
  }, [value.amount])

  const commit = (raw: string) => {
    setText(raw)
    if (/^\s*-/.test(raw)) return setError('Amounts cannot be negative.')
    const n = parseAmount(raw)
    if (n === null) return setError('Enter a number, e.g. 70,900 or 70.9k.')
    setError(null)
    if (n !== value.amount) onChange({ ...value, amount: n })
  }

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label htmlFor={id} className={size === 'lg' ? 'text-sm' : undefined}>
          {label}
        </Label>
        {labelAside}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <div className="relative min-w-[7.5rem] flex-1">
          <span className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted', size === 'lg' ? 'text-base' : 'text-sm')}>
            {value.currency === 'USD' ? '$' : 'E£'}
          </span>
          <input
            id={id}
            data-testid={testId}
            inputMode="decimal"
            autoComplete="off"
            value={text}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
            onFocus={(e) => {
              focused.current = true
              e.currentTarget.select()
            }}
            onBlur={() => {
              focused.current = false
              if (!error) setText(grouped.format(value.amount))
            }}
            onChange={(e) => commit(e.target.value)}
            className={cn(
              'w-full min-w-0 rounded-xl border border-line-strong bg-surface pr-3 font-semibold text-ink tnum transition-[border-color,box-shadow] duration-150 hover:border-muted/50 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 aria-[invalid=true]:border-negative aria-[invalid=true]:ring-negative/15',
              value.currency === 'USD' ? 'pl-7' : 'pl-9',
              size === 'lg' ? 'h-14 text-xl' : 'h-11 text-[0.9375rem]',
            )}
          />
        </div>
        {currencyToggle && (
          <MiniToggle<Currency>
            label={`${label} currency`}
            size={size}
            value={value.currency}
            onChange={(c) => onChange({ ...value, currency: c })}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EGP', label: 'EGP' },
            ]}
          />
        )}
        {periodToggle && (
          <MiniToggle<Period>
            label={`${label} period`}
            size={size}
            value={value.period}
            onChange={(p) => onChange({ ...value, period: p })}
            options={[
              { value: 'annual', label: '/yr' },
              { value: 'monthly', label: '/mo' },
            ]}
          />
        )}
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs font-medium text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
