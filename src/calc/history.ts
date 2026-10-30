import type { HistoryEntry } from '@/domain/schema'
import { D, num } from './money'
import { evaluateOffer, type PackageResult } from './package'
import { applyAdjustments } from './scenarios'

/** A recorded offer evaluated at its own stored rate. Annual USD. */
export interface HistoryValues {
  recurring: number
  /** Guaranteed cash: base salary. */
  guaranteedAnnual: number
  equity: number
  bonus: number
  firstYear: number
  signOn: number
}

export type Direction = 'improved' | 'worse' | 'same'

export interface Delta {
  a: number
  b: number
  /** b − a */
  delta: number
  direction: Direction
}

export interface HistoryComparison {
  guaranteed: Delta
  equity: Delta
  recurring: Delta
  firstYear: Delta
}

export function evaluateHistoryEntry(entry: HistoryEntry, target: PackageResult): HistoryValues {
  const offer = evaluateOffer(entry.offer, entry.rate)
  const r = applyAdjustments(offer, entry.adjustments, target)
  return {
    recurring: r.recurring,
    guaranteedAnnual: r.base,
    equity: r.equity,
    bonus: r.bonus,
    firstYear: r.firstYear,
    signOn: r.signOn,
  }
}

function delta(a: number, b: number): Delta {
  const d = num(D(b).minus(D(a)))
  return { a, b, delta: d, direction: Math.abs(d) < 0.5 ? 'same' : d > 0 ? 'improved' : 'worse' }
}

export function compareHistory(a: HistoryEntry, b: HistoryEntry, target: PackageResult): HistoryComparison {
  const x = evaluateHistoryEntry(a, target)
  const y = evaluateHistoryEntry(b, target)
  return {
    guaranteed: delta(x.guaranteedAnnual, y.guaranteedAnnual),
    equity: delta(x.equity, y.equity),
    recurring: delta(x.recurring, y.recurring),
    firstYear: delta(x.firstYear, y.firstYear),
  }
}
