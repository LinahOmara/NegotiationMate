import { describe, expect, it } from 'vitest'
import { fxRange, fxSensitivity, fxShockImpact } from './fx'
import { emptyOffer, emptyPackage } from '@/domain/factories'
import { money } from './money'
import type { OfferInput, PackageInput } from '@/domain/schema'

const usdTarget: PackageInput = { ...emptyPackage(), distribution: { total: money(60000, 'USD'), basePct: 100, bonusPct: 0, equityPct: 0 } }
const egpOffer: OfferInput = { ...emptyOffer(), distribution: { total: money(265000, 'EGP', 'monthly'), basePct: 100, bonusPct: 0, equityPct: 0 } }
const usdOffer: OfferInput = { ...emptyOffer(), distribution: { total: money(5000, 'USD', 'monthly'), basePct: 100, bonusPct: 0, equityPct: 0 } }

describe('fxRange', () => {
  it('produces ascending rates around the current rate including it', () => {
    const r = fxRange(53)
    expect(r).toContain(53)
    expect([...r].sort((a, b) => a - b)).toEqual(r)
    expect(r[0]).toBeLessThan(53)
    expect(r.at(-1)).toBeGreaterThan(53)
  })
})

describe('fxSensitivity', () => {
  it('a fixed EGP salary loses USD value as the rate rises', () => {
    const rows = fxSensitivity(usdTarget, egpOffer, [53, 60])
    expect(rows[0].offerUSD).toBeCloseTo(60000, 6)
    // Case 3: 265,000 EGP/month at 60 → ≈ $4,416.67/month
    expect(rows[1].offerUSD / 12).toBeCloseTo(4416.67, 2)
    expect(rows[1].offerEGP).toBeCloseTo(265000 * 12, 6)
  })
  it('a USD salary keeps USD value and its EGP payment changes instead', () => {
    const rows = fxSensitivity(usdTarget, usdOffer, [53, 60])
    expect(rows[0].offerUSD).toBe(60000)
    expect(rows[1].offerUSD).toBe(60000)
    expect(rows[0].offerEGP / 12).toBe(265000)
    expect(rows[1].offerEGP / 12).toBe(300000)
  })
  it('includes the target at each rate', () => {
    const rows = fxSensitivity(usdTarget, egpOffer, [60])
    expect(rows[0].targetUSD).toBe(60000)
    expect(rows[0].gapUSD).toBeCloseTo(53000 - 60000, 6)
  })
})

describe('fxShockImpact', () => {
  it('reports the USD-equivalent change for a 10% EGP depreciation', () => {
    const r = fxShockImpact(egpOffer, 53, 10)
    expect(r.shockedRate).toBeCloseTo(58.3, 6)
    expect(r.usdChange).toBeCloseTo(60000 / 1.1 - 60000, 4)
  })
  it('is zero for USD-anchored packages', () => {
    expect(fxShockImpact(usdOffer, 53, 10).usdChange).toBe(0)
  })
})
