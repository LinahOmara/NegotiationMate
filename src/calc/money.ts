import Decimal from 'decimal.js'
import type { Currency, Money, Period } from '@/domain/schema'

/**
 * Financial arithmetic primitives. All intermediate math runs through
 * decimal.js; numbers only cross the boundary as plain JS numbers.
 * Rounding is a display concern (see lib/format.ts) — nothing here rounds
 * results, except that inputs are sanitized to 10 decimal places so binary
 * floating-point noise (0.1 + 0.2) never propagates.
 */

export const DecimalCtx = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN })
export type Dec = InstanceType<typeof DecimalCtx>

/** Sanitized Decimal from a number; non-finite and negatives are clamped by callers. */
export function D(value: number | Dec): Dec {
  if (value instanceof DecimalCtx) return value
  if (!Number.isFinite(value)) return new DecimalCtx(0)
  return new DecimalCtx(value).toDecimalPlaces(10)
}

/** Non-negative sanitized Decimal: compensation components can never be negative. */
export function Dpos(value: number): Dec {
  const d = D(value)
  return d.isNegative() ? new DecimalCtx(0) : d
}

export const num = (d: Dec): number => d.toNumber()

export function money(amount: number, currency: Currency, period: Period = 'annual'): Money {
  return { amount, currency, period }
}

function assertRate(rate: number) {
  if (!Number.isFinite(rate) || rate <= 0) throw new RangeError(`Exchange rate must be positive, got ${rate}`)
}

/**
 * The single canonical currency conversion. `rate` is EGP per 1 USD.
 */
export function convertD(amount: Dec, from: Currency, to: Currency, rate: number): Dec {
  if (from === to) return amount
  assertRate(rate)
  const r = D(rate)
  return from === 'USD' ? amount.times(r) : amount.div(r)
}

export function convert(amount: number, from: Currency, to: Currency, rate: number): number {
  return num(convertD(D(amount), from, to, rate))
}

export function toAnnualD(amount: Dec, period: Period): Dec {
  return period === 'monthly' ? amount.times(12) : amount
}

export function toAnnual(amount: number, period: Period): number {
  return num(toAnnualD(D(amount), period))
}

export function toMonthly(amount: number, period: Period): number {
  return period === 'annual' ? num(D(amount).div(12)) : num(D(amount))
}

/** Annual value of a Money in `currency` at `rate`. Negative/invalid amounts count as zero. */
export function annualInD(m: Money, currency: Currency, rate: number): Dec {
  return convertD(toAnnualD(Dpos(m.amount), m.period), m.currency, currency, rate)
}

export function annualIn(m: Money, currency: Currency, rate: number): number {
  return num(annualInD(m, currency, rate))
}

/** Lump-sum value (period ignored) — used for equity grants and sign-on bonuses. */
export function lumpInD(m: Money, currency: Currency, rate: number): Dec {
  return convertD(Dpos(m.amount), m.currency, currency, rate)
}

/** (offer − target) / target × 100. Undefined (null) for a non-positive target. */
export function gapPercent(offer: number, target: number): number | null {
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(offer)) return null
  return num(D(offer).minus(D(target)).div(D(target)).times(100))
}

/** Share of `part` in `whole`, in %. Null when whole is zero. */
export function sharePercent(part: number, whole: number): number | null {
  if (!Number.isFinite(whole) || whole <= 0) return null
  return num(D(part).div(D(whole)).times(100))
}
