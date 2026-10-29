import type { BonusInput } from '@/domain/schema'
import { MoneyField } from '@/components/MoneyField'
import { NumberField } from '@/components/NumberField'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useMoney } from '@/lib/useMoney'
import { bonusPayoutScenarios } from '@/calc/bonus'

interface Props {
  idPrefix: string
  value: BonusInput
  onChange: (b: BonusInput) => void
  /** Annual base in USD, for % of base previews. */
  baseUsd: number
  targetUsd: number
  advanced?: boolean
}

export function BonusEditor({ idPrefix, value, onChange, targetUsd, advanced = true }: Props) {
  const { fmt } = useMoney()
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-semibold text-ink-soft">Target bonus</span>
        <Segmented
          size="sm"
          layoutId={`${idPrefix}-bonus-kind`}
          ariaLabel="Bonus expressed as"
          value={value.kind}
          onChange={(kind) => onChange({ ...value, kind })}
          options={[
            { value: 'percentOfBase', label: '% of base' },
            { value: 'fixed', label: 'Fixed amount' },
          ]}
        />
      </div>
      {value.kind === 'percentOfBase' ? (
        <NumberField
          label="Bonus as % of base"
          value={value.percentOfBase}
          onChange={(percentOfBase) => onChange({ ...value, percentOfBase })}
          max={500}
          suffix="%"
          hint={`= ${fmt(targetUsd)} a year at target`}
          testId={`${idPrefix}-bonus-pct`}
        />
      ) : (
        <MoneyField label="Annual target bonus" value={value.fixed} onChange={(fixed) => onChange({ ...value, fixed })} testId={`${idPrefix}-bonus-fixed`} />
      )}
      {advanced && (
        <>
          <NumberField
            label="Estimated payout (% of target)"
            value={value.expectedPayoutPct}
            onChange={(expectedPayoutPct) => onChange({ ...value, expectedPayoutPct })}
            max={300}
            suffix="%"
            hint="Your estimate, not a guarantee. Totals use the target amount."
            testId={`${idPrefix}-bonus-payout`}
          />
          <div className="grid grid-cols-4 gap-1.5" aria-label="Bonus payout scenarios">
            {bonusPayoutScenarios(targetUsd).map((s) => (
              <div key={s.payoutPct} className="rounded-xl bg-surface-2 px-2 py-1.5 text-center">
                <div className="text-[0.6875rem] font-semibold text-muted">{s.payoutPct}%</div>
                <div className="truncate text-xs font-semibold tnum">{fmt(s.amount)}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${idPrefix}-bonus-guaranteed`} className="font-medium">
              First-year bonus guaranteed at target
            </Label>
            <Switch id={`${idPrefix}-bonus-guaranteed`} checked={value.guaranteedFirstYear} onCheckedChange={(guaranteedFirstYear) => onChange({ ...value, guaranteedFirstYear })} />
          </div>
        </>
      )}
    </div>
  )
}
