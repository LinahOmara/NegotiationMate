import { useCallback, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, Keyboard, Save, X } from 'lucide-react'
import { useApp } from '@/state/store'
import { useDerived } from '@/lib/useDerived'
import { useMoney } from '@/lib/useMoney'
import { Logo } from '@/features/header/Logo'
import { CurrencySwitcher } from '@/features/header/CurrencySwitcher'
import { RateControl } from '@/features/header/RateControl'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { MoneyField } from '@/components/MoneyField'
import { NumberField } from '@/components/NumberField'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { DualMoney } from '@/components/Money'
import { InsightCard } from '@/features/guidance/InsightCard'
import { COMPONENT_META } from '@/lib/componentMeta'
import { COMPONENTS, type ComponentKey } from '@/domain/schema'
import { rebalance } from '@/calc/distribution'
import { formatPct, formatMoney, formatRate } from '@/lib/format'
import { SHORTCUTS } from './useShortcuts'
import { cn } from '@/lib/cn'

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn('card flex min-w-0 flex-col p-5', className)}>
      <Eyebrow className="mb-3 text-ink-soft">{title}</Eyebrow>
      {children}
    </section>
  )
}

function OfferInputs() {
  const offer = useApp((s) => s.offer)
  const locks = useApp((s) => s.ui.offerLocks)
  const { updateOffer, setOfferMode } = useApp.getState()
  const { offer: o } = useDerived()
  const { fmt } = useMoney()
  const d = offer.distribution
  const c = offer.components

  const setPct = (k: ComponentKey, v: number) => {
    const r = rebalance({ base: d.basePct, bonus: d.bonusPct, equity: d.equityPct }, k, v, locks)
    updateOffer((p) => ({ ...p, distribution: { ...p.distribution, basePct: r.pcts.base, bonusPct: r.pcts.bonus, equityPct: r.pcts.equity } }))
  }

  return (
    <Panel title="Recruiter offer">
      <Segmented
        size="md"
        className="mb-4 w-full"
        layoutId="focus-offer-mode"
        ariaLabel="Offer entry mode"
        value={offer.mode}
        onChange={setOfferMode}
        options={[
          { value: 'distribution', label: 'Total & split' },
          { value: 'components', label: 'By component' },
        ]}
      />
      {offer.mode === 'distribution' ? (
        <div className="space-y-4">
          <MoneyField
            size="lg"
            label="Total annual offer"
            value={d.total}
            onChange={(total) => updateOffer((p) => ({ ...p, distribution: { ...p.distribution, total } }))}
            testId="focus-offer-total"
          />
          <div className="grid grid-cols-3 gap-2">
            {COMPONENTS.map((k) => (
              <NumberField
                key={k}
                size="lg"
                label={`${COMPONENT_META[k].short} %`}
                value={d[`${k}Pct`]}
                onChange={(v) => setPct(k, v)}
                max={100}
                decimals={1}
                suffix="%"
                testId={`focus-offer-pct-${k}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <MoneyField
            size="lg"
            label="Base salary"
            value={c.base}
            onChange={(base) => updateOffer((p) => ({ ...p, components: { ...p.components, base } }))}
            testId="focus-offer-base"
          />
          {c.bonus.kind === 'fixed' ? (
            <MoneyField
              size="lg"
              label="Target bonus"
              value={c.bonus.fixed}
              onChange={(fixed) => updateOffer((p) => ({ ...p, components: { ...p.components, bonus: { ...p.components.bonus, fixed } } }))}
              testId="focus-offer-bonus"
            />
          ) : (
            <NumberField
              size="lg"
              label="Target bonus (% of base)"
              value={c.bonus.percentOfBase}
              onChange={(percentOfBase) => updateOffer((p) => ({ ...p, components: { ...p.components, bonus: { ...p.components.bonus, percentOfBase } } }))}
              max={500}
              suffix="%"
              hint={`= ${fmt(o.bonusTarget)} / yr`}
            />
          )}
          {c.equity.mode === 'simple' ? (
            <MoneyField
              size="lg"
              label="Equity (annualized)"
              value={c.equity.annualValue}
              onChange={(annualValue) => updateOffer((p) => ({ ...p, components: { ...p.components, equity: { ...p.components.equity, annualValue } } }))}
              testId="focus-offer-equity"
            />
          ) : (
            <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink-soft">
              Equity grant counted as <strong className="tnum">{fmt(o.equityAnnual)}</strong> / yr. Edit vesting details outside Focus Mode.
            </p>
          )}
        </div>
      )}
      <div className="mt-4 border-t border-line pt-4">
        <MoneyField
          size="lg"
          label="Sign-on bonus (one-time)"
          value={offer.signOn.amount}
          periodToggle={false}
          onChange={(amount) => updateOffer((p) => ({ ...p, signOn: { ...p.signOn, amount } }))}
          testId="focus-offer-signon"
        />
      </div>
      <TargetQuickEdit />
    </Panel>
  )
}

function TargetQuickEdit() {
  const target = useApp((s) => s.target)
  const updateTarget = useApp((s) => s.updateTarget)
  const { target: t } = useDerived()
  const { fmt } = useMoney()
  return (
    <div className="mt-4 border-t border-line pt-4">
      {target.mode === 'distribution' ? (
        <MoneyField
          size="lg"
          label="Your target total"
          value={target.distribution.total}
          onChange={(total) => updateTarget((p) => ({ ...p, distribution: { ...p.distribution, total } }))}
          testId="focus-target-total"
          hint={`Split ${target.distribution.basePct}/${target.distribution.bonusPct}/${target.distribution.equityPct} — base/bonus/equity.`}
        />
      ) : (
        <p className="text-sm text-ink-soft">
          Your target: <strong className="tnum">{fmt(t.recurring)}</strong> (edit components outside Focus Mode).
        </p>
      )}
    </div>
  )
}

function LiveNumbers() {
  const { target, offer, comparison: c } = useDerived()
  const { fmt, primary, rate } = useMoney()
  const reduce = useReducedMotion()
  const signed = useCallback((v: number) => fmt(v, primary, { signed: true }), [fmt, primary])
  const below = c.totalGap < -0.5
  const reach = c.reachPct === null ? 0 : Math.max(0, Math.min(100, c.reachPct))
  const parts = COMPONENTS.map((k) => ({ k, v: offer.components[k] }))
  const total = Math.max(offer.recurring, 1)

  return (
    <Panel title="Live gap" className={cn(below ? 'border-negative/25' : 'border-positive/25')}>
      <div className={cn('flex flex-wrap items-center gap-3', below ? 'text-negative' : 'text-positive')}>
        {below ? <ArrowDownRight className="size-9" aria-hidden /> : <ArrowUpRight className="size-9" aria-hidden />}
        <AnimatedNumber
          value={c.totalGap}
          format={signed}
          testId="focus-gap"
          className="font-display-tight text-[clamp(2.5rem,4.6vw,4rem)] font-semibold leading-none"
        />
      </div>
      <p className="mt-2 text-base font-semibold">
        {formatPct(c.totalGapPct, { signed: true })} <span className="font-medium text-muted">{below ? 'below your target' : 'vs your target'} · per year</span>
      </p>
      <div className="mt-4">
        <p className="text-sm font-semibold" data-testid="focus-reach">
          {c.reachPct === null ? 'Enter a target to compare' : `Offer reaches ${Math.round(c.reachPct)}% of your target.`}
        </p>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-surface-3"
          role="meter"
          aria-label="Offer as a share of target"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(reach)}
        >
          <motion.div
            className={cn('h-full rounded-full', below ? 'bg-negative' : 'bg-positive')}
            initial={false}
            animate={{ width: `${reach}%` }}
            transition={{ duration: reduce ? 0 : 0.3 }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-2xl bg-surface-2 p-3.5">
          <p className="text-xs font-semibold text-muted">Your target</p>
          <DualMoney
            usd={target.recurring}
            testId="focus-target"
            primaryClassName="font-display-tight text-2xl font-semibold"
            secondaryClassName="text-xs font-semibold"
          />
        </div>
        <div className="min-w-0 rounded-2xl bg-surface-2 p-3.5">
          <p className="text-xs font-semibold text-muted">Offer</p>
          <DualMoney
            usd={offer.recurring}
            testId="focus-offer"
            primaryClassName="font-display-tight text-2xl font-semibold"
            secondaryClassName="text-xs font-semibold"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold">Guaranteed vs variable</span>
          <span className="text-xs text-muted tnum">{formatPct(offer.variablePct, { decimals: 0 })} variable</span>
        </div>
        <div className="flex h-4 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          {parts.map(({ k, v }) => (
            <motion.div
              key={k}
              className={COMPONENT_META[k].swatch}
              initial={false}
              animate={{ width: `${(v / total) * 100}%` }}
              transition={{ duration: reduce ? 0 : 0.3 }}
            />
          ))}
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
          {parts.map(({ k, v }) => (
            <div key={k} className="min-w-0">
              <dt className="flex items-center gap-1 text-muted">
                <span className={cn('size-2 rounded-full', COMPONENT_META[k].swatch)} />
                {COMPONENT_META[k].short}
              </dt>
              <dd className="truncate font-semibold tnum">{fmt(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 rounded-xl border border-line px-3 py-2 text-sm">
          Base gap{' '}
          <strong className={cn('tnum', c.baseGap < -0.5 ? 'text-negative' : 'text-positive')}>{fmt(c.monthlyBaseGap, primary, { signed: true })}</strong>{' '}
          <span className="text-muted">per month (guaranteed)</span>
        </p>
      </div>

      <p className="pt-4 text-xs text-muted tnum" data-testid="focus-fx">
        At your {formatRate(rate)} EGP/USD assumption: offer = {formatMoney(offer.recurring, 'USD')} = {formatMoney(offer.recurring * rate, 'EGP')} / yr ·{' '}
        {formatMoney((offer.recurring * rate) / 12, 'EGP')} / mo
      </p>
    </Panel>
  )
}

function TopInsights() {
  const { guidance } = useDerived()
  return (
    <Panel title="Top insights">
      <div className="space-y-3" data-testid="focus-insights">
        {guidance.slice(0, 2).map((g, i) => (
          <InsightCard key={g.id} insight={g} index={i} />
        ))}
        {guidance.length === 0 && <p className="text-sm text-muted">Enter an offer to see insights.</p>}
      </div>
    </Panel>
  )
}

function Counteroffer() {
  const { scenarioResults, active } = useDerived()
  const setActive = useApp((s) => s.setActiveScenario)
  const { fmt, primary } = useMoney()
  const a = active.result.adjustments
  const asks = (
    [
      ['Base', a.base],
      ['Bonus', a.bonus],
      ['Equity', a.equity],
      ['Sign-on', a.signOn],
    ] as const
  ).filter(([, v]) => Math.abs(v) >= 0.5)

  return (
    <Panel title="Current counteroffer">
      <Segmented
        size="md"
        className="mb-3 w-full"
        layoutId="focus-scenario"
        ariaLabel="Scenario"
        value={active.scenario.id}
        onChange={setActive}
        options={scenarioResults.map((s, i) => ({
          value: s.scenario.id,
          label: s.scenario.name.replace(' Counteroffer', '').replace('Current Offer', 'Current'),
          title: `${s.scenario.name} (${i + 1})`,
        }))}
      />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display-tight text-3xl font-semibold tnum" data-testid="focus-counter-total">
          {fmt(active.result.recurring)}
        </span>
        <span className={cn('text-sm font-semibold tnum', active.result.remainingGap < -0.5 ? 'text-negative' : 'text-positive')}>
          {Math.abs(active.result.remainingGap) <= 0.5 ? 'Reaches target' : `${fmt(active.result.remainingGap, primary, { signed: true })} gap`}
        </span>
      </div>
      {asks.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {asks.map(([label, v]) => (
            <li key={label} className="rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-semibold tnum">
              {label} {fmt(v, primary, { signed: true })}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">No changes from the offer.</p>
      )}
      <p className="mt-2 text-xs text-muted">
        Year one {fmt(active.result.firstYear)} · ongoing {fmt(active.result.ongoing)}. A request, not a likely outcome.
      </p>
    </Panel>
  )
}

export function FocusMode({ onSave }: { onSave: () => void }) {
  const setFocusMode = useApp((s) => s.setFocusMode)
  const [help, setHelp] = useState(false)
  return (
    <div className="min-h-dvh bg-canvas" data-testid="focus-mode">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Logo className="size-8 shrink-0" />
            <span className="truncate font-display-tight text-lg font-semibold">Focus Mode</span>
            <span className="hidden items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-ink sm:inline-flex">
              <span className="size-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none" aria-hidden /> Live call
            </span>
          </div>
          <div className="order-3 flex w-full flex-wrap items-center gap-2 lg:order-2 lg:w-auto">
            <CurrencySwitcher layoutId="focus-display-currency" />
            <RateControl />
          </div>
          <div className="order-2 flex items-center gap-1.5 lg:order-3">
            <Button variant="ghost" size="icon" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
              <Keyboard />
            </Button>
            <Button variant="outline" onClick={onSave} aria-keyshortcuts="S" data-testid="focus-save">
              <Save />
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button variant="primary" onClick={() => setFocusMode(false)} aria-keyshortcuts="Escape" data-testid="focus-exit">
              <X />
              Exit <kbd className="hidden rounded bg-white/15 px-1.5 text-[0.6875rem] sm:inline">Esc</kbd>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-[110rem] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0 lg:order-2 xl:order-1">
          <OfferInputs />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:order-1 xl:order-2">
          <LiveNumbers />
          <Counteroffer />
        </div>
        <div className="min-w-0 lg:order-3 lg:col-span-2 xl:col-span-1">
          <TopInsights />
        </div>
      </main>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent title="Keyboard shortcuts" description="Shortcuts are ignored while you type in a field.">
          <dl className="divide-y divide-line">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <dt className="text-ink-soft">{s.action}</dt>
                <dd>
                  <kbd className="rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-xs font-semibold">{s.keys}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  )
}
