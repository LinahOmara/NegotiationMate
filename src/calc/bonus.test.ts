import { describe, expect, it } from 'vitest'
import { evaluateBonus, bonusPayoutScenarios } from './bonus'
import { money } from './money'
import type { BonusInput } from '@/domain/schema'

const pct: BonusInput = {
  kind: 'percentOfBase',
  percentOfBase: 10,
  fixed: money(0, 'USD'),
  expectedPayoutPct: 100,
  guaranteedFirstYear: false,
}

describe('evaluateBonus', () => {
  it('computes a percentage-of-base target', () => {
    const b = evaluateBonus(pct, 60000, 'USD', 53)
    expect(b.target).toBe(6000)
    expect(b.expected).toBe(6000)
    expect(b.guaranteedYearOne).toBe(0)
  })
  it('computes a fixed target in another currency', () => {
    const b = evaluateBonus({ ...pct, kind: 'fixed', fixed: money(318000, 'EGP') }, 60000, 'USD', 53)
    expect(b.target).toBeCloseTo(6000, 8)
  })
  it('applies an estimated payout percentage without changing the target', () => {
    const b = evaluateBonus({ ...pct, expectedPayoutPct: 70 }, 60000, 'USD', 53)
    expect(b.target).toBe(6000)
    expect(b.expected).toBe(4200)
  })
  it('a guaranteed first-year payout is guaranteed only in year one', () => {
    const b = evaluateBonus({ ...pct, guaranteedFirstYear: true, expectedPayoutPct: 50 }, 60000, 'USD', 53)
    expect(b.guaranteedYearOne).toBe(6000)
    expect(b.yearOne).toBe(6000)
    expect(b.expected).toBe(3000)
  })
  it('handles zero base', () => {
    expect(evaluateBonus(pct, 0, 'USD', 53).target).toBe(0)
  })
})

describe('bonusPayoutScenarios', () => {
  it('lists payouts at standard levels', () => {
    expect(bonusPayoutScenarios(6000)).toEqual([
      { payoutPct: 0, amount: 0 },
      { payoutPct: 50, amount: 3000 },
      { payoutPct: 100, amount: 6000 },
      { payoutPct: 150, amount: 9000 },
    ])
  })
})
