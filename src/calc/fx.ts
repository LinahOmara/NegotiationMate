import type { OfferInput, PackageInput } from '@/domain/schema'
import { D, num } from './money'
import { evaluateOffer, evaluatePackage } from './package'

export interface FxRow {
  rate: number
  offerUSD: number
  offerEGP: number
  targetUSD: number
  targetEGP: number
  gapUSD: number
}

const round2 = (v: number) => Math.round(v * 100) / 100

/** Rates from −20% to +30% around the current assumption, always including it. */
export function fxRange(rate: number, steps = 11): number[] {
  const lo = rate * 0.8
  const hi = rate * 1.3
  const set = new Set<number>([round2(rate)])
  for (let i = 0; i < steps; i++) set.add(round2(lo + ((hi - lo) * i) / (steps - 1)))
  return [...set].sort((a, b) => a - b)
}

/** Value of target and offer (recurring, annual) at each hypothetical rate. */
export function fxSensitivity(target: PackageInput, offer: OfferInput, rates: number[]): FxRow[] {
  return rates.map((rate) => {
    const o = evaluateOffer(offer, rate, 'USD')
    const t = evaluatePackage(target, rate, 'USD')
    return {
      rate,
      offerUSD: o.recurring,
      offerEGP: num(D(o.recurring).times(D(rate))),
      targetUSD: t.recurring,
      targetEGP: num(D(t.recurring).times(D(rate))),
      gapUSD: num(D(o.recurring).minus(D(t.recurring))),
    }
  })
}

/** USD-equivalent change of a package if EGP depreciates by `depreciationPct`. */
export function fxShockImpact(pkg: PackageInput, rate: number, depreciationPct: number) {
  const shockedRate = num(D(rate).times(D(1).plus(D(depreciationPct).div(100))))
  const now = evaluatePackage(pkg, rate).recurring
  const later = evaluatePackage(pkg, shockedRate).recurring
  return { shockedRate, usdNow: now, usdLater: later, usdChange: num(D(later).minus(D(now))) }
}
