import { useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookmarkPlus, CheckCircle2, Landmark, Layers, RotateCcw, Sparkles, Target, TrendingUp, Wallet } from 'lucide-react'
import { useApp } from '@/state/store'
import { useDerived } from '@/lib/useDerived'
import { useMoney } from '@/lib/useMoney'
import { Card, CardDescription, CardHeader, CardTitle, Eyebrow } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { SOLVER_LABELS, type SolverKind } from '@/calc/scenarios'
import type { Adjustments } from '@/domain/schema'
import { formatPct } from '@/lib/format'
import { toast } from '@/components/toast'
import { cn } from '@/lib/cn'

const QUICK: { kind: SolverKind; icon: typeof Target }[] = [
  { kind: 'closeGap', icon: Target },
  { kind: 'baseFirst', icon: Landmark },
  { kind: 'equityOnly', icon: TrendingUp },
  { kind: 'signOn', icon: Wallet },
  { kind: 'matchMix', icon: Layers },
]

const SLIDERS: { key: keyof Adjustments; label: string; swatch: string }[] = [
  { key: 'base', label: 'Base salary change', swatch: 'bg-base' },
  { key: 'bonus', label: 'Bonus change', swatch: 'bg-bonus' },
  { key: 'equity', label: 'Equity change (annualized)', swatch: 'bg-equity' },
  { key: 'signOn', label: 'Sign-on bonus (one-time)', swatch: 'bg-accent' },
]

function roundStep(v: number) {
  return Math.max(50, Math.round(v / 2000 / 50) * 50 || 50)
}

export function ScenarioExplorer() {
  const { scenarioResults, active, target, offer } = useDerived()
  const notes = useApp((s) => s.ui.solverNotes)
  const { setActiveScenario, setScenarioAdjustment, applySolver, resetScenario, saveToHistory, updateScenario } = useApp.getState()
  const { fmt, primary } = useMoney()
  const signed = useCallback((v: number) => fmt(v, primary, { signed: true }), [fmt, primary])
  const plain = useCallback((v: number) => fmt(v), [fmt])

  const adj = active.result.adjustments
  const scale = Math.max(target.recurring, offer.recurring, 10000)
  const note = notes[active.scenario.id] ?? active.solver
  const isCurrent = active.scenario.strategy === 'none'

  const rangeFor = (key: keyof Adjustments) => {
    const cur = key === 'signOn' ? 0 : key === 'base' ? offer.base : key === 'bonus' ? offer.bonusTarget : offer.equityAnnual
    const max = Math.max(scale * 0.6, Math.abs(adj[key]) * 1.25)
    return { min: key === 'signOn' ? 0 : -Math.round(cur), max: Math.round(max) }
  }

  return (
    <Card aria-labelledby="scenarios-title" data-testid="scenarios" className="p-5 sm:p-7">
      <CardHeader>
        <div className="min-w-0">
          <Eyebrow className="text-accent-ink">Live negotiation</Eyebrow>
          <CardTitle id="scenarios-title" className="text-2xl sm:text-[1.75rem]">
            Explore Your Next Move
          </CardTitle>
          <CardDescription>Model counteroffers from your current target and offer. These are requests you could make — not predicted outcomes.</CardDescription>
        </div>
      </CardHeader>

      <div role="tablist" aria-label="Scenarios" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {scenarioResults.map(({ scenario, result }) => {
          const on = scenario.id === active.scenario.id
          return (
            <button
              key={scenario.id}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="scenario-editor"
              onClick={() => setActiveScenario(scenario.id)}
              data-testid={`scenario-tab-${scenario.id}`}
              className={cn(
                'relative min-w-0 rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow] duration-200',
                on ? 'border-ink bg-surface shadow-[0_0_0_1px_var(--ink)]' : 'border-line bg-surface-2/50 hover:border-line-strong hover:bg-surface',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{scenario.name}</span>
                <span className="shrink-0 text-[0.6875rem] font-semibold text-muted">
                  {scenario.strategy === 'custom' ? 'Custom' : scenario.strategy === 'none' ? 'As offered' : 'Auto'}
                </span>
              </div>
              <div className="mt-2 font-display-tight text-2xl font-semibold tnum" data-testid={`scenario-total-${scenario.id}`}>
                <AnimatedNumber value={result.recurring} format={plain} />
              </div>
              <div className={cn('mt-1 text-xs font-semibold tnum', result.remainingGap < -0.5 ? 'text-negative' : 'text-positive')}>
                {result.remainingGap < -0.5 ? `${fmt(-result.remainingGap)} below target` : Math.abs(result.remainingGap) <= 0.5 ? 'Reaches target' : `${fmt(result.remainingGap)} above target`}
              </div>
            </button>
          )
        })}
      </div>

      <div id="scenario-editor" role="tabpanel" className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <div>
            <Eyebrow className="mb-2">Quick actions</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {QUICK.map(({ kind, icon: Icon }) => (
                <Button
                  key={kind}
                  size="sm"
                  variant="secondary"
                  disabled={isCurrent}
                  onClick={() => applySolver(active.scenario.id, kind)}
                  data-testid={`solver-${kind}`}
                  title={isCurrent ? 'Select a counteroffer scenario to modify' : undefined}
                >
                  <Icon />
                  {SOLVER_LABELS[kind]}
                </Button>
              ))}
            </div>
            {isCurrent && <p className="mt-2 text-xs text-muted">“Current Offer” mirrors the recruiter’s offer. Select a counteroffer to adjust it.</p>}
          </div>

          <AnimatePresence initial={false} mode="wait">
            {note && !isCurrent && (
              <motion.div
                key={`${active.scenario.id}-${note.kind}-${note.summary}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-accent/25 bg-accent-soft/60 p-4"
                data-testid="solver-note"
              >
                <p className="flex items-start gap-2 text-sm font-semibold text-ink">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
                  {note.summary}
                </p>
                <ul className="mt-2 space-y-1 pl-6 text-xs text-ink-soft">
                  {note.changed.length > 0 && <li>Changed: {note.changed.map((c) => (c === 'signOn' ? 'sign-on' : c)).join(', ')}.</li>}
                  {note.constraints.map((c) => (
                    <li key={c} className="flex gap-1.5">
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-accent-ink" aria-hidden />
                      {c}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {SLIDERS.map(({ key, label, swatch }) => {
              const r = rangeFor(key)
              const v = Math.max(r.min, Math.min(r.max, adj[key]))
              return (
                <div key={key} className="min-w-0">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <span className={cn('size-2.5 shrink-0 rounded-full', swatch)} aria-hidden />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tnum" data-testid={`adj-${key}`}>
                      {key === 'signOn' ? fmt(adj[key]) : signed(adj[key])}
                    </span>
                  </div>
                  <Slider
                    value={[v]}
                    min={r.min}
                    max={r.max}
                    step={roundStep(scale)}
                    disabled={isCurrent}
                    onValueChange={([x]) => setScenarioAdjustment(active.scenario.id, key, x)}
                    thumbLabel={label}
                    rangeClassName={swatch}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl bg-ink p-5 text-white" data-testid="scenario-result">
            <div className="flex items-center justify-between gap-2">
              <input
                aria-label="Scenario name"
                value={active.scenario.name}
                onChange={(e) => updateScenario(active.scenario.id, { name: e.target.value.slice(0, 60) || active.scenario.name })}
                className="min-w-0 flex-1 rounded-md bg-transparent text-sm font-semibold text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              />
            </div>
            <div className="mt-2 font-display-tight text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-none tnum">
              <AnimatedNumber value={active.result.recurring} format={plain} testId="scenario-recurring" />
            </div>
            <p className="mt-1 text-xs text-white/60">recurring per year, gross</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-[0.8125rem]">
              <div>
                <dt className="text-white/60">Remaining gap</dt>
                <dd className="font-semibold tnum" data-testid="scenario-remaining-gap">
                  {signed(active.result.remainingGap)} <span className="font-normal text-white/60">({formatPct(active.result.remainingGapPct, { signed: true })})</span>
                </dd>
              </div>
              <div>
                <dt className="text-white/60">Guaranteed base</dt>
                <dd className="font-semibold tnum">{fmt(active.result.guaranteedAnnual)}</dd>
              </div>
              <div>
                <dt className="text-white/60">First year</dt>
                <dd className="font-semibold tnum" data-testid="scenario-first-year">{fmt(active.result.firstYear)}</dd>
              </div>
              <div>
                <dt className="text-white/60">Ongoing (yr 2+)</dt>
                <dd className="font-semibold tnum">{fmt(active.result.ongoing)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  saveToHistory(active.scenario.name, isCurrent ? '' : 'Counteroffer scenario', active.scenario.id)
                  toast(`Saved “${active.scenario.name}” to offer history`)
                }}
                data-testid="scenario-save"
              >
                <BookmarkPlus /> Save to history
              </Button>
              {!isCurrent && (
                <Button size="sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => resetScenario(active.scenario.id)} data-testid="scenario-reset">
                  <RotateCcw /> Reset
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-[0.8125rem] tnum" data-testid="scenario-compare">
              <caption className="sr-only">Before and after comparison of scenarios</caption>
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Scenario</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Base</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Year 1</th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Ongoing</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Gap</th>
                </tr>
              </thead>
              <tbody>
                {scenarioResults.map(({ scenario, result }) => (
                  <tr key={scenario.id} className={cn('border-t border-line', scenario.id === active.scenario.id && 'bg-accent-soft/40')}>
                    <th scope="row" className="max-w-[7rem] truncate px-3 sm:max-w-[9rem] py-2 text-left font-semibold">{scenario.name}</th>
                    <td className="px-3 py-2 text-right">{fmt(result.base)}</td>
                    <td className="px-3 py-2 text-right">{fmt(result.firstYear)}</td>
                    <td className="hidden px-3 py-2 text-right sm:table-cell">{fmt(result.ongoing)}</td>
                    <td className={cn('px-3 py-2 text-right font-semibold', result.remainingGap < -0.5 ? 'text-negative' : 'text-positive')}>{signed(result.remainingGap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  )
}
