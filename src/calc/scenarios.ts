import type { Adjustments, ComponentKey, Scenario } from '@/domain/schema'
import { zeroAdjustments } from '@/domain/factories'
import { D, DecimalCtx, num, type Dec } from './money'
import type { OfferResult, PackageResult } from './package'

/** A counteroffer evaluated on top of the current offer. Annual USD. */
export interface ScenarioResult {
  adjustments: Adjustments
  base: number
  bonus: number
  equity: number
  signOn: number
  recurring: number
  firstYear: number
  ongoing: number
  guaranteedAnnual: number
  remainingGap: number
  remainingGapPct: number | null
  firstYearGap: number
}

const zero = () => new DecimalCtx(0)
const maxZero = (d: Dec) => (d.isNegative() ? zero() : d)

/** Bonus adjustment implied by a base change when the bonus is % of base. */
function impliedBonus(offer: PackageResult, baseIncrease: Dec): Dec {
  return offer.bonusPctOfBase === null ? zero() : baseIncrease.times(D(offer.bonusPctOfBase)).div(100)
}

export function applyAdjustments(offer: OfferResult, adj: Adjustments, target: PackageResult): ScenarioResult {
  const base = maxZero(D(offer.base).plus(D(adj.base)))
  const realBaseChange = base.minus(D(offer.base))
  const bonus = maxZero(D(offer.bonusTarget).plus(impliedBonus(offer, realBaseChange)).plus(D(adj.bonus)))
  const equity = maxZero(D(offer.equityAnnual).plus(D(adj.equity)))
  const signOn = maxZero(D(adj.signOn))
  const recurring = base.plus(bonus).plus(equity)

  const delta = recurring.minus(D(offer.recurring))
  // Equity changes vest like the existing grant: none in year one if the cliff is past it.
  const equityDelta = equity.minus(D(offer.equityAnnual))
  const y1EquityFactor = offer.equityAnnual > 0 ? D(offer.equity ? offer.equity.yearOne : offer.equityAnnual).div(D(offer.equityAnnual)) : D(1)
  const firstYear = D(offer.firstYear).plus(delta).minus(equityDelta).plus(equityDelta.times(y1EquityFactor)).plus(signOn)

  const gap = recurring.minus(D(target.recurring))
  return {
    adjustments: adj,
    base: num(base),
    bonus: num(bonus),
    equity: num(equity),
    signOn: num(signOn),
    recurring: num(recurring),
    firstYear: num(maxZero(firstYear)),
    ongoing: num(recurring),
    guaranteedAnnual: num(base),
    remainingGap: num(gap),
    remainingGapPct: target.recurring > 0 ? num(gap.div(D(target.recurring)).times(100)) : null,
    firstYearGap: num(maxZero(firstYear).minus(D(target.recurring))),
  }
}

export type SolverKind = 'closeGap' | 'baseFirst' | 'equityOnly' | 'signOn' | 'matchMix'

export interface SolverResult {
  kind: SolverKind
  adjustments: Adjustments
  changed: (ComponentKey | 'signOn')[]
  summary: string
  constraints: string[]
}

export const SOLVER_LABELS: Record<SolverKind, string> = {
  closeGap: 'Close the total gap',
  baseFirst: 'Prioritize guaranteed base',
  equityOnly: 'Keep base, increase equity',
  signOn: 'Add a first-year sign-on',
  matchMix: 'Match target total and mix',
}

const NO_APPROVAL = 'This models a request, not a likely outcome.'

function changedKeys(a: Adjustments): SolverResult['changed'] {
  return (['base', 'bonus', 'equity', 'signOn'] as const).filter((k) => Math.abs(a[k]) > 1e-9)
}

export function solve(kind: SolverKind, offer: OfferResult, target: PackageResult): SolverResult {
  const gap = D(target.recurring).minus(D(offer.recurring)) // positive = shortfall
  const p = offer.bonusPctOfBase === null ? zero() : D(offer.bonusPctOfBase).div(100)
  const result = (adjustments: Adjustments, summary: string, constraints: string[]): SolverResult => ({
    kind,
    adjustments,
    changed: changedKeys(adjustments),
    summary,
    constraints: [...constraints, NO_APPROVAL],
  })

  if (kind !== 'matchMix' && kind !== 'signOn' && !gap.isPositive()) {
    return result(zeroAdjustments(), 'The offer already meets or exceeds your target total, so nothing was changed.', ['All components left as offered.'])
  }

  switch (kind) {
    case 'closeGap': {
      const t = { base: D(target.base), bonus: D(target.bonusTarget), equity: D(target.equityAnnual) }
      const o = { base: D(offer.base), bonus: D(offer.bonusTarget), equity: D(offer.equityAnnual) }
      const short = { base: maxZero(t.base.minus(o.base)), bonus: maxZero(t.bonus.minus(o.bonus)), equity: maxZero(t.equity.minus(o.equity)) }
      const totalShort = short.base.plus(short.bonus).plus(short.equity)
      const share = (k: ComponentKey) => (totalShort.isZero() ? zero() : gap.times(short[k]).div(totalShort))
      const want = { base: share('base'), bonus: share('bonus'), equity: share('equity') }
      let xb = want.base
      let xbo = want.bonus.minus(xb.times(p))
      if (xbo.isNegative()) {
        xbo = zero()
        xb = gap.minus(want.equity).div(D(1).plus(p))
      }
      const adj = { base: num(xb), bonus: num(xbo), equity: num(want.equity), signOn: 0 }
      return result(
        adj,
        'Raises each component that is below your target, in proportion to its shortfall, until the total gap is closed.',
        ['No component is raised above your target for it.', 'Components already at or above target are unchanged.'],
      )
    }
    case 'baseFirst': {
      const xb = gap.div(D(1).plus(p))
      return result(
        { base: num(xb), bonus: 0, equity: 0, signOn: 0 },
        'Puts the entire gap into guaranteed base salary.',
        p.isZero() ? ['Bonus and equity unchanged.'] : ['Equity unchanged.', 'Bonus rises automatically because it is a % of base.'],
      )
    }
    case 'equityOnly':
      return result(
        { base: 0, bonus: 0, equity: num(gap), signOn: 0 },
        'Keeps base salary as offered and closes the gap with additional annualized equity.',
        ['Base salary and bonus unchanged.', 'Equity is not guaranteed cash and its value at vesting can differ.'],
      )
    case 'signOn': {
      const fyGap = maxZero(D(target.recurring).minus(D(offer.firstYear)))
      return result(
        { base: 0, bonus: 0, equity: 0, signOn: num(fyGap) },
        fyGap.isZero()
          ? 'Year-one compensation already reaches your target, so no sign-on bonus is needed.'
          : 'Adds a one-time sign-on bonus that closes the year-one gap only.',
        ['Recurring compensation unchanged — the ongoing gap remains from year two.', 'Sign-on bonuses are one-time and often carry repayment conditions.'],
      )
    }
    case 'matchMix': {
      const xb = D(target.base).minus(D(offer.base))
      const xbo = D(target.bonusTarget).minus(D(offer.bonusTarget)).minus(xb.times(p))
      const xe = D(target.equityAnnual).minus(D(offer.equityAnnual))
      return result(
        { base: num(xb), bonus: num(xbo), equity: num(xe), signOn: 0 },
        'Reshapes the offer so each component matches your target, landing exactly on your target total.',
        ['Components above your target are reduced to it.', 'Total equals your target total.'],
      )
    }
  }
}

export function resolveScenario(scenario: Scenario, offer: OfferResult, target: PackageResult): { adjustments: Adjustments; solver: SolverResult | null } {
  switch (scenario.strategy) {
    case 'none':
      return { adjustments: zeroAdjustments(), solver: null }
    case 'balanced': {
      const s = solve('closeGap', offer, target)
      return { adjustments: s.adjustments, solver: s }
    }
    case 'baseFirst': {
      const s = solve('baseFirst', offer, target)
      return { adjustments: s.adjustments, solver: s }
    }
    case 'custom':
      return { adjustments: scenario.adjustments, solver: null }
  }
}
