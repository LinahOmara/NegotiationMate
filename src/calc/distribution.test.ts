import { describe, expect, it } from 'vitest'
import { rebalance, switchPackageMode } from './distribution'
import { evaluatePackage } from './package'
import { demoData } from '@/domain/factories'

const sum = (p: { base: number; bonus: number; equity: number }) => p.base + p.bonus + p.equity

describe('rebalance (linked percentage controls)', () => {
  const start = { base: 85, bonus: 10, equity: 5 }

  it('spreads the freed share across unlocked components proportionally', () => {
    const r = rebalance(start, 'base', 80, [])
    expect(r.pcts.base).toBe(80)
    expect(r.pcts.bonus).toBeCloseTo(13.3, 1)
    expect(r.pcts.equity).toBeCloseTo(6.7, 1)
    expect(sum(r.pcts)).toBeCloseTo(100, 10)
    expect(r.changed.sort()).toEqual(['bonus', 'equity'])
  })
  it('never touches a locked component', () => {
    const r = rebalance(start, 'base', 80, ['equity'])
    expect(r.pcts).toEqual({ base: 80, bonus: 15, equity: 5 })
    expect(r.changed).toEqual(['bonus'])
  })
  it('caps the edited value at what unlocked components can give up', () => {
    const r = rebalance(start, 'base', 99, ['equity'])
    expect(r.pcts).toEqual({ base: 95, bonus: 0, equity: 5 })
    expect(r.clamped).toBe(true)
  })
  it('does nothing when every other component is locked', () => {
    const r = rebalance(start, 'base', 50, ['bonus', 'equity'])
    expect(r.pcts).toEqual(start)
    expect(r.clamped).toBe(true)
  })
  it('splits equally when the others are both zero', () => {
    const r = rebalance({ base: 100, bonus: 0, equity: 0 }, 'base', 90, [])
    expect(r.pcts).toEqual({ base: 90, bonus: 5, equity: 5 })
  })
  it('clamps out-of-range input', () => {
    expect(rebalance(start, 'bonus', -10, []).pcts.bonus).toBe(0)
    expect(rebalance(start, 'bonus', 140, []).pcts.bonus).toBe(100)
  })
  it('always sums to exactly 100 after rounding', () => {
    for (const v of [33.3, 12.7, 66.6, 1.1, 99.9]) {
      const r = rebalance({ base: 33.3, bonus: 33.3, equity: 33.4 }, 'bonus', v, [])
      expect(Math.round(sum(r.pcts) * 1000) / 1000).toBe(100)
    }
  })
})

describe('switchPackageMode', () => {
  const rate = 53
  it('carries values from distribution to components without changing the total', () => {
    const t = demoData().target
    const switched = switchPackageMode({ ...t, components: { ...t.components, base: { ...t.components.base, amount: 1 } } }, 'components', rate)
    expect(switched.mode).toBe('components')
    expect(evaluatePackage(switched, rate).recurring).toBeCloseTo(70900, 2)
    expect(evaluatePackage(switched, rate).base).toBeCloseTo(60265, 2)
  })
  it('carries values from components to distribution', () => {
    const t = { ...demoData().target, mode: 'components' as const }
    t.components = { ...t.components, base: { amount: 50000, currency: 'USD', period: 'annual' } }
    const switched = switchPackageMode(t, 'distribution', rate)
    const r = evaluatePackage(switched, rate)
    expect(r.recurring).toBeCloseTo(50000 + 7090 + 3545, 2)
    expect(r.base).toBeCloseTo(50000, 2)
  })
  it('round-trips without losing detailed component settings', () => {
    const t = { ...demoData().offer, mode: 'components' as const }
    t.components = {
      ...t.components,
      base: { amount: 40000, currency: 'USD', period: 'annual' },
      equity: { ...t.components.equity, mode: 'advanced', grantValue: { amount: 20000, currency: 'USD', period: 'annual' }, schedule: 'quarterly' },
    }
    const back = switchPackageMode(switchPackageMode(t, 'distribution', rate), 'components', rate)
    expect(back.components.equity.mode).toBe('advanced')
    expect(back.components.equity.schedule).toBe('quarterly')
    expect(evaluatePackage(back, rate).recurring).toBeCloseTo(evaluatePackage(t, rate).recurring, 2)
  })
  it('keeps the total currency when carrying values', () => {
    const t = demoData().target
    t.distribution.total = { amount: 300000, currency: 'EGP', period: 'monthly' }
    const switched = switchPackageMode(t, 'components', rate)
    expect(switched.components.base.currency).toBe('EGP')
    expect(switched.components.base.period).toBe('monthly')
    expect(switched.components.base.amount).toBeCloseTo(255000, 2)
  })
})
