import type { ComponentKey, PackageInput } from '@/domain/schema'
import { COMPONENTS } from '@/domain/schema'
import { D, DecimalCtx, convert, num, toAnnual } from './money'
import { evaluatePackage } from './package'

export type Pcts = Record<ComponentKey, number>

export interface RebalanceResult {
  pcts: Pcts
  /** Components whose share was changed to absorb the edit. */
  changed: ComponentKey[]
  /** True when the requested value could not be applied in full. */
  clamped: boolean
}

const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * Linked percentage controls. Setting one component redistributes the
 * difference across the *unlocked* other components in proportion to their
 * current shares (equally if they are all zero). Locked components never move.
 */
export function rebalance(current: Pcts, key: ComponentKey, requested: number, locked: ComponentKey[]): RebalanceResult {
  const others = COMPONENTS.filter((k) => k !== key)
  const free = others.filter((k) => !locked.includes(k))
  const lockedSum = others.filter((k) => locked.includes(k)).reduce((s, k) => s + current[k], 0)

  if (free.length === 0) return { pcts: { ...current }, changed: [], clamped: requested !== current[key] }

  const max = round1(100 - lockedSum)
  const wanted = Math.min(100, Math.max(0, requested))
  const value = round1(Math.min(wanted, max))
  const remainder = D(100).minus(D(value)).minus(D(lockedSum))

  const freeSum = free.reduce((s, k) => s + current[k], 0)
  const next: Pcts = { ...current, [key]: value }
  free.forEach((k) => {
    const share = freeSum > 0 ? D(current[k]).div(D(freeSum)) : new DecimalCtx(1).div(free.length)
    next[k] = round1(num(remainder.times(share)))
  })
  // Fix rounding residual on the largest free component so the total is exactly 100.
  const residual = round1(100 - COMPONENTS.reduce((s, k) => s + next[k], 0))
  if (residual !== 0) {
    const target = [...free].sort((a, b) => next[b] - next[a])[0]
    next[target] = round1(next[target] + residual)
  }

  return {
    pcts: next,
    changed: free.filter((k) => next[k] !== current[k]),
    clamped: value !== wanted,
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100
const close = (a: number, b: number) => Math.abs(a - b) < 0.5
const round6 = (v: number) => Math.round(v * 1e6) / 1e6

/**
 * Switch between distribution and component entry, carrying the current
 * numbers across so nothing is lost. If the destination mode already
 * represents the same package (a round trip), its detailed settings are kept.
 */
export function switchPackageMode<T extends PackageInput>(pkg: T, mode: PackageInput['mode'], rate: number): T {
  if (pkg.mode === mode) return pkg
  const from = evaluatePackage(pkg, rate)
  const existing = evaluatePackage({ ...pkg, mode }, rate)
  const same = (Object.keys(from.components) as ComponentKey[]).every((k) => close(from.components[k], existing.components[k]))
  if (same) return { ...pkg, mode }

  if (mode === 'components') {
    const { total, ...p } = { ...pkg.distribution }
    const r = evaluatePackage(pkg, rate, total.currency)
    const monthlyFactor = total.period === 'monthly' ? 12 : 1
    return {
      ...pkg,
      mode,
      components: {
        base: { amount: round2(r.base / monthlyFactor), currency: total.currency, period: total.period },
        bonus: { ...pkg.components.bonus, kind: 'fixed', fixed: { amount: round2(r.bonusTarget), currency: total.currency, period: 'annual' } },
        equity: { ...pkg.components.equity, mode: 'simple', annualValue: { amount: round2(r.equityAnnual), currency: total.currency, period: 'annual' } },
      },
      distribution: { total, ...p },
    }
  }

  const currency = pkg.components.base.currency
  const r = evaluatePackage(pkg, rate, currency)
  const totalAnnual = r.recurring
  const pct = (v: number | null) => round6(v ?? 0)
  let basePct = pct(r.mixPct.base)
  const bonusPct = pct(r.mixPct.bonus)
  const equityPct = pct(r.mixPct.equity)
  if (totalAnnual > 0) basePct = round6(100 - bonusPct - equityPct)
  else basePct = 100
  const period = pkg.components.base.period
  return {
    ...pkg,
    mode,
    distribution: {
      total: { amount: round2(period === 'monthly' ? totalAnnual / 12 : totalAnnual), currency, period },
      basePct,
      bonusPct: totalAnnual > 0 ? bonusPct : 0,
      equityPct: totalAnnual > 0 ? equityPct : 0,
    },
  }
}

/** Convenience used by inputs: annual amount of a component share of the total. */
export function shareAmount(pkg: PackageInput, key: ComponentKey, rate: number) {
  const d = pkg.distribution
  const pctKey = `${key}Pct` as const
  return convert(toAnnual(d.total.amount * (d[pctKey] / 100), d.total.period), d.total.currency, 'USD', rate)
}
