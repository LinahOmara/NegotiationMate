import { describe, expect, it } from 'vitest'
import { formatMoney, formatPct, formatRate, parseAmount, compactMoney } from './format'

describe('formatMoney', () => {
  it('formats USD and EGP with grouping and no decimals by default', () => {
    expect(formatMoney(70900, 'USD')).toBe('$70,900')
    expect(formatMoney(3757700, 'EGP')).toBe('EGP 3,757,700')
  })
  it('uses a true minus sign and optional explicit plus', () => {
    expect(formatMoney(-21900, 'USD')).toBe('−$21,900')
    expect(formatMoney(500, 'USD', { signed: true })).toBe('+$500')
  })
  it('never displays negative zero', () => {
    expect(formatMoney(-0.2, 'USD')).toBe('$0')
    expect(formatMoney(-0.2, 'USD', { signed: true })).toBe('$0')
  })
  it('rounds for display only, half away from zero', () => {
    expect(formatMoney(4416.666, 'USD', { decimals: 2 })).toBe('$4,416.67')
    expect(formatMoney(2.5, 'USD')).toBe('$3')
  })
  it('renders non-finite values as an em dash, never NaN/Infinity', () => {
    expect(formatMoney(Number.NaN, 'USD')).toBe('—')
    expect(formatMoney(Number.POSITIVE_INFINITY, 'USD')).toBe('—')
  })
  it('compacts large numbers', () => {
    expect(compactMoney(70900, 'USD')).toBe('$70.9K')
    expect(compactMoney(3757700, 'EGP')).toBe('EGP 3.76M')
  })
})

describe('formatPct', () => {
  it('formats with sign and one decimal', () => {
    expect(formatPct(-30.888)).toBe('−30.9%')
    expect(formatPct(12.34, { signed: true })).toBe('+12.3%')
    expect(formatPct(null)).toBe('—')
    expect(formatPct(-0.01)).toBe('0.0%')
  })
})

describe('formatRate', () => {
  it('formats rates', () => {
    expect(formatRate(53)).toBe('53.00')
  })
})

describe('parseAmount', () => {
  it('parses formatted input', () => {
    expect(parseAmount('70,900')).toBe(70900)
    expect(parseAmount(' $1,234.567 ')).toBe(1234.57)
    expect(parseAmount('')).toBe(0)
  })
  it('rejects negative and invalid input', () => {
    expect(parseAmount('-5')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1.2.3')).toBeNull()
  })
  it('supports k / m shorthand', () => {
    expect(parseAmount('70.9k')).toBe(70900)
    expect(parseAmount('1.2m')).toBe(1200000)
  })
})
