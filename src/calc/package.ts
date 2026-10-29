import type { ComponentKey, Currency, OfferInput, PackageInput } from '@/domain/schema'
import { evaluateBonus, type BonusResult } from './bonus'
import { evaluateEquity, type EquityResult } from './equity'
import { D, DecimalCtx, annualInD, gapPercent, lumpInD, num, sharePercent, type Dec } from './money'

export type ComponentValues = Record<ComponentKey, number>

export interface PackageResult {
  currency: Currency
  rate: number
  base: number
  bonusTarget: number
  bonusExpected: number
  equityAnnual: number
  /** Recurring annual total: base + target bonus + annualized equity (initial grant value). Gross. */
  recurring: number
  monthly: number
  /** Guaranteed cash: base salary only. */
  guaranteedAnnual: number
  guaranteedMonthly: number
  /** Bonus + equity: not guaranteed. */
  variable: number
  variablePct: number | null
  components: ComponentValues
  mixPct: Record<ComponentKey, number | null>
  /** Bonus as % of base when the bonus is defined that way; scales with base in counteroffers. */
  bonusPctOfBase: number | null
  bonus: BonusResult | null
  equity: EquityResult | null
  /** Share of recurring value that is contractually fixed in EGP. */
  egpFixedShare: number | null
}

export interface OfferResult extends PackageResult {
  signOnTotal: number
  signOnYearOne: number
  signOnYearTwo: number
  /** Year-one: base + year-one bonus + equity vesting in year one + sign-on paid in year one. */
  firstYear: number
  yearTwo: number
  /** Steady state (year three+), excluding one-time payments and refresh assumptions. */
  ongoing: number
  /** Guaranteed cash in year one: base + guaranteed bonus + sign-on (subject to clawback). */
  guaranteedFirstYear: number
}

const zero = () => new DecimalCtx(0)

function normalizedShares(b: number, bo: number, e: number): [Dec, Dec, Dec] {
  const parts = [D(Math.max(0, b)), D(Math.max(0, bo)), D(Math.max(0, e))]
  const sum = parts[0].plus(parts[1]).plus(parts[2])
  if (sum.isZero()) return [D(1), zero(), zero()]
  return parts.map((p) => p.div(sum)) as [Dec, Dec, Dec]
}

function finish(
  currency: Currency,
  rate: number,
  base: Dec,
  bonusTarget: Dec,
  bonusExpected: Dec,
  equity: Dec,
  egpFixed: Dec,
  extra: Pick<PackageResult, 'bonus' | 'equity' | 'bonusPctOfBase'>,
): PackageResult {
  const recurring = base.plus(bonusTarget).plus(equity)
  const r = num(recurring)
  const variable = bonusTarget.plus(equity)
  return {
    currency,
    rate,
    base: num(base),
    bonusTarget: num(bonusTarget),
    bonusExpected: num(bonusExpected),
    equityAnnual: num(equity),
    recurring: r,
    monthly: num(recurring.div(12)),
    guaranteedAnnual: num(base),
    guaranteedMonthly: num(base.div(12)),
    variable: num(variable),
    variablePct: sharePercent(num(variable), r),
    components: { base: num(base), bonus: num(bonusTarget), equity: num(equity) },
    mixPct: {
      base: sharePercent(num(base), r),
      bonus: sharePercent(num(bonusTarget), r),
      equity: sharePercent(num(equity), r),
    },
    egpFixedShare: sharePercent(num(egpFixed), r),
    ...extra,
  }
}

/**
 * Evaluate a target or offer package. Results are annual amounts in
 * `currency` (USD by default — the canonical reporting currency) at `rate`.
 */
export function evaluatePackage(pkg: PackageInput, rate: number, currency: Currency = 'USD'): PackageResult {
  if (pkg.mode === 'distribution') {
    const d = pkg.distribution
    const total = annualInD(d.total, currency, rate)
    const [sb, sbo, se] = normalizedShares(d.basePct, d.bonusPct, d.equityPct)
    const base = total.times(sb)
    const bonus = total.times(sbo)
    const equity = total.times(se)
    const egpFixed = d.total.currency === 'EGP' ? total : zero()
    return finish(currency, rate, base, bonus, bonus, equity, egpFixed, { bonus: null, equity: null, bonusPctOfBase: null })
  }

  const c = pkg.components
  const base = annualInD(c.base, currency, rate)
  const bonus = evaluateBonus(c.bonus, num(base), currency, rate)
  const equity = evaluateEquity(c.equity, currency, rate)

  let egpFixed = zero()
  if (c.base.currency === 'EGP') egpFixed = egpFixed.plus(base)
  if (c.bonus.kind === 'fixed' ? c.bonus.fixed.currency === 'EGP' : c.base.currency === 'EGP') egpFixed = egpFixed.plus(D(bonus.target))
  const equitySource = c.equity.mode === 'simple' ? c.equity.annualValue : c.equity.grantValue
  if (equitySource.currency === 'EGP') egpFixed = egpFixed.plus(D(equity.annualized))

  return finish(currency, rate, base, D(bonus.target), D(bonus.expected), D(equity.annualized), egpFixed, {
    bonus,
    equity,
    bonusPctOfBase: c.bonus.kind === 'percentOfBase' ? c.bonus.percentOfBase : null,
  })
}

export function evaluateOffer(offer: OfferInput, rate: number, currency: Currency = 'USD'): OfferResult {
  const p = evaluatePackage(offer, rate, currency)
  const s = offer.signOn
  const signOnTotal = lumpInD(s.amount, currency, rate)
  const y1Share = s.payment === 'yearOne' ? D(1) : D(Math.min(100, Math.max(0, s.yearOnePct))).div(100)
  const signOnYearOne = signOnTotal.times(y1Share)
  const signOnYearTwo = signOnTotal.minus(signOnYearOne)

  const equityY1 = D(p.equity ? p.equity.yearOne : p.equityAnnual)
  const equityY2 = D(p.equity ? (p.equity.byYear[1] ?? 0) : p.equityAnnual)
  const base = D(p.base)
  const bonusY1 = D(p.bonus ? p.bonus.yearOne : p.bonusTarget)
  const bonusTarget = D(p.bonusTarget)
  const refresh = D(p.equity?.refreshAnnual ?? 0)

  const firstYear = base.plus(bonusY1).plus(equityY1).plus(signOnYearOne)
  const yearTwo = base.plus(bonusTarget).plus(equityY2).plus(signOnYearTwo).plus(refresh)

  return {
    ...p,
    signOnTotal: num(signOnTotal),
    signOnYearOne: num(signOnYearOne),
    signOnYearTwo: num(signOnYearTwo),
    firstYear: num(firstYear),
    yearTwo: num(yearTwo),
    ongoing: p.recurring,
    guaranteedFirstYear: num(base.plus(D(p.bonus?.guaranteedYearOne ?? 0)).plus(signOnYearOne)),
  }
}

export interface Comparison {
  totalGap: number
  totalGapPct: number | null
  /** Offer as % of target. Not a probability of anything. */
  reachPct: number | null
  baseGap: number
  monthlyBaseGap: number
  monthlyGap: number
  componentGaps: ComponentValues
  /** Year-one offer vs target recurring. */
  firstYearGap: number
  largestShortfall: { key: ComponentKey; gap: number } | null
}

export function compareToTarget(offer: OfferResult, target: PackageResult): Comparison {
  const gap = (a: number, b: number) => num(D(a).minus(D(b)))
  const componentGaps: ComponentValues = {
    base: gap(offer.base, target.base),
    bonus: gap(offer.bonusTarget, target.bonusTarget),
    equity: gap(offer.equityAnnual, target.equityAnnual),
  }
  const shortfalls = (Object.entries(componentGaps) as [ComponentKey, number][])
    .filter(([, g]) => g < 0)
    .sort((a, b) => a[1] - b[1])
  const pct = gapPercent(offer.recurring, target.recurring)
  return {
    totalGap: gap(offer.recurring, target.recurring),
    totalGapPct: pct,
    reachPct: pct === null ? null : num(D(pct).plus(100)),
    baseGap: componentGaps.base,
    monthlyBaseGap: num(D(componentGaps.base).div(12)),
    monthlyGap: num(D(offer.recurring).minus(D(target.recurring)).div(12)),
    componentGaps,
    firstYearGap: gap(offer.firstYear, target.recurring),
    largestShortfall: shortfalls.length ? { key: shortfalls[0][0], gap: shortfalls[0][1] } : null,
  }
}
