import { memo, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'motion/react'
import { useApp } from '@/state/store'
import { useDerived } from '@/lib/useDerived'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Slider } from '@/components/ui/slider'
import { ChartContainer, ChartTooltipFrame } from '@/components/ui/chart'
import { fxRange, fxSensitivity } from '@/calc/fx'
import { compactMoney, formatMoney, formatPct, formatRate } from '@/lib/format'
import type { Currency } from '@/domain/schema'
import { cn } from '@/lib/cn'

function FxSensitivityInner() {
  const rate = useApp((s) => s.settings.rate)
  const targetIn = useApp((s) => s.target)
  const offerIn = useApp((s) => s.offer)
  const usdPayment = useApp((s) => s.offer.usdPayment)
  const { offer, target } = useDerived()
  const reduce = useReducedMotion()
  const [view, setView] = useState<Currency>('USD')
  const [what, setWhat] = useState<number | null>(null)

  const rates = useMemo(() => fxRange(rate, 13), [rate])
  const lo = rates[0]
  const hi = rates[rates.length - 1]
  const hypo = what === null || what < lo || what > hi ? rate : what
  const rows = useMemo(() => fxSensitivity(targetIn, offerIn, rates), [targetIn, offerIn, rates])
  const at = useMemo(() => fxSensitivity(targetIn, offerIn, [hypo])[0], [targetIn, offerIn, hypo])
  const data = rows.map((r) => ({ rate: r.rate, offer: view === 'USD' ? r.offerUSD : r.offerEGP, target: view === 'USD' ? r.targetUSD : r.targetEGP }))

  const egpShare = offer.egpFixedShare ?? 0
  const deltaPct = ((hypo - rate) / rate) * 100
  const offerChange = at.offerUSD - offer.recurring
  const arrangement =
    egpShare >= 99.5
      ? 'The offer is fixed in EGP: its EGP amount stays the same and its USD-equivalent moves with the rate.'
      : egpShare > 0.5
        ? `${formatPct(egpShare, { decimals: 0 })} of the offer is fixed in EGP; the rest is USD-${usdPayment === 'usdLinkedEgp' ? 'linked and paid in EGP at the prevailing rate' : 'denominated'}.`
        : usdPayment === 'usdLinkedEgp'
          ? 'The offer is USD-linked and paid in EGP: the EGP you receive changes with the rate, its USD value does not.'
          : 'The offer is denominated in USD: its USD value is constant and its EGP equivalent changes with the rate.'

  return (
    <Card aria-labelledby="fx-title" data-testid="fx">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle id="fx-title">FX sensitivity</CardTitle>
          <CardDescription>What happens to each package if the exchange rate moves. Hypothetical rates, not forecasts.</CardDescription>
        </div>
        <Segmented
          size="sm"
          layoutId="fx-view"
          ariaLabel="FX chart currency"
          value={view}
          onChange={setView}
          options={[
            { value: 'USD', label: 'In USD' },
            { value: 'EGP', label: 'In EGP' },
          ]}
        />
      </CardHeader>

      <p className="mb-4 rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-ink-soft" data-testid="fx-arrangement">
        {arrangement}
      </p>

      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">If 1 USD = <span className="tnum" data-testid="fx-hypo-rate">{formatRate(hypo)}</span> EGP</span>
        <span className="text-xs text-muted tnum">{formatPct(deltaPct, { signed: true })} vs your assumption ({formatRate(rate)})</span>
      </div>
      <Slider value={[hypo]} min={lo} max={hi} step={0.25} onValueChange={([v]) => setWhat(v)} thumbLabel="Hypothetical exchange rate" data-testid="fx-slider" />

      <dl className="mt-4 grid grid-cols-1 gap-3 xs:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-line p-3">
          <dt className="text-xs text-muted">Offer, USD-equivalent</dt>
          <dd className="mt-0.5 font-semibold tnum" data-testid="fx-offer-usd">{formatMoney(at.offerUSD, 'USD')}</dd>
          <dd className={cn('text-xs tnum', offerChange < -0.5 ? 'text-negative' : offerChange > 0.5 ? 'text-positive' : 'text-muted')}>
            {Math.abs(offerChange) < 0.5 ? 'No change' : `${formatMoney(offerChange, 'USD', { signed: true })} vs now`}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border border-line p-3">
          <dt className="text-xs text-muted">Offer, paid in EGP terms</dt>
          <dd className="mt-0.5 font-semibold tnum" data-testid="fx-offer-egp">{formatMoney(at.offerEGP, 'EGP')}</dd>
          <dd className="text-xs text-muted tnum">{formatMoney(at.offerEGP / 12, 'EGP')} / mo</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-line p-3">
          <dt className="text-xs text-muted">Gap to target (USD)</dt>
          <dd className={cn('mt-0.5 font-semibold tnum', at.gapUSD < -0.5 ? 'text-negative' : 'text-positive')}>{formatMoney(at.gapUSD, 'USD', { signed: true })}</dd>
          <dd className="text-xs text-muted tnum">target {formatMoney(at.targetUSD, 'USD')}</dd>
        </div>
      </dl>

      <ChartContainer label={`Line chart of offer and target value in ${view} across exchange rates from ${formatRate(lo)} to ${formatRate(hi)} EGP per USD.`} className="mt-5 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="rate" type="number" domain={[lo, hi]} tickFormatter={(v: number) => v.toFixed(0)} tickLine={false} axisLine={false} fontSize={11} minTickGap={20} />
            <YAxis width={56} tickFormatter={(v: number) => compactMoney(v, view)} tickLine={false} axisLine={false} fontSize={11} domain={['auto', 'auto']} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as (typeof data)[number]
                return (
                  <ChartTooltipFrame
                    title={`1 USD = ${formatRate(p.rate)} EGP`}
                    rows={[
                      { label: 'Offer', value: formatMoney(p.offer, view), swatch: 'var(--ink)' },
                      { label: 'Target', value: formatMoney(p.target, view), swatch: 'var(--accent)' },
                    ]}
                  />
                )
              }}
            />
            <ReferenceLine x={rate} strokeDasharray="3 3" label={{ value: 'now', position: 'insideTopLeft', fontSize: 10, fill: 'var(--muted)' }} />
            {hypo !== rate && <ReferenceLine x={hypo} stroke="var(--bonus)" strokeWidth={1.5} />}
            <Line dataKey="target" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={!reduce} animationDuration={300} name="Target" />
            <Line dataKey="offer" stroke="var(--ink)" strokeWidth={2.5} dot={false} isAnimationActive={!reduce} animationDuration={300} name="Offer" />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-ink" />Offer</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-accent" />Target</span>
      </div>
      {target.recurring <= 0 && <p className="mt-2 text-xs text-muted">Set a target to compare against it.</p>}
    </Card>
  )
}

export const FxSensitivity = memo(FxSensitivityInner)
