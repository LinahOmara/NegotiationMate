import { ArrowLeftRight } from 'lucide-react'
import { useApp } from '@/state/store'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NumberField } from '@/components/NumberField'
import { Button } from '@/components/ui/button'
import { DEFAULT_RATE } from '@/domain/factories'
import { formatRate } from '@/lib/format'
import { cn } from '@/lib/cn'

export function RateControl({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const rate = useApp((s) => s.settings.rate)
  const setSettings = useApp((s) => s.setSettings)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="rate-trigger"
          className={cn(
            'group inline-flex min-w-0 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 text-left transition-colors hover:bg-surface-2',
            size === 'lg' ? 'h-12' : 'h-10',
          )}
          aria-label={`Exchange rate assumption: 1 USD = ${formatRate(rate)} EGP. Edit`}
        >
          <ArrowLeftRight className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted">Your FX assumption</span>
            <span className="truncate text-[0.8125rem] font-semibold tnum" data-testid="rate-display">
              1 USD = {formatRate(rate)} EGP
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <NumberField
          label="EGP per 1 USD"
          value={rate}
          onChange={(v) => v > 0 && setSettings({ rate: v })}
          min={0.01}
          max={100000}
          step={0.5}
          testId="rate-input"
          hint="A user-provided assumption — not a live market rate. Every conversion, gap, chart and scenario uses it."
        />
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => setSettings({ rate: DEFAULT_RATE })} disabled={rate === DEFAULT_RATE}>
            Reset to {DEFAULT_RATE}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
