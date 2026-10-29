import type { ComponentKey, Currency, OfferInput } from '@/domain/schema'
import type { Comparison, OfferResult, PackageResult } from '@/calc/package'
import { convert } from '@/calc/money'
import { fxShockImpact } from '@/calc/fx'
import { formatMoney, formatPct } from '@/lib/format'

/**
 * Deterministic, rule-based negotiation guidance.
 *
 * Every rule reads only the user's own numbers. Copy is deliberately
 * evidence-aware: no claims about employer policy or salary bands, no
 * promises of outcomes, no judgement of the offer as fair or unfair.
 */

export interface GuidanceInput {
  target: PackageResult
  offer: OfferResult
  comparison: Comparison
  offerInput: OfferInput
  rate: number
  /** Currency used for amounts in the copy. */
  currency?: Currency
}

export type InsightTone = 'attention' | 'info' | 'positive'

export interface Insight {
  id: string
  priority: number
  tone: InsightTone
  title: string
  explanation: string
  why: string
  question: string
  phrase?: string
}

const LABEL: Record<ComponentKey, string> = { base: 'base salary', bonus: 'target bonus', equity: 'equity' }

type Rule = (ctx: GuidanceInput, m: (usd: number) => string) => Insight | null

const rules: Rule[] = [
  // Offer meets or exceeds target.
  ({ comparison: c, target }, m) => {
    if (target.recurring <= 0 || c.totalGap < 0) return null
    return {
      id: 'meets-target',
      priority: 100,
      tone: 'positive',
      title: 'The offer reaches your target total',
      explanation:
        c.totalGap < 0.5
          ? 'The recurring total matches your target.'
          : `The recurring total is ${m(c.totalGap)} above your target of ${m(target.recurring)}.`,
      why: 'With the total in place, the useful questions are usually about structure: how much is guaranteed, and what conditions apply to the variable parts.',
      question: 'Could you walk me through how the bonus and equity are determined after the first year?',
      phrase: 'The overall number works for me — I would like to understand the details of the variable components.',
    }
  },

  // Base salary below target.
  ({ comparison: c, target }, m) => {
    const threshold = Math.max(500, target.base * 0.01)
    if (c.baseGap >= -threshold) return null
    const share = c.totalGap < 0 ? Math.min(100, (c.baseGap / c.totalGap) * 100) : null
    return {
      id: 'base-below-target',
      priority: 90,
      tone: 'attention',
      title: 'Guaranteed base is below your target',
      explanation:
        `Base salary is ${m(-c.baseGap)} a year (${m(-c.monthlyBaseGap)} a month) below your target base of ${m(target.base)}` +
        (share !== null ? ` — ${formatPct(share, { decimals: 0 })} of the total gap.` : '.'),
      why: 'Base is the only part of the package that is guaranteed and recurring, and future raises or percentage bonuses are commonly calculated from it.',
      question: `Could we look at the base salary separately from the total package — is there room to move it closer to ${m(target.base)}?`,
      phrase: 'Could we explore increasing the guaranteed base salary while keeping the overall package structure flexible?',
    }
  },

  // Recruiter indicated a base constraint (user-recorded, not assumed).
  ({ offerInput }) => {
    if (!offerInput.baseBandLimited) return null
    return {
      id: 'band-limited',
      priority: 88,
      tone: 'info',
      title: 'Base salary is described as constrained',
      explanation: 'You recorded that the recruiter indicated base salary has limited flexibility. Other components may still be discussable.',
      why: 'A larger equity grant, a guaranteed first-year bonus or an earlier compensation review can bridge part of a gap — but a sign-on bonus is one-time and does not permanently replace a higher base.',
      question: 'If base has limited room, could we look at a sign-on bonus, a larger equity grant, or an earlier compensation review?',
      phrase: 'I understand base may have limited flexibility — I am open to discussing how other components could bridge the difference.',
    }
  },

  // Close to target.
  ({ comparison: c }, m) => {
    if (c.totalGapPct === null || c.totalGapPct >= 0 || c.totalGapPct < -5) return null
    const focus = c.largestShortfall
    return {
      id: 'near-target',
      priority: 85,
      tone: 'info',
      title: 'You are close to your target',
      explanation:
        `The offer reaches ${formatPct(c.reachPct, { decimals: 0 })} of your target, ${m(-c.totalGap)} short` +
        (focus ? `; the largest remaining shortfall is in ${LABEL[focus.key]} (${m(-focus.gap)}).` : '.'),
      why: 'When the gap is small, focusing on the single most meaningful component tends to keep the conversation constructive rather than optimizing every line.',
      question: focus
        ? `We are very close — would there be any flexibility on the ${LABEL[focus.key]} to close the remaining ${m(-c.totalGap)}?`
        : `We are very close — is there any flexibility to close the remaining ${m(-c.totalGap)}?`,
      phrase: 'I am excited about this role and we are very close — one adjustment would let me commit with confidence.',
    }
  },

  // Large total gap.
  ({ comparison: c, target }, m) => {
    if (c.totalGapPct === null || c.totalGapPct > -15) return null
    return {
      id: 'large-gap',
      priority: 80,
      tone: 'attention',
      title: 'The total gap is substantial',
      explanation: `The offer is ${formatPct(-c.totalGapPct, { decimals: 0 })} (${m(-c.totalGap)} a year) below your target total of ${m(target.recurring)}.`,
      why: 'A gap of this size is usually easier to address by first aligning on the total, then discussing how it is split across components.',
      question: 'Before we go through individual components, could I share the total compensation I am targeting and the reasoning behind it?',
      phrase: `Based on the scope of the role, I am targeting total annual compensation of around ${m(target.recurring)}.`,
    }
  },

  // FX exposure: fixed-EGP offer measured against a USD-anchored target.
  ({ offer, target, offerInput, rate }, m) => {
    if ((offer.egpFixedShare ?? 0) < 30) return null
    if ((target.egpFixedShare ?? 0) >= 50) return null
    const shock = fxShockImpact(offerInput, rate, 10)
    return {
      id: 'fx-exposure',
      priority: 78,
      tone: 'attention',
      title: 'Much of the offer is fixed in EGP',
      explanation: `${formatPct(offer.egpFixedShare, { decimals: 0 })} of the offer is fixed in EGP. If the rate moved 10% to ${shock.shockedRate.toFixed(2)} EGP/USD, its USD value would ${shock.usdChange < 0 ? 'fall' : 'rise'} by about ${m(Math.abs(shock.usdChange))} a year.`,
      why: 'Your target is set in USD. A fixed EGP salary keeps its EGP amount, so its USD-equivalent value moves with the exchange rate.',
      question: 'Would it be possible to denominate the salary in USD, link it to USD, or agree on a periodic currency adjustment?',
      phrase: 'Given exchange-rate movements, a USD-linked salary or a currency adjustment mechanism would give both sides more predictability.',
    }
  },

  // High equity concentration.
  ({ offer, target }, m) => {
    const share = offer.mixPct.equity ?? 0
    const targetShare = target.mixPct.equity ?? 0
    if (!(share >= 20 || (share >= 10 && share > targetShare + 7))) return null
    return {
      id: 'equity-concentration',
      priority: 70,
      tone: 'info',
      title: 'The offer leans on equity',
      explanation: `Equity is ${formatPct(share, { decimals: 0 })} of the offer (${m(offer.equityAnnual)} a year), compared with ${formatPct(targetShare, { decimals: 0 })} of your target.`,
      why: 'Equity value moves with the share price and reaches you only as it vests. It is not monthly cash, and its value at vesting can differ from the grant value.',
      question: 'What is the vesting schedule, and is the grant fixed as a value or as a number of units on the grant date?',
      phrase: 'I value the equity component, and I would like a little more of the package to be in guaranteed cash.',
    }
  },

  // Bonus-heavy package.
  ({ offer, target }, m) => {
    const share = offer.mixPct.bonus ?? 0
    const targetShare = target.mixPct.bonus ?? 0
    if (!(share >= 15 || (share >= 8 && share > targetShare + 7))) return null
    return {
      id: 'bonus-heavy',
      priority: 65,
      tone: 'info',
      title: 'A large share is target bonus',
      explanation: `The target bonus is ${formatPct(share, { decimals: 0 })} of the offer (${m(offer.bonusTarget)} a year). It is variable, not guaranteed.`,
      why: 'Bonus payouts usually depend on individual and company performance, and first-year bonuses are sometimes prorated.',
      question: 'How has the bonus paid out relative to target in recent years, and is it prorated in the first year?',
      phrase: 'Could part of the target bonus be moved into base, or the first-year bonus be guaranteed?',
    }
  },

  // Large first-year sign-on.
  ({ offer, offerInput }, m) => {
    if (offer.recurring <= 0 || offer.signOnYearOne < offer.recurring * 0.1) return null
    const claw = offerInput.signOn.clawbackMonths
    return {
      id: 'sign-on-first-year',
      priority: 60,
      tone: 'info',
      title: 'Year one is boosted by a sign-on bonus',
      explanation: `Year one totals ${m(offer.firstYear)} including a ${m(offer.signOnYearOne)} sign-on; from year two the recurring package is ${m(offer.recurring)}.`,
      why: `A sign-on bonus is paid once${claw > 0 ? ` and you recorded a ${claw}-month repayment condition` : ''}; it does not raise the recurring package or the base future raises build on.`,
      question: 'Are there repayment conditions on the sign-on bonus, and is it paid in a single installment?',
      phrase: 'I appreciate the sign-on bonus — I would also like to make sure the recurring package reflects the role long term.',
    }
  },

  // Vesting cliff beyond year one.
  ({ offer }, m) => {
    if (!offer.equity || offer.equity.annualized <= 0 || offer.equity.yearOne > 0) return null
    return {
      id: 'vesting-cliff',
      priority: 55,
      tone: 'info',
      title: 'No equity vests in year one',
      explanation: `With the first vest after month 12, year-one compensation excludes the ${m(offer.equity.annualized)} annualized equity.`,
      why: 'A cliff means leaving before it passes forfeits the unvested grant, so year-one cash matters more.',
      question: 'When is the first vesting date, and is there any flexibility on the cliff?',
    }
  },

  // Projections that assume price changes.
  ({ offerInput, offer }, m) => {
    const e = offerInput.components.equity
    if (offerInput.mode !== 'components' || e.mode !== 'advanced' || e.annualPriceChangePct === 0 || !offer.equity) return null
    return {
      id: 'equity-projection',
      priority: 50,
      tone: 'info',
      title: 'Equity projections include an assumption',
      explanation: `At an assumed ${formatPct(e.annualPriceChangePct, { signed: true, decimals: 0 })} annual share-price change, the grant would be worth about ${m(offer.equity.projectedTotal)} at vesting versus a grant value of ${m(offer.equity.grantValue ?? 0)}.`,
      why: 'Share prices can fall as well as rise. Totals in this tool use the initial grant value, not the projection.',
      question: 'How is the number of units calculated from the grant value — which share price and date are used?',
    }
  },

  // Variable compensation heavier than the user wanted.
  ({ offer, target }) => {
    const o = offer.variablePct ?? 0
    const t = target.variablePct ?? 0
    if (o < t + 10 || o < 20) return null
    return {
      id: 'variable-heavier',
      priority: 45,
      tone: 'info',
      title: 'More of the offer is variable than you planned',
      explanation: `${formatPct(o, { decimals: 0 })} of the offer is bonus or equity, versus ${formatPct(t, { decimals: 0 })} in your target.`,
      why: 'Variable pay is not guaranteed; comparing guaranteed cash side by side gives a clearer picture.',
      question: 'Is there flexibility to shift part of the variable compensation into base salary?',
    }
  },
]

export function buildGuidance(input: GuidanceInput, limit = 4): Insight[] {
  const currency = input.currency ?? 'USD'
  const m = (usd: number) => formatMoney(convert(usd, 'USD', currency, input.rate), currency)
  return rules
    .map((r) => r(input, m))
    .filter((x): x is Insight => x !== null)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
}
