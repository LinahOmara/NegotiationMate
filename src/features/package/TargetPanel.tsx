import { Target } from 'lucide-react'
import { useApp } from '@/state/store'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { MoneyField } from '@/components/MoneyField'
import { DistributionEditor } from './DistributionEditor'
import { useDerived } from '@/lib/useDerived'
import { useMoney } from '@/lib/useMoney'

export function TargetPanel() {
  const target = useApp((s) => s.target)
  const locks = useApp((s) => s.ui.targetLocks)
  const { updateTarget, setTargetMode, toggleLock } = useApp.getState()
  const { target: t } = useDerived()
  const { fmt } = useMoney()

  return (
    <Card aria-labelledby="target-title" data-testid="target-panel">
      <CardHeader>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
              <Target className="size-4" aria-hidden />
            </span>
            <CardTitle id="target-title">Your Target</CardTitle>
          </div>
          <CardDescription>What you want, and how you would like it split.</CardDescription>
        </div>
        <Segmented
          layoutId="target-mode"
          ariaLabel="Target entry mode"
          size="sm"
          value={target.mode}
          onChange={setTargetMode}
          testId="target-mode"
          options={[
            { value: 'distribution', label: 'Percentages' },
            { value: 'components', label: 'Amounts' },
          ]}
        />
      </CardHeader>

      {target.mode === 'distribution' ? (
        <DistributionEditor
          idPrefix="target"
          totalLabel="Total annual target"
          value={target.distribution}
          onChange={(distribution) => updateTarget((p) => ({ ...p, distribution }))}
          locks={locks}
          onToggleLock={(k) => toggleLock('target', k)}
        />
      ) : (
        <div className="space-y-4">
          <MoneyField label="Base salary" value={target.components.base} onChange={(base) => updateTarget((p) => ({ ...p, components: { ...p.components, base } }))} testId="target-base" />
          <MoneyField
            label="Target bonus"
            value={target.components.bonus.fixed}
            onChange={(fixed) => updateTarget((p) => ({ ...p, components: { ...p.components, bonus: { ...p.components.bonus, kind: 'fixed', fixed } } }))}
            testId="target-bonus"
          />
          <MoneyField
            label="Equity (annualized)"
            value={target.components.equity.annualValue}
            onChange={(annualValue) => updateTarget((p) => ({ ...p, components: { ...p.components, equity: { ...p.components.equity, mode: 'simple', annualValue } } }))}
            testId="target-equity"
          />
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-sm font-semibold text-ink-soft">Total annual target</span>
            <span className="font-display-tight text-lg font-semibold tnum" data-testid="target-computed-total">
              {fmt(t.recurring)}
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}
