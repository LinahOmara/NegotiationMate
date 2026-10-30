import { describe, expect, it } from 'vitest'
import { buildGuidance, type GuidanceInput } from './engine'
import { evaluateOffer, evaluatePackage, compareToTarget } from '@/calc/package'
import { demoData, emptyOffer } from '@/domain/factories'
import { money } from '@/calc/money'
import type { OfferInput, PackageInput } from '@/domain/schema'

const rate = 53

function input(target: PackageInput, offerIn: OfferInput): GuidanceInput {
  const t = evaluatePackage(target, rate)
  const o = evaluateOffer(offerIn, rate)
  return { target: t, offer: o, comparison: compareToTarget(o, t), offerInput: offerIn, rate }
}

const d = demoData()
const dist = (total: number, b: number, bo: number, e: number, currency: 'USD' | 'EGP' = 'USD'): OfferInput => ({
  ...emptyOffer(),
  distribution: { total: money(total, currency), basePct: b, bonusPct: bo, equityPct: e },
})
const ids = (gi: GuidanceInput) => buildGuidance(gi).map((x) => x.id)

describe('guidance engine', () => {
  it('demo: base below target is the top insight', () => {
    const g = buildGuidance(input(d.target, d.offer))
    expect(g[0].id).toBe('base-below-target')
    expect(g.length).toBeLessThanOrEqual(4)
  })

  it('every insight has explanation, why, question, phrase and no forbidden claims', () => {
    const cases = [
      input(d.target, d.offer),
      input(d.target, dist(60000, 50, 10, 40)),
      input(d.target, dist(3500000, 70, 25, 5, 'EGP')),
      input(d.target, dist(70000, 85, 10, 5)),
    ]
    const forbidden = /\b(guarantee[sd]? to|will (definitely|certainly) |fair offer|unfair|lowball|band (is|for) )/i
    for (const gi of cases) {
      for (const ins of buildGuidance(gi, 10)) {
        expect(ins.explanation.length).toBeGreaterThan(20)
        expect(ins.why.length).toBeGreaterThan(20)
        expect(ins.question.endsWith('?')).toBe(true)
        expect(ins.phrase?.length ?? 1).toBeGreaterThan(0)
        for (const t of [ins.title, ins.explanation, ins.why, ins.question, ins.phrase ?? '']) expect(t).not.toMatch(forbidden)
      }
    }
  })

  it('flags high equity concentration', () => {
    expect(ids(input(d.target, dist(60000, 50, 10, 40)))).toContain('equity-concentration')
  })

  it('flags a bonus-heavy package', () => {
    expect(ids(input(d.target, dist(60000, 65, 30, 5)))).toContain('bonus-heavy')
  })

  it('flags FX exposure for a fixed-EGP offer against a USD target', () => {
    expect(ids(input(d.target, dist(3500000, 85, 10, 5, 'EGP')))).toContain('fx-exposure')
    expect(ids(input(d.target, d.offer))).not.toContain('fx-exposure')
  })

  it('flags a large sign-on bonus', () => {
    const o = { ...d.offer, signOn: { ...d.offer.signOn, amount: money(15000, 'USD') } }
    expect(ids(input(d.target, o))).toContain('sign-on-first-year')
  })

  it('near target: focus on the most meaningful remaining gap', () => {
    const g = buildGuidance(input(d.target, dist(69000, 82, 10, 8)))
    expect(g.map((x) => x.id)).toContain('near-target')
    expect(g.map((x) => x.id)).not.toContain('large-gap')
  })

  it('offer at or above target produces a calm confirmation rather than pushing for more', () => {
    const g = buildGuidance(input(d.target, dist(75000, 85, 10, 5)))
    expect(g[0].id).toBe('meets-target')
    expect(g.map((x) => x.id)).not.toContain('base-below-target')
  })

  it('salary band constraint suggests other components but warns sign-on is one-time', () => {
    const o = { ...d.offer, baseBandLimited: true }
    const g = buildGuidance(input(d.target, o), 10).find((x) => x.id === 'band-limited')
    expect(g).toBeDefined()
    expect(g!.why.toLowerCase()).toContain('one-time')
  })

  it('warns when projections assume share price growth', () => {
    const o: OfferInput = { ...emptyOffer(), mode: 'components' }
    o.components.base = money(50000, 'USD')
    o.components.equity = { ...o.components.equity, mode: 'advanced', grantValue: money(40000, 'USD'), annualPriceChangePct: 15 }
    expect(ids(input(d.target, o))).toContain('equity-projection')
  })

  it('warns about a vesting cliff past year one', () => {
    const o: OfferInput = { ...emptyOffer(), mode: 'components' }
    o.components.base = money(50000, 'USD')
    o.components.equity = { ...o.components.equity, mode: 'advanced', grantValue: money(40000, 'USD'), firstVestMonths: 18 }
    expect(buildGuidance(input(d.target, o), 10).map((x) => x.id)).toContain('vesting-cliff')
  })

  it('guidance changes with data (is not static text)', () => {
    const a = buildGuidance(input(d.target, d.offer))
    const b = buildGuidance(input(d.target, dist(3500000, 60, 20, 20, 'EGP')))
    expect(a.map((x) => x.id)).not.toEqual(b.map((x) => x.id))
    expect(a[0].explanation).toMatch(/\$[\d,]+/)
  })

  it('is deterministic', () => {
    expect(buildGuidance(input(d.target, d.offer))).toEqual(buildGuidance(input(d.target, d.offer)))
  })

  it('handles empty data without crashing', () => {
    const empty = { ...d.target, distribution: { ...d.target.distribution, total: money(0, 'USD') } }
    expect(() => buildGuidance(input(empty, dist(0, 100, 0, 0)))).not.toThrow()
  })
})
