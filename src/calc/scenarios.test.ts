import { describe, expect, it } from 'vitest'
import { applyAdjustments, resolveScenario, solve, type SolverKind } from './scenarios'
import { evaluateOffer, evaluatePackage } from './package'
import { demoData, emptyOffer, zeroAdjustments } from '@/domain/factories'
import { money } from './money'
import type { OfferInput } from '@/domain/schema'

const rate = 53
const d = demoData()
const target = evaluatePackage(d.target, rate)
const offer = evaluateOffer(d.offer, rate)

describe('applyAdjustments', () => {
  it('zero adjustments reproduce the offer', () => {
    const r = applyAdjustments(offer, zeroAdjustments(), target)
    expect(r.recurring).toBeCloseTo(49000, 8)
    expect(r.remainingGap).toBeCloseTo(-21900, 8)
    expect(r.firstYear).toBeCloseTo(offer.firstYear, 8)
  })
  it('adds increases per component and sign-on only to year one', () => {
    const r = applyAdjustments(offer, { base: 5000, bonus: 1000, equity: 2000, signOn: 4000 }, target)
    expect(r.base).toBeCloseTo(39200 + 5000, 8)
    expect(r.recurring).toBeCloseTo(49000 + 8000, 8)
    expect(r.firstYear).toBeCloseTo(49000 + 8000 + 4000, 8)
    expect(r.ongoing).toBeCloseTo(57000, 8)
  })
  it('never lets a component go below zero', () => {
    const r = applyAdjustments(offer, { base: -1e9, bonus: -1e9, equity: -1e9, signOn: 0 }, target)
    expect(r.base).toBe(0)
    expect(r.bonus).toBe(0)
    expect(r.equity).toBe(0)
    expect(r.recurring).toBe(0)
  })
  it('scales a percentage-of-base bonus with base increases', () => {
    const o: OfferInput = { ...emptyOffer(), mode: 'components' }
    o.components.base = money(50000, 'USD')
    o.components.bonus = { ...o.components.bonus, kind: 'percentOfBase', percentOfBase: 10 }
    const r = applyAdjustments(evaluateOffer(o, rate), { base: 10000, bonus: 0, equity: 0, signOn: 0 }, target)
    expect(r.bonus).toBeCloseTo(6000, 8)
    expect(r.recurring).toBeCloseTo(66000, 8)
  })
})

describe('solvers', () => {
  const kinds: SolverKind[] = ['closeGap', 'baseFirst', 'equityOnly', 'signOn', 'matchMix']

  it.each(kinds)('%s explains what changed and what was kept', (kind) => {
    const s = solve(kind, offer, target)
    expect(s.summary.length).toBeGreaterThan(10)
    expect(s.constraints.length).toBeGreaterThan(0)
  })

  it('closeGap closes the total gap using component shortfalls, never overshooting a component target', () => {
    const s = solve('closeGap', offer, target)
    const r = applyAdjustments(offer, s.adjustments, target)
    expect(r.remainingGap).toBeCloseTo(0, 6)
    expect(r.base).toBeLessThanOrEqual(target.base + 1e-6)
    expect(s.adjustments.equity).toBe(0) // offer equity already exceeds target equity
    expect(s.changed).toEqual(expect.arrayContaining(['base', 'bonus']))
  })

  it('baseFirst puts the full gap into guaranteed base', () => {
    const s = solve('baseFirst', offer, target)
    expect(s.adjustments).toMatchObject({ bonus: 0, equity: 0, signOn: 0 })
    expect(s.adjustments.base).toBeCloseTo(21900, 6)
    expect(applyAdjustments(offer, s.adjustments, target).remainingGap).toBeCloseTo(0, 6)
  })

  it('baseFirst accounts for a bonus defined as % of base', () => {
    const o: OfferInput = { ...emptyOffer(), mode: 'components' }
    o.components.base = money(40000, 'USD')
    o.components.bonus = { ...o.components.bonus, kind: 'percentOfBase', percentOfBase: 10 }
    const or = evaluateOffer(o, rate)
    const s = solve('baseFirst', or, target)
    expect(applyAdjustments(or, s.adjustments, target).remainingGap).toBeCloseTo(0, 6)
    expect(s.adjustments.base).toBeCloseTo((70900 - 44000) / 1.1, 6)
  })

  it('equityOnly keeps base unchanged', () => {
    const s = solve('equityOnly', offer, target)
    expect(s.adjustments.base).toBe(0)
    expect(s.adjustments.equity).toBeCloseTo(21900, 6)
  })

  it('signOn closes only the first-year gap and leaves the recurring gap', () => {
    const s = solve('signOn', offer, target)
    const r = applyAdjustments(offer, s.adjustments, target)
    expect(s.adjustments.signOn).toBeCloseTo(21900, 6)
    expect(r.firstYear - target.recurring).toBeCloseTo(0, 6)
    expect(r.remainingGap).toBeCloseTo(-21900, 6)
  })

  it('matchMix reproduces the target components exactly', () => {
    const s = solve('matchMix', offer, target)
    const r = applyAdjustments(offer, s.adjustments, target)
    expect(r.base).toBeCloseTo(target.base, 6)
    expect(r.bonus).toBeCloseTo(target.bonusTarget, 6)
    expect(r.equity).toBeCloseTo(target.equityAnnual, 6)
    expect(s.adjustments.equity).toBeLessThan(0)
  })

  it('does nothing when the offer already meets the target', () => {
    const rich = evaluateOffer({ ...d.offer, distribution: { ...d.offer.distribution, total: money(90000, 'USD') } }, rate)
    for (const k of ['closeGap', 'baseFirst', 'equityOnly', 'signOn'] as SolverKind[]) {
      expect(solve(k, rich, target).adjustments).toEqual(zeroAdjustments())
    }
  })
})

describe('resolveScenario', () => {
  it('derives auto strategies from current inputs rather than hardcoded numbers', () => {
    const balanced = resolveScenario({ id: 'b', name: 'B', strategy: 'balanced', adjustments: zeroAdjustments() }, offer, target)
    expect(balanced.adjustments.base).toBeGreaterThan(0)
    const t2 = evaluatePackage({ ...d.target, distribution: { ...d.target.distribution, total: money(80000, 'USD') } }, rate)
    const balanced2 = resolveScenario({ id: 'b', name: 'B', strategy: 'balanced', adjustments: zeroAdjustments() }, offer, t2)
    expect(balanced2.adjustments.base).toBeGreaterThan(balanced.adjustments.base)
  })
  it('uses stored adjustments for custom scenarios', () => {
    const adj = { base: 1, bonus: 2, equity: 3, signOn: 4 }
    expect(resolveScenario({ id: 'c', name: 'C', strategy: 'custom', adjustments: adj }, offer, target).adjustments).toEqual(adj)
  })
  it('current offer has no adjustments', () => {
    expect(resolveScenario({ id: 'x', name: 'X', strategy: 'none', adjustments: { base: 9, bonus: 9, equity: 9, signOn: 9 } }, offer, target).adjustments).toEqual(zeroAdjustments())
  })
})
