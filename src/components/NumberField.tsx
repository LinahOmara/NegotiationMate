import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { Label } from '@/components/ui/label'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  hint?: React.ReactNode
  testId?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  hideLabel?: boolean
  decimals?: number
}

/** Bounded numeric input (percentages, months, rates) with inline validation. */
export function NumberField({ label, value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, step = 1, suffix, hint, testId, className, size = 'md', hideLabel, decimals = 2 }: NumberFieldProps) {
  const id = useId()
  const fmt = (v: number) => String(Math.round(v * 10 ** decimals) / 10 ** decimals)
  const [text, setText] = useState(fmt(value))
  const [error, setError] = useState<string | null>(null)
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(fmt(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const commit = (raw: string) => {
    setText(raw)
    const t = raw.trim()
    if (t === '' || t === '.' || t === '-') return setError('Enter a value.')
    const n = Number(t)
    if (!Number.isFinite(n)) return setError('Enter a number.')
    if (n < min) return setError(min === 0 ? 'Cannot be negative.' : `Minimum is ${min}.`)
    if (n > max) return setError(`Maximum is ${max}.`)
    setError(null)
    if (n !== value) onChange(n)
  }

  return (
    <div className={cn('min-w-0', className)}>
      <Label htmlFor={id} className={cn('mb-1.5 block', hideLabel && 'sr-only')}>
        {label}
      </Label>
      <div className="relative">
        <input
          id={id}
          data-testid={testId}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onFocus={(e) => {
            focused.current = true
            e.currentTarget.select()
          }}
          onBlur={() => {
            focused.current = false
            setError(null)
            setText(fmt(value))
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const next = Math.min(max, Math.max(min, value + (e.key === 'ArrowUp' ? step : -step)))
              const rounded = Math.round(next * 1e6) / 1e6
              setText(fmt(rounded))
              onChange(rounded)
            }
          }}
          onChange={(e) => commit(e.target.value)}
          className={cn(
            'w-full min-w-0 rounded-xl border border-line-strong bg-surface pl-3 font-semibold text-ink tnum transition-[border-color,box-shadow] duration-150 hover:border-muted/50 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 aria-[invalid=true]:border-negative',
            suffix ? 'pr-9' : 'pr-3',
            size === 'sm' && 'h-9 text-sm',
            size === 'md' && 'h-11 text-[0.9375rem]',
            size === 'lg' && 'h-14 text-xl',
          )}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">{suffix}</span>}
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs font-medium text-negative">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
