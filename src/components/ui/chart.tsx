import * as React from 'react'
import { cn } from '@/lib/cn'

/**
 * shadcn/ui-style chart frame for Recharts: consistent typography, axis and
 * grid colors via CSS, and an accessible description slot.
 */
export function ChartContainer({ className, children, label, ...props }: React.ComponentProps<'div'> & { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'w-full min-w-0 text-xs [&_.recharts-cartesian-axis-tick_text]:fill-[var(--muted)] [&_.recharts-cartesian-grid_line]:stroke-[var(--line)] [&_.recharts-reference-line_line]:stroke-[var(--line-strong)] [&_.recharts-surface]:overflow-visible [&_.recharts-wrapper]:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ChartTooltipFrame({ title, rows }: { title: React.ReactNode; rows: { label: string; value: string; swatch?: string }[] }) {
  return (
    <div className="min-w-44 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-lg">
      <div className="mb-1.5 font-semibold text-ink">{title}</div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              {r.swatch && <span className="size-2 rounded-full" style={{ background: r.swatch }} />}
              {r.label}
            </span>
            <span className="font-semibold tnum text-ink">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
