import type { EquityInput } from '@/domain/schema'
import { MoneyField } from '@/components/MoneyField'
import { NumberField } from '@/components/NumberField'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useMoney } from '@/lib/useMoney'
import { evaluateEquity } from '@/calc/equity'
import { formatPct } from '@/lib/format'

interface Props {
  idPrefix: string
  value: EquityInput
  onChange: (e: EquityInput) => void
  rate: number
  allowAdvanced?: boolean
}

export function EquityEditor({ idPrefix, value, onChange, rate, allowAdvanced = true }: Props) {
  const { fmt } = useMoney()
  const result = evaluateEquity(value, 'USD', rate)
  const set = (patch: Partial<EquityInput>) => onChange({ ...value, ...patch })

  const setYears = (vestingYears: number) => {
    const n = Math.max(1, Math.min(10, Math.round(vestingYears)))
    const even = Math.round((100 / n) * 100) / 100
    set({ vestingYears: n, customYearPcts: Array.from({ length: n }, (_, i) => value.customYearPcts[i] ?? even) })
  }

  return (
    <div className="space-y-4">
      {allowAdvanced && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[0.8125rem] font-semibold text-ink-soft">Equity / RSUs</span>
          <Segmented
            size="sm"
            layoutId={`${idPrefix}-equity-mode`}
            ariaLabel="Equity entry mode"
            value={value.mode}
            onChange={(mode) => set({ mode })}
            options={[
              { value: 'simple', label: 'Annual value' },
              { value: 'advanced', label: 'Grant & vesting' },
            ]}
            testId={`${idPrefix}-equity-mode`}
          />
        </div>
      )}

      {value.mode === 'simple' || !allowAdvanced ? (
        <MoneyField
          label="Annualized equity value"
          value={value.annualValue}
          onChange={(annualValue) => set({ annualValue })}
          hint="Value expected to vest per year. Not monthly cash."
          testId={`${idPrefix}-equity-annual`}
        />
      ) : (
        <div className="space-y-4">
          <MoneyField
            label="Total initial grant value"
            value={value.grantValue}
            onChange={(grantValue) => set({ grantValue })}
            periodToggle={false}
            hint={`Counted as ${fmt(result.annualized)} a year over ${value.vestingYears} years — not the full grant every year.`}
            testId={`${idPrefix}-equity-grant`}
          />
          <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
            <NumberField label="Vesting duration" value={value.vestingYears} onChange={setYears} min={1} max={10} suffix="yrs" decimals={0} testId={`${idPrefix}-equity-years`} />
            <NumberField
              label="First vest after"
              value={value.firstVestMonths}
              onChange={(firstVestMonths) => set({ firstVestMonths: Math.round(firstVestMonths) })}
              min={0}
              max={48}
              suffix="mo"
              decimals={0}
              hint={value.firstVestMonths > 12 ? 'Nothing vests in year one.' : value.firstVestMonths === 12 ? 'One-year cliff.' : undefined}
              testId={`${idPrefix}-equity-cliff`}
            />
          </div>
          <div className="space-y-2">
            <span className="block text-[0.8125rem] font-semibold text-ink-soft">Vesting schedule</span>
            <Segmented
              size="sm"
              className="w-full"
              layoutId={`${idPrefix}-equity-schedule`}
              ariaLabel="Vesting schedule"
              value={value.schedule}
              onChange={(schedule) => set({ schedule })}
              options={[
                { value: 'annual', label: 'Equal annual' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </div>
          {value.schedule === 'custom' && (
            <div className="grid grid-cols-2 gap-2 xs:grid-cols-4">
              {Array.from({ length: value.vestingYears }, (_, i) => (
                <NumberField
                  key={i}
                  label={`Year ${i + 1}`}
                  size="sm"
                  value={value.customYearPcts[i] ?? 0}
                  onChange={(v) => {
                    const next = Array.from({ length: value.vestingYears }, (_, j) => value.customYearPcts[j] ?? 0)
                    next[i] = v
                    set({ customYearPcts: next })
                  }}
                  max={100}
                  suffix="%"
                />
              ))}
              <p className="col-span-full text-xs text-muted">
                Sums to {Math.round(value.customYearPcts.slice(0, value.vestingYears).reduce((s, v) => s + v, 0) * 10) / 10}% — normalized to 100% for calculations.
              </p>
            </div>
          )}
          <NumberField
            label="Assumed annual share-price change"
            value={value.annualPriceChangePct}
            onChange={(annualPriceChangePct) => set({ annualPriceChangePct })}
            min={-90}
            max={200}
            suffix="%"
            hint="Projection only. Headline totals use the initial grant value."
            testId={`${idPrefix}-equity-growth`}
          />
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-xs tnum">
              <caption className="sr-only">Equity vesting by year</caption>
              <thead className="bg-surface-2 text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Year</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">At grant value</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">At vesting (est.)</th>
                </tr>
              </thead>
              <tbody>
                {result.byYear.map((v, i) => (
                  <tr key={i} className="border-t border-line">
                    <th scope="row" className="px-3 py-1.5 text-left font-semibold">Year {i + 1}</th>
                    <td className="px-3 py-1.5 text-right">{fmt(v)}</td>
                    <td className="px-3 py-1.5 text-right text-muted">{fmt(result.projectedByYear[i] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {value.annualPriceChangePct !== 0 && (
              <p className="border-t border-line bg-surface-2/60 px-3 py-2 text-xs text-muted">
                Estimated at {formatPct(value.annualPriceChangePct, { signed: true, decimals: 0 })} a year. Share prices can fall as well as rise.
              </p>
            )}
          </div>
          <div className="space-y-3 rounded-xl bg-surface-2/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${idPrefix}-refresh`} className="font-medium">
                Include refresh grants (assumption)
              </Label>
              <Switch id={`${idPrefix}-refresh`} checked={value.includeRefresh} onCheckedChange={(includeRefresh) => set({ includeRefresh })} />
            </div>
            {value.includeRefresh ? (
              <MoneyField
                label="Assumed annual refresh value"
                value={value.refreshAnnualValue}
                onChange={(refreshAnnualValue) => set({ refreshAnnualValue })}
                hint="Added to year two onward only. Refreshes are not guaranteed."
              />
            ) : (
              <p className="text-xs text-muted">Refresh grants are not assumed unless you add them.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
