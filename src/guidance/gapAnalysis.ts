import { convert } from '@/calc/money'
import { fxShockImpact } from '@/calc/fx'
import { formatMoney, formatPct } from '@/lib/format'
import type { GuidanceInput } from './engine'

/** Plain-English, factual statements about the gap. Each appears only when the numbers support it. */
export interface GapFact {
  id: 'total-gap' | 'base-gap' | 'variable-share' | 'equity-reliance' | 'first-year' | 'fx-effect'
  title: string
  text: string
  tone: 'negative' | 'positive' | 'neutral'
}

export function gapAnalysis(input: GuidanceInput): GapFact[] {
  const { target, offer, comparison: c, offerInput, rate } = input
  const currency = input.currency ?? 'USD'
  const m = (usd: number) => formatMoney(convert(usd, 'USD', currency, rate), currency)
  const facts: GapFact[] = []

  if (target.recurring > 0 && offer.recurring > 0) {
    const above = c.totalGap >= 0.5
    const even = Math.abs(c.totalGap) < 0.5
    let text = even
      ? 'Your total offer matches your target.'
      : `Your total offer is ${m(Math.abs(c.totalGap))} ${above ? 'above' : 'below'} target.`
    if (!above && !even && c.baseGap < -0.5) {
      text =
        -c.baseGap >= -c.totalGap - 0.5
          ? `Your total offer is ${m(-c.totalGap)} below target, and base salary alone is ${m(-c.baseGap)} below your target base.`
          : `Your total offer is ${m(-c.totalGap)} below target, but only ${m(-c.baseGap)} of that difference is in base salary.`
    }
    facts.push({ id: 'total-gap', title: 'Total gap', text, tone: above || even ? 'positive' : 'negative' })
  }

  if (target.base > 0 && Math.abs(c.baseGap) >= 0.5 && offer.base > 0) {
    facts.push({
      id: 'base-gap',
      title: 'Guaranteed base',
      text: `Guaranteed base is ${m(Math.abs(c.monthlyBaseGap))} a month ${c.baseGap < 0 ? 'below' : 'above'} your target (${m(offer.guaranteedMonthly)} vs ${m(target.guaranteedMonthly)}).`,
      tone: c.baseGap < 0 ? 'negative' : 'positive',
    })
  }

  if (offer.recurring > 0 && offer.variable > 0.5) {
    facts.push({
      id: 'variable-share',
      title: 'Variable pay',
      text: `${m(offer.variable)} (${formatPct(offer.variablePct, { decimals: 0 })}) of the offer is variable — target bonus and equity are not guaranteed${target.variablePct !== null ? `; your target has ${formatPct(target.variablePct, { decimals: 0 })} variable` : ''}.`,
      tone: 'neutral',
    })
  }

  const oe = offer.mixPct.equity ?? 0
  const te = target.mixPct.equity ?? 0
  if (offer.recurring > 0 && oe > te + 0.5) {
    facts.push({
      id: 'equity-reliance',
      title: 'Equity reliance',
      text: `The offer relies more on equity than your target: ${formatPct(oe, { decimals: 0 })} vs ${formatPct(te, { decimals: 0 })} of the package.`,
      tone: 'neutral',
    })
  }

  const fyDiff = offer.firstYear - offer.recurring
  if (offer.recurring > 0 && Math.abs(fyDiff) >= 0.5) {
    const parts: string[] = []
    if (offer.signOnYearOne > 0) parts.push(`a ${m(offer.signOnYearOne)} sign-on bonus`)
    if (offer.equity && offer.equity.yearOne !== offer.equity.annualized) parts.push('the equity vesting schedule')
    facts.push({
      id: 'first-year',
      title: 'Year one vs ongoing',
      text: `Year one is ${m(Math.abs(fyDiff))} ${fyDiff > 0 ? 'higher' : 'lower'} than the ongoing annual package (${m(offer.firstYear)} vs ${m(offer.recurring)})${parts.length ? `, because of ${parts.join(' and ')}` : ''}.`,
      tone: 'neutral',
    })
  }

  if ((offer.egpFixedShare ?? 0) > 0.5) {
    const shock = fxShockImpact(offerInput, rate, 10)
    facts.push({
      id: 'fx-effect',
      title: 'Exchange-rate effect',
      text: `${formatPct(offer.egpFixedShare, { decimals: 0 })} of the offer is fixed in EGP. At ${shock.shockedRate.toFixed(2)} EGP/USD (+10%), its USD-equivalent would be ${formatMoney(shock.usdLater, 'USD')} instead of ${formatMoney(shock.usdNow, 'USD')}.`,
      tone: 'neutral',
    })
  }

  return facts
}
