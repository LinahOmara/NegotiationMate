import type {
  Adjustments,
  AppData,
  BonusInput,
  ComponentsInput,
  EquityInput,
  OfferInput,
  PackageInput,
  Scenario,
  SignOnInput,
} from './schema'

const usd = (amount: number, period: 'monthly' | 'annual' = 'annual') => ({ amount, currency: 'USD' as const, period })

export const DEFAULT_RATE = 53

export function emptyBonus(): BonusInput {
  return { kind: 'percentOfBase', percentOfBase: 0, fixed: usd(0), expectedPayoutPct: 100, guaranteedFirstYear: false }
}

export function emptyEquity(): EquityInput {
  return {
    mode: 'simple',
    annualValue: usd(0),
    grantValue: usd(0),
    vestingYears: 4,
    schedule: 'annual',
    customYearPcts: [25, 25, 25, 25],
    firstVestMonths: 12,
    annualPriceChangePct: 0,
    includeRefresh: false,
    refreshAnnualValue: usd(0),
  }
}

export function emptyComponents(): ComponentsInput {
  return { base: usd(0), bonus: emptyBonus(), equity: emptyEquity() }
}

export function emptyPackage(): PackageInput {
  return {
    mode: 'distribution',
    distribution: { total: usd(0), basePct: 100, bonusPct: 0, equityPct: 0 },
    components: emptyComponents(),
  }
}

export function emptySignOn(): SignOnInput {
  return { amount: usd(0), payment: 'yearOne', yearOnePct: 100, clawbackMonths: 12 }
}

export function emptyOffer(): OfferInput {
  return { ...emptyPackage(), signOn: emptySignOn(), usdPayment: 'usd', baseBandLimited: false }
}

export const zeroAdjustments = (): Adjustments => ({ base: 0, bonus: 0, equity: 0, signOn: 0 })

export function defaultScenarios(): Scenario[] {
  return [
    { id: 'current', name: 'Current Offer', strategy: 'none', adjustments: zeroAdjustments() },
    { id: 'balanced', name: 'Balanced Counteroffer', strategy: 'balanced', adjustments: zeroAdjustments() },
    { id: 'base-first', name: 'Base-First Counteroffer', strategy: 'baseFirst', adjustments: zeroAdjustments() },
  ]
}

/** Seeded, editable demonstration data. Not real employer information. */
export function demoData(): AppData {
  return {
    settings: { displayMode: 'BOTH', emphasis: 'USD', rate: DEFAULT_RATE, isDemo: true },
    target: {
      mode: 'distribution',
      distribution: { total: usd(70900), basePct: 85, bonusPct: 10, equityPct: 5 },
      components: {
        base: usd(60265),
        bonus: { ...emptyBonus(), kind: 'fixed', fixed: usd(7090) },
        equity: { ...emptyEquity(), annualValue: usd(3545) },
      },
    },
    offer: {
      mode: 'distribution',
      distribution: { total: usd(49000), basePct: 80, bonusPct: 10, equityPct: 10 },
      components: {
        base: usd(39200),
        bonus: { ...emptyBonus(), kind: 'fixed', fixed: usd(4900) },
        equity: { ...emptyEquity(), annualValue: usd(4900), grantValue: usd(19600) },
      },
      signOn: emptySignOn(),
      usdPayment: 'usd',
      baseBandLimited: false,
    },
    scenarios: defaultScenarios(),
    activeScenarioId: 'balanced',
    history: [],
  }
}

/** "Start fresh": blank inputs, settings preserved by the caller. */
export function blankData(): AppData {
  const d = demoData()
  return {
    ...d,
    settings: { ...d.settings, isDemo: false },
    target: emptyPackage(),
    offer: emptyOffer(),
    history: [],
  }
}
