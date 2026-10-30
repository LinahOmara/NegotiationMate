import { z } from 'zod'

/**
 * Compensation data model.
 *
 * Every monetary value carries its own source currency and period. The
 * currency a value is entered in is also its *anchor*: a USD amount stays
 * constant in USD when the exchange rate moves, a fixed EGP amount stays
 * constant in EGP. Conversions happen only through `calc/money.ts`.
 */

export const CURRENCIES = ['USD', 'EGP'] as const
export const currencySchema = z.enum(CURRENCIES)
export type Currency = z.infer<typeof currencySchema>

export const periodSchema = z.enum(['monthly', 'annual'])
export type Period = z.infer<typeof periodSchema>

const nonNegative = z.number().finite().min(0)

export const moneySchema = z.object({
  amount: nonNegative,
  currency: currencySchema,
  period: periodSchema,
})
export type Money = z.infer<typeof moneySchema>

export const COMPONENTS = ['base', 'bonus', 'equity'] as const
export type ComponentKey = (typeof COMPONENTS)[number]

export const distributionSchema = z.object({
  total: moneySchema,
  basePct: z.number().finite().min(0).max(100),
  bonusPct: z.number().finite().min(0).max(100),
  equityPct: z.number().finite().min(0).max(100),
})
export type Distribution = z.infer<typeof distributionSchema>

export const bonusSchema = z.object({
  /** How the target bonus is expressed. */
  kind: z.enum(['percentOfBase', 'fixed']),
  percentOfBase: z.number().finite().min(0).max(500),
  fixed: moneySchema,
  /** Expected payout as % of target (100 = paid at target). Not guaranteed. */
  expectedPayoutPct: z.number().finite().min(0).max(300),
  /** Employer contractually guarantees the target bonus in year one. */
  guaranteedFirstYear: z.boolean(),
})
export type BonusInput = z.infer<typeof bonusSchema>

export const vestingScheduleSchema = z.enum(['annual', 'quarterly', 'custom'])
export type VestingSchedule = z.infer<typeof vestingScheduleSchema>

export const equitySchema = z.object({
  mode: z.enum(['simple', 'advanced']),
  /** Simple mode: annualized equity value. */
  annualValue: moneySchema,
  /** Advanced mode: total initial grant value (period is ignored). */
  grantValue: moneySchema,
  vestingYears: z.number().int().min(1).max(10),
  schedule: vestingScheduleSchema,
  /** Custom schedule: % of grant vesting in each year (length = vestingYears). */
  customYearPcts: z.array(z.number().finite().min(0).max(100)).max(10),
  /** Months from start until the first vest (cliff). 12 = one-year cliff. */
  firstVestMonths: z.number().int().min(0).max(48),
  /** Assumed annual share-price change, %. Projection only. */
  annualPriceChangePct: z.number().finite().min(-90).max(200),
  /** Refresh grants are never assumed unless the user opts in. */
  includeRefresh: z.boolean(),
  refreshAnnualValue: moneySchema,
})
export type EquityInput = z.infer<typeof equitySchema>

export const signOnSchema = z.object({
  amount: moneySchema,
  payment: z.enum(['yearOne', 'split']),
  /** When split: share paid in year one, remainder in year two. */
  yearOnePct: z.number().finite().min(0).max(100),
  /** Repayment (clawback) period in months; 0 = none. */
  clawbackMonths: z.number().int().min(0).max(60),
})
export type SignOnInput = z.infer<typeof signOnSchema>

export const componentsSchema = z.object({
  base: moneySchema,
  bonus: bonusSchema,
  equity: equitySchema,
})
export type ComponentsInput = z.infer<typeof componentsSchema>

export const packageSchema = z.object({
  mode: z.enum(['distribution', 'components']),
  distribution: distributionSchema,
  components: componentsSchema,
})
export type PackageInput = z.infer<typeof packageSchema>

/**
 * How USD amounts in the offer are paid. EGP amounts are always treated as
 * contractually fixed in EGP.
 *  - usd: paid in USD.
 *  - usdLinkedEgp: USD-denominated reference, paid in EGP at the prevailing rate.
 */
export const usdPaymentSchema = z.enum(['usd', 'usdLinkedEgp'])
export type UsdPayment = z.infer<typeof usdPaymentSchema>

export const offerSchema = packageSchema.extend({
  signOn: signOnSchema,
  usdPayment: usdPaymentSchema,
  /** User-recorded: recruiter indicated base is constrained by a band. */
  baseBandLimited: z.boolean(),
})
export type OfferInput = z.infer<typeof offerSchema>

export const adjustmentsSchema = z.object({
  /** Annual USD amounts. May be negative when the mix is reshaped. */
  base: z.number().finite(),
  bonus: z.number().finite(),
  equity: z.number().finite(),
  signOn: z.number().finite().min(0),
})
export type Adjustments = z.infer<typeof adjustmentsSchema>

export const scenarioStrategySchema = z.enum(['none', 'balanced', 'baseFirst', 'custom'])
export type ScenarioStrategy = z.infer<typeof scenarioStrategySchema>

export const scenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  strategy: scenarioStrategySchema,
  adjustments: adjustmentsSchema,
  note: z.string().max(400).optional(),
})
export type Scenario = z.infer<typeof scenarioSchema>

export const historyEntrySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(60),
  timestamp: z.string().min(1),
  notes: z.string().max(1000),
  rate: z.number().finite().positive(),
  offer: offerSchema,
  /** Scenario adjustments applied when recorded (zero for a plain offer). */
  adjustments: adjustmentsSchema,
})
export type HistoryEntry = z.infer<typeof historyEntrySchema>

export const displayModeSchema = z.enum(['USD', 'EGP', 'BOTH'])
export type DisplayMode = z.infer<typeof displayModeSchema>

export const settingsSchema = z.object({
  displayMode: displayModeSchema,
  /** Currency shown first / larger when displayMode is BOTH. */
  emphasis: currencySchema,
  /** User-provided assumption: EGP per 1 USD. Never a live rate. */
  rate: z.number().finite().positive().max(100000),
  isDemo: z.boolean(),
})
export type Settings = z.infer<typeof settingsSchema>

export const SCHEMA_VERSION = 1

export const appDataSchema = z.object({
  settings: settingsSchema,
  target: packageSchema,
  offer: offerSchema,
  scenarios: z.array(scenarioSchema).min(1).max(12),
  activeScenarioId: z.string(),
  history: z.array(historyEntrySchema).max(200),
})
export type AppData = z.infer<typeof appDataSchema>

export const persistedSchema = z.object({
  app: z.literal('compensation-cockpit'),
  version: z.literal(SCHEMA_VERSION),
  savedAt: z.string(),
  data: appDataSchema,
})
export type PersistedEnvelope = z.infer<typeof persistedSchema>
