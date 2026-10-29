import type { Currency } from '@/domain/schema'

const MINUS = '−'

/** Half-away-from-zero rounding at `decimals`, display only. */
function roundDisplay(v: number, decimals: number) {
  const f = 10 ** decimals
  return (Math.sign(v) * Math.round(Math.abs(v) * f + Number.EPSILON)) / f
}

const groupers = new Map<number, Intl.NumberFormat>()
function grouped(v: number, decimals: number) {
  let f = groupers.get(decimals)
  if (!f) {
    f = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    groupers.set(decimals, f)
  }
  return f.format(v)
}

export const CURRENCY_PREFIX: Record<Currency, string> = { USD: '$', EGP: 'EGP ' }

export interface MoneyFormatOptions {
  decimals?: number
  signed?: boolean
}

export function formatMoney(value: number, currency: Currency, opts: MoneyFormatOptions = {}): string {
  if (!Number.isFinite(value)) return '—'
  const decimals = opts.decimals ?? 0
  const r = roundDisplay(value, decimals)
  const abs = Math.abs(r)
  const sign = r < 0 ? MINUS : opts.signed && r > 0 ? '+' : ''
  return `${sign}${CURRENCY_PREFIX[currency]}${grouped(abs, decimals)}`
}

export function compactMoney(value: number, currency: Currency, opts: { signed?: boolean } = {}): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const sign = value <= -0.5 ? MINUS : opts.signed && value >= 0.5 ? '+' : ''
  let body: string
  if (abs >= 1e6) body = `${trim(abs / 1e6, 2)}M`
  else if (abs >= 1e4) body = `${trim(abs / 1e3, 1)}K`
  else body = grouped(roundDisplay(abs, 0), 0)
  return `${sign}${CURRENCY_PREFIX[currency]}${body}`
}

function trim(v: number, decimals: number) {
  return String(roundDisplay(v, decimals))
}

export function formatPct(value: number | null, opts: { signed?: boolean; decimals?: number } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const decimals = opts.decimals ?? 1
  const r = roundDisplay(value, decimals)
  const sign = r < 0 ? MINUS : opts.signed && r > 0 ? '+' : ''
  return `${sign}${Math.abs(r).toFixed(decimals)}%`
}

export function formatRate(rate: number): string {
  return Number.isFinite(rate) ? rate.toFixed(2) : '—'
}

/**
 * Parse a user-typed amount. Accepts grouping commas, currency symbols and
 * k/m suffixes. Returns null for invalid or negative input; rounds to cents.
 */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/[,\s$]|egp|usd|e£/g, '')
  if (s === '') return 0
  const m = /^(\d*\.?\d*)([km]?)$/.exec(s)
  if (!m || m[1] === '' || m[1] === '.') return null
  const n = Number(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}
