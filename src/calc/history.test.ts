import { describe, expect, it } from 'vitest'
import { compareHistory, evaluateHistoryEntry } from './history'
import { evaluatePackage } from './package'
import { demoData, emptyOffer, zeroAdjustments } from '@/domain/factories'
import { money } from './money'
import type { HistoryEntry, OfferInput } from '@/domain/schema'

const d = demoData()
const target = evaluatePackage(d.target, 53)

function entry(over: Partial<HistoryEntry> = {}): HistoryEntry {
  return { id: 'a', label: 'A', timestamp: '2026-01-01T00:00:00.000Z', notes: '', rate: 53, offer: d.offer, adjustments: zeroAdjustments(), ...over }
}

function egpOffer(): OfferInput {
  const o: OfferInput = { ...emptyOffer(), mode: 'components' }
  o.components.base = money(530000, 'EGP')
  return o
}

describe('evaluateHistoryEntry', () => {
  it('evaluates a plain offer with zero adjustments', () => {
    const r = evaluateHistoryEntry(entry(), target)
    expect(r.recurring).toBeCloseTo(49000, 6)
    expect(r.guaranteedAnnual).toBeCloseTo(39200, 6)
    expect(r.bonus).toBeCloseTo(4900, 6)
    expect(r.equity).toBeCloseTo(4900, 6)
    expect(r.signOn).toBe(0)
  })

  it('uses the entry own rate, not a global one', () => {
    const at53 = evaluateHistoryEntry(entry({ offer: egpOffer(), rate: 53 }), target)
    const at60 = evaluateHistoryEntry(entry({ offer: egpOffer(), rate: 60 }), target)
    expect(at53.guaranteedAnnual).toBeCloseTo(10000, 6)
    expect(at60.guaranteedAnnual).toBeCloseTo(530000 / 60, 6)
    expect(at60.recurring).toBeLessThan(at53.recurring)
  })

  it('applies adjustments', () => {
    const r = evaluateHistoryEntry(entry({ adjustments: { base: 5000, bonus: 1000, equity: 2000, signOn: 4000 } }), target)
    expect(r.guaranteedAnnual).toBeCloseTo(44200, 6)
    expect(r.recurring).toBeCloseTo(57000, 6)
    expect(r.signOn).toBe(4000)
    expect(r.firstYear).toBeCloseTo(61000, 6)
  })
})

describe('compareHistory', () => {
  it('reports all same for identical entries', () => {
    const c = compareHistory(entry(), entry({ id: 'b' }), target)
    for (const k of ['guaranteed', 'equity', 'recurring', 'firstYear'] as const) {
      expect(c[k].delta).toBeCloseTo(0, 8)
      expect(c[k].direction).toBe('same')
    }
  })

  it('computes b - a with directions', () => {
    const b = entry({ id: 'b', adjustments: { base: 5000, bonus: 0, equity: -1000, signOn: 0 } })
    const c = compareHistory(entry(), b, target)
    expect(c.guaranteed.delta).toBeCloseTo(5000, 6)
    expect(c.guaranteed.direction).toBe('improved')
    expect(c.equity.delta).toBeCloseTo(-1000, 6)
    expect(c.equity.direction).toBe('worse')
    expect(c.recurring.delta).toBeCloseTo(4000, 6)
    expect(c.recurring.a).toBeCloseTo(49000, 6)
    expect(c.recurring.b).toBeCloseTo(53000, 6)
  })

  it('treats differences below 0.5 as same', () => {
    const b = entry({ id: 'b', adjustments: { base: 0.4, bonus: 0, equity: 0, signOn: 0 } })
    expect(compareHistory(entry(), b, target).guaranteed.direction).toBe('same')
  })

  it('compares across different recorded rates', () => {
    const a = entry({ offer: egpOffer(), rate: 53 })
    const b = entry({ id: 'b', offer: egpOffer(), rate: 60 })
    const c = compareHistory(a, b, target)
    expect(c.guaranteed.direction).toBe('worse')
    expect(c.guaranteed.delta).toBeCloseTo(530000 / 60 - 10000, 6)
  })
})
