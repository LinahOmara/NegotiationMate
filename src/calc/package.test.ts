import { describe, expect, it } from 'vitest'
import { evaluatePackage, evaluateOffer, compareToTarget } from './package'
import { money } from './money'
import { emptyComponents, emptyOffer, emptyPackage } from '@/domain/factories'
import type { OfferInput, PackageInput } from '@/domain/schema'

const rate = 53

function distribution(total: number, b: number, bo: number, e: number): PackageInput {
  const p = emptyPackage()
  return { ...p, mode: 'distribution', distribution: { total: money(total, 'USD'), basePct: b, bonusPct: bo, equityPct: e } }
}

describe('evaluatePackage — distribution mode', () => {
  it('splits the seeded target $70,900 into 85/10/5', () => {
    const r = evaluatePackage(distribution(70900, 85, 10, 5), rate)
    expect(r.base).toBeCloseTo(60265, 8)
    expect(r.bonusTarget).toBeCloseTo(7090, 8)
    expect(r.equityAnnual).toBeCloseTo(3545, 8)
    expect(r.recurring).toBeCloseTo(70900, 8)
    expect(r.monthly).toBeCloseTo(5908.3333, 3)
  })
  it('normalizes percentages that do not add up to 100 so totals stay consistent', () => {
    const r = evaluatePackage(distribution(1000, 50, 50, 50), rate)
    expect(r.recurring).toBeCloseTo(1000, 8)
    expect(r.base).toBeCloseTo(333.3333, 3)
  })
  it('all-zero percentages put everything in base rather than losing value', () => {
    const r = evaluatePackage(distribution(1000, 0, 0, 0), rate)
    expect(r.base).toBe(1000)
  })
  it('monthly totals are annualized', () => {
    const p = distribution(0, 100, 0, 0)
    p.distribution.total = money(5000, 'USD', 'monthly')
    expect(evaluatePackage(p, rate).recurring).toBe(60000)
  })
})

describe('evaluatePackage — components mode', () => {
  it('Case 5: 60k base + 6k bonus + 4k equity = 70k, guaranteed base 60k', () => {
    const p = emptyPackage()
    p.mode = 'components'
    p.components = emptyComponents()
    p.components.base = money(60000, 'USD')
    p.components.bonus = { ...p.components.bonus, kind: 'fixed', fixed: money(6000, 'USD') }
    p.components.equity = { ...p.components.equity, mode: 'simple', annualValue: money(4000, 'USD') }
    const r = evaluatePackage(p, rate)
    expect(r.recurring).toBe(70000)
    expect(r.guaranteedAnnual).toBe(60000)
    expect(r.guaranteedMonthly).toBe(5000)
    expect(r.variable).toBe(10000)
    expect(r.variablePct).toBeCloseTo(14.2857, 3)
    expect(r.mixPct.base).toBeCloseTo(85.714, 2)
  })
  it('mixes currencies through the canonical conversion', () => {
    const p = emptyPackage()
    p.mode = 'components'
    p.components.base = money(265000, 'EGP', 'monthly')
    const r = evaluatePackage(p, 60)
    expect(r.base).toBeCloseTo(53000, 8)
  })
  it('a four-year grant contributes only its annualized value', () => {
    const p = emptyPackage()
    p.mode = 'components'
    p.components.base = money(50000, 'USD')
    p.components.equity = { ...p.components.equity, mode: 'advanced', grantValue: money(20000, 'USD'), vestingYears: 4 }
    expect(evaluatePackage(p, rate).recurring).toBe(55000)
  })
  it('never produces negative components', () => {
    const p = emptyPackage()
    p.mode = 'components'
    p.components.base = money(-5, 'USD')
    const r = evaluatePackage(p, rate)
    expect(r.base).toBe(0)
    expect(r.variablePct).toBeNull()
    expect(Number.isFinite(r.recurring)).toBe(true)
  })
})

describe('evaluateOffer — first year vs recurring', () => {
  function offerWithSignOn(signOn: number, payment: 'yearOne' | 'split' = 'yearOne', yearOnePct = 100): OfferInput {
    const o = emptyOffer()
    o.mode = 'components'
    o.components.base = money(50000, 'USD')
    o.signOn = { amount: money(signOn, 'USD'), payment, yearOnePct, clawbackMonths: 12 }
    return o
  }
  it('Case 6: $50k + $10k sign-on → year one $60k, later years $50k', () => {
    const r = evaluateOffer(offerWithSignOn(10000), rate)
    expect(r.recurring).toBe(50000)
    expect(r.firstYear).toBe(60000)
    expect(r.ongoing).toBe(50000)
    expect(r.signOnYearOne).toBe(10000)
  })
  it('a split sign-on spreads across two years', () => {
    const r = evaluateOffer(offerWithSignOn(10000, 'split', 60), rate)
    expect(r.firstYear).toBe(56000)
    expect(r.yearTwo).toBe(54000)
    expect(r.ongoing).toBe(50000)
  })
  it('a vesting cliff past year one lowers year-one compensation', () => {
    const o = offerWithSignOn(0)
    o.components.equity = { ...o.components.equity, mode: 'advanced', grantValue: money(20000, 'USD'), firstVestMonths: 18 }
    const r = evaluateOffer(o, rate)
    expect(r.recurring).toBe(55000)
    expect(r.firstYear).toBe(50000)
  })
  it('guaranteed first-year bonus counts as guaranteed cash in year one only', () => {
    const o = offerWithSignOn(0)
    o.components.bonus = { ...o.components.bonus, kind: 'percentOfBase', percentOfBase: 10, guaranteedFirstYear: true }
    const r = evaluateOffer(o, rate)
    expect(r.guaranteedFirstYear).toBe(55000)
    expect(r.guaranteedAnnual).toBe(50000)
  })
  it('reports how much of the offer is fixed in EGP (FX exposure)', () => {
    const o = offerWithSignOn(0)
    o.components.base = money(2650000, 'EGP')
    o.components.bonus = { ...o.components.bonus, kind: 'fixed', fixed: money(5000, 'USD') }
    const r = evaluateOffer(o, rate)
    expect(r.egpFixedShare).toBeCloseTo((50000 / 55000) * 100, 6)
  })
})

describe('compareToTarget', () => {
  it('Case 1: $49,000 vs $70,900 → −$21,900, ≈ −30.89%', () => {
    const t = evaluatePackage(distribution(70900, 85, 10, 5), rate)
    const o = evaluateOffer({ ...emptyOffer(), ...distribution(49000, 80, 10, 10) }, rate)
    const c = compareToTarget(o, t)
    expect(c.totalGap).toBeCloseTo(-21900, 8)
    expect(c.totalGapPct).toBeCloseTo(-30.888, 2)
    expect(c.reachPct).toBeCloseTo(69.11, 1)
    expect(c.baseGap).toBeCloseTo(49000 * 0.8 - 70900 * 0.85, 8)
    expect(c.monthlyBaseGap).toBeCloseTo(c.baseGap / 12, 8)
    expect(c.componentGaps.equity).toBeCloseTo(4900 - 3545, 8)
  })
  it('handles a zero target without dividing by zero', () => {
    const t = evaluatePackage(distribution(0, 85, 10, 5), rate)
    const o = evaluateOffer({ ...emptyOffer(), ...distribution(49000, 80, 10, 10) }, rate)
    const c = compareToTarget(o, t)
    expect(c.totalGapPct).toBeNull()
    expect(c.reachPct).toBeNull()
    expect(c.totalGap).toBe(49000)
  })
})
