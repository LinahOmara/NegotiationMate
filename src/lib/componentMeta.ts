import type { ComponentKey } from '@/domain/schema'

export const COMPONENT_META: Record<ComponentKey, { label: string; short: string; swatch: string; text: string; fill: string; note: string }> = {
  base: { label: 'Base salary', short: 'Base', swatch: 'bg-base', text: 'text-base', fill: 'var(--comp-base)', note: 'Guaranteed cash' },
  bonus: { label: 'Target bonus', short: 'Bonus', swatch: 'bg-bonus', text: 'text-bonus', fill: 'var(--comp-bonus)', note: 'Variable, not guaranteed' },
  equity: { label: 'Equity / RSUs', short: 'Equity', swatch: 'bg-equity', text: 'text-equity', fill: 'var(--comp-equity)', note: 'Vests over time, not cash' },
}
