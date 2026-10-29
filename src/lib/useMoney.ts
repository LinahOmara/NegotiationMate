import { useCallback } from 'react'
import { useApp } from '@/state/store'
import { convert } from '@/calc/money'
import { compactMoney, formatMoney, type MoneyFormatOptions } from './format'
import type { Currency } from '@/domain/schema'

/** Display-currency helpers. Inputs are canonical annual USD values. */
export function useMoney() {
  const displayMode = useApp((s) => s.settings.displayMode)
  const emphasis = useApp((s) => s.settings.emphasis)
  const rate = useApp((s) => s.settings.rate)

  const primary: Currency = displayMode === 'BOTH' ? emphasis : displayMode
  const secondary: Currency | null = displayMode === 'BOTH' ? (emphasis === 'USD' ? 'EGP' : 'USD') : null

  const inCur = useCallback((usd: number, c: Currency) => convert(usd, 'USD', c, rate), [rate])
  const fmt = useCallback((usd: number, c: Currency = primary, opts?: MoneyFormatOptions) => formatMoney(inCur(usd, c), c, opts), [inCur, primary])
  const compact = useCallback((usd: number, c: Currency = primary, opts?: { signed?: boolean }) => compactMoney(inCur(usd, c), c, opts), [inCur, primary])

  return { primary, secondary, rate, inCur, fmt, compact }
}
