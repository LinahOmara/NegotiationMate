import { describe, expect, it } from 'vitest'
import { evaluateEquity, vestingTranches } from './equity'
import { money } from './money'
import type { EquityInput } from '@/domain/schema'

const base: EquityInput = {
  mode: 'advanced',
  annualValue: money(0, 'USD'),
  grantValue: money(20000, 'USD'),
  vestingYears: 4,
  schedule: 'annual',
  customYearPcts: [],
  firstVestMonths: 12,
  annualPriceChangePct: 0,
  includeRefresh: false,
  refreshAnnualValue: money(0, 'USD'),
}

describe('vestingTranches', () => {
  it('splits equally for annual vesting', () => {
    const t = vestingTranches(base)
    expect(t.map((x) => x.month)).toEqual([12, 24, 36, 48])
    expect(t.reduce((s, x) => s + x.fraction, 0)).toBeCloseTo(1, 12)
  })
  it('accumulates quarterly tranches at the cliff', () => {
    const t = vestingTranches({ ...base, schedule: 'quarterly' })
    expect(t).toHaveLength(16)
    const atCliff = t.filter((x) => x.month === 12)
    expect(atCliff.reduce((s, x) => s + x.fraction, 0)).toBeCloseTo(0.25, 12)
    expect(t.every((x) => x.month >= 12)).toBe(true)
  })
  it('quarterly without a cliff starts vesting at month 3', () => {
    const t = vestingTranches({ ...base, schedule: 'quarterly', firstVestMonths: 3 })
    expect(t[0].month).toBe(3)
  })
  it('custom schedule normalizes to the given percentages', () => {
    const t = vestingTranches({ ...base, schedule: 'custom', customYearPcts: [10, 20, 30, 40] })
    expect(t.map((x) => x.fraction)).toEqual([0.1, 0.2, 0.3, 0.4])
  })
  it('custom schedule that does not sum to 100 is normalized proportionally', () => {
    const t = vestingTranches({ ...base, schedule: 'custom', customYearPcts: [1, 1, 1, 1] })
    expect(t.map((x) => x.fraction)).toEqual([0.25, 0.25, 0.25, 0.25])
  })
  it('custom schedule with all zeros falls back to equal vesting', () => {
    const t = vestingTranches({ ...base, schedule: 'custom', customYearPcts: [0, 0, 0, 0] })
    expect(t.map((x) => x.fraction)).toEqual([0.25, 0.25, 0.25, 0.25])
  })
})

describe('evaluateEquity', () => {
  it('Case 4: $20,000 over four years annualizes to $5,000, not $20,000', () => {
    const e = evaluateEquity(base, 'USD', 53)
    expect(e.annualized).toBe(5000)
    expect(e.grantValue).toBe(20000)
    expect(e.yearOne).toBe(5000)
    expect(e.byYear).toEqual([5000, 5000, 5000, 5000])
  })
  it('simple mode uses the annualized value directly', () => {
    const e = evaluateEquity({ ...base, mode: 'simple', annualValue: money(4000, 'USD') }, 'USD', 53)
    expect(e.annualized).toBe(4000)
    expect(e.yearOne).toBe(4000)
    expect(e.grantValue).toBeNull()
  })
  it('a cliff beyond 12 months means nothing vests in year one', () => {
    const e = evaluateEquity({ ...base, firstVestMonths: 18 }, 'USD', 53)
    expect(e.yearOne).toBe(0)
    expect(e.byYear[1]).toBe(5000 + 5000)
  })
  it('distinguishes grant value from projected value at vesting', () => {
    const e = evaluateEquity({ ...base, annualPriceChangePct: 10 }, 'USD', 53)
    expect(e.annualized).toBe(5000) // initial grant value is unchanged
    expect(e.projectedByYear[0]).toBeCloseTo(5500, 6)
    expect(e.projectedByYear[3]).toBeCloseTo(5000 * 1.1 ** 4, 6)
    expect(e.projectedTotal).toBeGreaterThan(20000)
  })
  it('projects declines too', () => {
    const e = evaluateEquity({ ...base, annualPriceChangePct: -20 }, 'USD', 53)
    expect(e.projectedByYear[0]).toBeCloseTo(4000, 6)
  })
  it('converts grants denominated in another currency', () => {
    const e = evaluateEquity({ ...base, grantValue: money(1060000, 'EGP') }, 'USD', 53)
    expect(e.annualized).toBeCloseTo(5000, 8)
  })
  it('ignores refresh grants unless explicitly included', () => {
    const r = { ...base, refreshAnnualValue: money(3000, 'USD') }
    expect(evaluateEquity(r, 'USD', 53).refreshAnnual).toBe(0)
    expect(evaluateEquity({ ...r, includeRefresh: true }, 'USD', 53).refreshAnnual).toBe(3000)
  })
  it('treats negative values as zero', () => {
    const e = evaluateEquity({ ...base, grantValue: money(-100, 'USD') }, 'USD', 53)
    expect(e.annualized).toBe(0)
  })
})
