import type { SignOnInput } from '@/domain/schema'
import { MoneyField } from '@/components/MoneyField'
import { NumberField } from '@/components/NumberField'
import { Segmented } from '@/components/ui/segmented'

export function SignOnEditor({ value, onChange }: { value: SignOnInput; onChange: (s: SignOnInput) => void }) {
  const set = (patch: Partial<SignOnInput>) => onChange({ ...value, ...patch })
  return (
    <div className="space-y-4">
      <MoneyField label="Sign-on bonus (one-time)" value={value.amount} onChange={(amount) => set({ amount })} periodToggle={false} testId="offer-signon" hint="Not part of recurring annual compensation." />
      <div className="space-y-2">
        <span className="block text-[0.8125rem] font-semibold text-ink-soft">Paid</span>
        <Segmented
          size="sm"
          layoutId="offer-signon-payment"
          ariaLabel="Sign-on payment timing"
          value={value.payment}
          onChange={(payment) => set({ payment })}
          options={[
            { value: 'yearOne', label: 'In year one' },
            { value: 'split', label: 'Split over two years' },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        {value.payment === 'split' && (
          <NumberField label="Share paid in year one" value={value.yearOnePct} onChange={(yearOnePct) => set({ yearOnePct })} max={100} suffix="%" decimals={0} />
        )}
        <NumberField
          label="Repayment period"
          value={value.clawbackMonths}
          onChange={(v) => set({ clawbackMonths: Math.round(v) })}
          max={60}
          suffix="mo"
          decimals={0}
          hint={value.clawbackMonths > 0 ? `Repayable if you leave within ${value.clawbackMonths} months.` : 'No repayment condition recorded.'}
        />
      </div>
    </div>
  )
}
