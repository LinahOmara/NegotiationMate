import type { Currency, EquityInput } from '@/domain/schema'
import { D, DecimalCtx, annualInD, lumpInD, num, type Dec } from './money'

export interface Tranche {
  /** Months after start when this tranche vests. */
  month: number
  /** Share of the initial grant, 0..1. */
  fraction: number
}

export interface EquityResult {
  /** Average annual value at initial grant value (grant / vesting years). */
  annualized: number
  /** Initial grant value, advanced mode only. */
  grantValue: number | null
  /** Initial-grant value vesting in year one (cliff-aware). */
  yearOne: number
  /** Initial-grant value vesting in each year. */
  byYear: number[]
  /** Value at vesting under the assumed share-price change. Projection only. */
  projectedByYear: number[]
  projectedTotal: number
  /** Annual refresh assumption; 0 unless the user opted in. */
  refreshAnnual: number
}

const SIMPLE_HORIZON_YEARS = 4

function customFractions(input: EquityInput): Dec[] {
  const n = input.vestingYears
  const pcts = Array.from({ length: n }, (_, i) => D(Math.max(0, input.customYearPcts[i] ?? 0)))
  const sum = pcts.reduce((s, p) => s.plus(p), new DecimalCtx(0))
  if (sum.isZero()) return pcts.map(() => new DecimalCtx(1).div(n))
  return pcts.map((p) => p.div(sum))
}

/** Vesting tranches for an advanced grant. Tranches before the cliff vest at the cliff. */
export function vestingTranches(input: EquityInput): Tranche[] {
  const n = input.vestingYears
  const cliff = input.firstVestMonths
  const raw: { month: number; fraction: Dec }[] = []
  if (input.schedule === 'quarterly') {
    const f = new DecimalCtx(1).div(n * 4)
    for (let q = 1; q <= n * 4; q++) raw.push({ month: q * 3, fraction: f })
  } else if (input.schedule === 'custom') {
    customFractions(input).forEach((fraction, i) => raw.push({ month: (i + 1) * 12, fraction }))
  } else {
    const f = new DecimalCtx(1).div(n)
    for (let y = 1; y <= n; y++) raw.push({ month: y * 12, fraction: f })
  }
  return raw.map((t) => ({ month: Math.max(t.month, cliff), fraction: num(t.fraction) }))
}

const yearIndex = (month: number) => Math.max(0, Math.ceil(month / 12) - 1)

export function evaluateEquity(input: EquityInput, currency: Currency, rate: number): EquityResult {
  const refreshAnnual = input.includeRefresh ? num(annualInD(input.refreshAnnualValue, currency, rate)) : 0

  if (input.mode === 'simple') {
    const annual = num(annualInD(input.annualValue, currency, rate))
    const byYear = Array(SIMPLE_HORIZON_YEARS).fill(annual)
    return {
      annualized: annual,
      grantValue: null,
      yearOne: annual,
      byYear,
      projectedByYear: byYear,
      projectedTotal: annual * SIMPLE_HORIZON_YEARS,
      refreshAnnual,
    }
  }

  const grant = lumpInD(input.grantValue, currency, rate)
  const growth = D(1).plus(D(input.annualPriceChangePct).div(100))
  const tranches = vestingTranches(input)
  const years = Math.max(input.vestingYears, ...tranches.map((t) => yearIndex(t.month) + 1))
  const byYear = Array.from({ length: years }, () => new DecimalCtx(0))
  const projected = Array.from({ length: years }, () => new DecimalCtx(0))

  for (const t of tranches) {
    const i = yearIndex(t.month)
    const value = grant.times(D(t.fraction))
    byYear[i] = byYear[i].plus(value)
    projected[i] = projected[i].plus(value.times(growth.pow(D(t.month).div(12))))
  }

  return {
    annualized: num(grant.div(input.vestingYears)),
    grantValue: num(grant),
    yearOne: num(byYear[0]),
    byYear: byYear.map(num),
    projectedByYear: projected.map(num),
    projectedTotal: num(projected.reduce((s, v) => s.plus(v), new DecimalCtx(0))),
    refreshAnnual,
  }
}
