import type { BonusInput, Currency } from '@/domain/schema'
import { D, annualInD, num } from './money'

export interface BonusResult {
  /** Target bonus (annual). Variable — never guaranteed. */
  target: number
  /** Target × estimated payout %. */
  expected: number
  /** Bonus counted in year one (guaranteed amount if contractually guaranteed, else target). */
  yearOne: number
  /** Amount contractually guaranteed in year one, else 0. */
  guaranteedYearOne: number
}

export function evaluateBonus(input: BonusInput, annualBase: number, currency: Currency, rate: number): BonusResult {
  const target =
    input.kind === 'percentOfBase'
      ? D(Math.max(0, annualBase)).times(D(input.percentOfBase)).div(100)
      : annualInD(input.fixed, currency, rate)
  const expected = target.times(D(input.expectedPayoutPct)).div(100)
  return {
    target: num(target),
    expected: num(expected),
    yearOne: num(target),
    guaranteedYearOne: input.guaranteedFirstYear ? num(target) : 0,
  }
}

export const PAYOUT_LEVELS = [0, 50, 100, 150] as const

export function bonusPayoutScenarios(target: number, levels: readonly number[] = PAYOUT_LEVELS) {
  return levels.map((payoutPct) => ({ payoutPct, amount: num(D(target).times(payoutPct).div(100)) }))
}
