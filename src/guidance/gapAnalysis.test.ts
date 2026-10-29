import { describe, expect, it } from 'vitest'
import { gapAnalysis } from './gapAnalysis'
import { compareToTarget, evaluateOffer, evaluatePackage } from '@/calc/package'
import { demoData, emptyOffer } from '@/domain/factories'
import { money } from '@/calc/money'
import type { OfferInput } from '@/domain/schema'

const rate = 53
function run(offerIn: OfferInput, targetIn = demoData().target) {
  const t = evaluatePackage(targetIn, rate)
  const o = evaluateOffer(offerIn, rate)
  return gapAnalysis({ target: t, offer: o, comparison: compareToTarget(o, t), offerInput: offerIn, rate })
}

describe('gapAnalysis', () => {
  it('demo: describes the total gap and how much of it is base', () => {
    const facts = run(demoData().offer)
    const total = facts.find((f) => f.id === 'total-gap')!
    expect(total.text).toContain('$21,900 below target')
    expect(total.text).toContain('$21,065')
    expect(facts.map((f) => f.id)).toContain('variable-share')
  })
  it('only shows first-year differences when they exist', () => {
    expect(run(demoData().offer).map((f) => f.id)).not.toContain('first-year')
    const o = { ...demoData().offer, signOn: { ...demoData().offer.signOn, amount: money(10000, 'USD') } }
    const fy = run(o).find((f) => f.id === 'first-year')!
    expect(fy.text).toContain('$10,000')
  })
  it('equity reliance appears only when the offer relies more on equity than the target', () => {
    expect(run(demoData().offer).map((f) => f.id)).toContain('equity-reliance')
    const lowEquity: OfferInput = { ...emptyOffer(), distribution: { total: money(49000, 'USD'), basePct: 100, bonusPct: 0, equityPct: 0 } }
    expect(run(lowEquity).map((f) => f.id)).not.toContain('equity-reliance')
  })
  it('FX effect appears only for EGP-fixed amounts', () => {
    expect(run(demoData().offer).map((f) => f.id)).not.toContain('fx-effect')
    const egp: OfferInput = { ...emptyOffer(), distribution: { total: money(2597000, 'EGP'), basePct: 100, bonusPct: 0, equityPct: 0 } }
    expect(run(egp).find((f) => f.id === 'fx-effect')!.text).toMatch(/USD-equivalent/)
  })
  it('positive gap reads as above target', () => {
    const rich: OfferInput = { ...emptyOffer(), distribution: { total: money(80000, 'USD'), basePct: 85, bonusPct: 10, equityPct: 5 } }
    expect(run(rich).find((f) => f.id === 'total-gap')!.text).toContain('above target')
  })
  it('produces nothing misleading for empty inputs', () => {
    const empty = { ...demoData().target, distribution: { ...demoData().target.distribution, total: money(0, 'USD') } }
    const blank: OfferInput = { ...emptyOffer() }
    const facts = run(blank, empty)
    for (const f of facts) expect(f.text).not.toMatch(/NaN|Infinity/)
  })
})
