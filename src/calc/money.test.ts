import { describe, expect, it } from 'vitest'
import { convert, toAnnual, toMonthly, annualIn, gapPercent, money } from './money'

describe('convert (canonical FX conversion)', () => {
  it('returns the same amount for the same currency', () => {
    expect(convert(1234.56, 'USD', 'USD', 53)).toBe(1234.56)
  })
  it('converts USD to EGP by multiplying by the rate', () => {
    // Case 2: $5,000/month at 53 = 265,000 EGP/month
    expect(convert(5000, 'USD', 'EGP', 53)).toBe(265000)
  })
  it('converts EGP to USD by dividing by the rate', () => {
    // Case 3: 265,000 EGP fixed at 60 ≈ $4,416.67
    expect(convert(265000, 'EGP', 'USD', 60)).toBeCloseTo(4416.6667, 3)
  })
  it('round-trips without floating point drift', () => {
    expect(convert(convert(0.1 + 0.2, 'USD', 'EGP', 53.37), 'EGP', 'USD', 53.37)).toBe(0.3)
  })
  it('throws for non-positive rates', () => {
    expect(() => convert(1, 'USD', 'EGP', 0)).toThrow()
    expect(() => convert(1, 'USD', 'EGP', -5)).toThrow()
  })
})

describe('period normalization', () => {
  it('annualizes monthly amounts', () => {
    // Case 2: $5,000/month = $60,000/year
    expect(toAnnual(5000, 'monthly')).toBe(60000)
    expect(toAnnual(60000, 'annual')).toBe(60000)
  })
  it('monthly-izes annual amounts', () => {
    expect(toMonthly(70900, 'annual')).toBeCloseTo(5908.3333, 3)
    expect(toMonthly(5000, 'monthly')).toBe(5000)
  })
  it('handles decimals predictably', () => {
    expect(toAnnual(0.1, 'monthly')).toBe(1.2)
  })
})

describe('annualIn', () => {
  it('normalizes and converts in one step', () => {
    expect(annualIn(money(5000, 'USD', 'monthly'), 'EGP', 53)).toBe(3180000)
    expect(annualIn(money(265000, 'EGP', 'monthly'), 'USD', 60)).toBeCloseTo(53000, 6)
  })
  it('treats negative or non-finite amounts as zero', () => {
    expect(annualIn(money(-10, 'USD', 'annual'), 'USD', 53)).toBe(0)
    expect(annualIn({ amount: Number.NaN, currency: 'USD', period: 'annual' }, 'USD', 53)).toBe(0)
  })
})

describe('gapPercent', () => {
  it('is (offer - target) / target × 100', () => {
    // Case 1
    expect(gapPercent(49000, 70900)).toBeCloseTo(-30.888, 2)
  })
  it('is null (undefined) when the target is zero', () => {
    expect(gapPercent(1000, 0)).toBeNull()
    expect(gapPercent(0, 0)).toBeNull()
  })
  it('is positive when the offer exceeds target', () => {
    expect(gapPercent(110, 100)).toBeCloseTo(10, 10)
  })
})
