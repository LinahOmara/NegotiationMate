import { memo, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'motion/react'
import { useApp } from '@/state/store'
import { useDerived } from '@/lib/useDerived'
import { useMoney } from '@/lib/useMoney'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { ChartContainer, ChartTooltipFrame } from '@/components/ui/chart'
import { COMPONENT_META } from '@/lib/componentMeta'
import { COMPONENTS, type ComponentKey } from '@/domain/schema'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/cn'
import { ResponsiveAmount } from '@/components/Amount'

type Row = { name: string } & Record<ComponentKey, number> & { totalUsd: number; raw: Record<ComponentKey, number> }

function BreakdownChartInner() {
  const mode = useApp((s) => s.ui.chartMode)
  const setChartMode = useApp((s) => s.setChartMode)
  const { target, offer, comparison, active } = useDerived()
  const { fmt, compact, primary, inCur } = useMoney()
  const reduce = useReducedMotion()

  const showScenario = active.scenario.strategy !== 'none' && Math.abs(active.result.recurring - offer.recurring) > 0.5
  const rows: Row[] = useMemo(() => {
    const mk = (name: string, raw: Record<ComponentKey, number>): Row => {
      const total = raw.base + raw.bonus + raw.equity
      const conv = (v: number) => (mode === 'percent' ? (total > 0 ? (v / total) * 100 : 0) : inCur(v, primary))
      return { name, base: conv(raw.base), bonus: conv(raw.bonus), equity: conv(raw.equity), totalUsd: total, raw }
    }
    const r = [mk('Target', target.components), mk('Offer', offer.components)]
    if (showScenario) r.push(mk('Counter', { base: active.result.base, bonus: active.result.bonus, equity: active.result.equity }))
    return r
  }, [mode, target.components, offer.components, active.result, showScenario, inCur, primary])

  const label = (k: ComponentKey) => (v: unknown) => {
    const n = Number(v)
    if (!n) return ''
    if (mode === 'percent') return n >= 9 ? `${Math.round(n)}%` : ''
    const max = Math.max(...rows.map((r) => r.base + r.bonus + r.equity), 1)
    return n / max >= (k === 'base' ? 0.16 : 0.13) ? compact(n / inCur(1, primary)) : ''
  }

  return (
    <Card aria-labelledby="breakdown-title" data-testid="breakdown">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle id="breakdown-title">Compensation breakdown</CardTitle>
          <CardDescription>Base, bonus and equity, side by side. Annual, gross.</CardDescription>
        </div>
        <Segmented
          size="sm"
          layoutId="chart-mode"
          ariaLabel="Chart values"
          value={mode}
          onChange={setChartMode}
          testId="chart-mode"
          options={[
            { value: 'amount', label: 'Amounts' },
            { value: 'percent', label: 'Mix %' },
          ]}
        />
      </CardHeader>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-hidden>
        {COMPONENTS.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <span className={cn('size-2.5 rounded-sm', COMPONENT_META[k].swatch)} />
            {COMPONENT_META[k].short}
            <span className="font-normal text-muted">· {COMPONENT_META[k].note}</span>
          </span>
        ))}
      </div>

      <ChartContainer
        label={`Stacked bar chart comparing target and offer components. Target ${fmt(target.recurring)}, offer ${fmt(offer.recurring)}. Full values in the table below.`}
        className={showScenario ? 'h-[200px]' : 'h-[150px]'}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={mode === 'percent' ? [0, 100] : [0, 'auto']}
              tickFormatter={(v: number) => (mode === 'percent' ? `${v}%` : compact(v / inCur(1, primary)))}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              minTickGap={24}
            />
            <YAxis type="category" dataKey="name" width={58} tickLine={false} axisLine={false} fontSize={12} fontWeight={600} />
            <Tooltip
              cursor={{ fill: 'rgb(23 39 35 / 0.04)' }}
              allowEscapeViewBox={{ x: false, y: true }}
              content={({ active: a, payload }) => {
                if (!a || !payload?.length) return null
                const row = payload[0].payload as Row
                return (
                  <ChartTooltipFrame
                    title={`${row.name} · ${fmt(row.totalUsd)}`}
                    rows={COMPONENTS.map((k) => ({
                      label: COMPONENT_META[k].short,
                      value: `${fmt(row.raw[k])} · ${formatPct(row.totalUsd > 0 ? (row.raw[k] / row.totalUsd) * 100 : null, { decimals: 0 })}`,
                      swatch: COMPONENT_META[k].fill,
                    }))}
                  />
                )
              }}
            />
            {COMPONENTS.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="a"
                fill={COMPONENT_META[k].fill}
                radius={i === COMPONENTS.length - 1 ? [0, 8, 8, 0] : i === 0 ? [8, 0, 0, 8] : 0}
                isAnimationActive={!reduce}
                animationDuration={320}
                maxBarSize={44}
              >
                <LabelList dataKey={k} position="center" fill="#fff" fontSize={11} fontWeight={700} formatter={label(k)} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-[0.6875rem] tnum xs:text-xs sm:text-[0.8125rem]" data-testid="breakdown-table">
          <caption className="sr-only">Component values and gaps, annual</caption>
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              <th scope="col" className="px-1.5 py-2 xs:px-2 sm:px-3 text-left font-semibold">
                Component
              </th>
              <th scope="col" className="px-1.5 py-2 xs:px-2 sm:px-3 text-right font-semibold">
                Target
              </th>
              <th scope="col" className="px-1.5 py-2 xs:px-2 sm:px-3 text-right font-semibold">
                Offer
              </th>
              <th scope="col" className="px-1.5 py-2 xs:px-2 sm:px-3 text-right font-semibold">
                Gap
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPONENTS.map((k) => {
              const g = comparison.componentGaps[k]
              return (
                <tr key={k} className="border-t border-line">
                  <th scope="row" className="px-1.5 py-2 xs:px-2 sm:px-3 text-left font-semibold">
                    <span className="flex items-center gap-1.5 xs:gap-2">
                      <span className={cn('size-2 rounded-full', COMPONENT_META[k].swatch)} aria-hidden />
                      {COMPONENT_META[k].short}
                    </span>
                  </th>
                  <td className="px-1.5 py-2 xs:px-2 sm:px-3 text-right">
                    {mode === 'percent' ? (
                      formatPct(target.mixPct[k], { decimals: 0 })
                    ) : (
                      <ResponsiveAmount full={fmt(target.components[k])} compact={compact(target.components[k])} />
                    )}
                  </td>
                  <td className="px-1.5 py-2 xs:px-2 sm:px-3 text-right">
                    {mode === 'percent' ? (
                      formatPct(offer.mixPct[k], { decimals: 0 })
                    ) : (
                      <ResponsiveAmount full={fmt(offer.components[k])} compact={compact(offer.components[k])} />
                    )}
                  </td>
                  <td className={cn('px-1.5 py-2 xs:px-2 sm:px-3 text-right font-semibold', g < -0.5 ? 'text-negative' : g > 0.5 ? 'text-positive' : 'text-muted')}>
                    <ResponsiveAmount full={fmt(g, primary, { signed: true })} compact={compact(g, primary, { signed: true })} />
                  </td>
                </tr>
              )
            })}
            <tr className="border-t border-line-strong bg-surface-2/50 font-semibold">
              <th scope="row" className="px-1.5 py-2 xs:px-2 sm:px-3 text-left">
                Total
              </th>
              <td className="px-1.5 py-2 xs:px-2 sm:px-3 text-right">
                <ResponsiveAmount full={fmt(target.recurring)} compact={compact(target.recurring)} />
              </td>
              <td className="px-1.5 py-2 xs:px-2 sm:px-3 text-right">
                <ResponsiveAmount full={fmt(offer.recurring)} compact={compact(offer.recurring)} />
              </td>
              <td
                className={cn(
                  'px-1.5 py-2 xs:px-2 sm:px-3 text-right',
                  comparison.totalGap < -0.5 ? 'text-negative' : comparison.totalGap > 0.5 ? 'text-positive' : 'text-muted',
                )}
              >
                <ResponsiveAmount
                  full={fmt(comparison.totalGap, primary, { signed: true })}
                  compact={compact(comparison.totalGap, primary, { signed: true })}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export const BreakdownChart = memo(BreakdownChartInner)
