import { useId, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/toast'
import { useApp } from '@/state/store'
import { useDerived } from '@/lib/useDerived'
import { useMoney } from '@/lib/useMoney'
import { formatRate } from '@/lib/format'
import { cn } from '@/lib/cn'

const QUICK_LABELS = ['Initial Offer', 'Revised Offer 1', 'Revised Offer 2', 'Final Offer'] as const
const CURRENT = '__current__'

function SaveForm({ onDone }: { onDone: () => void }) {
  const historyLength = useApp((s) => s.history.length)
  const scenarios = useApp((s) => s.scenarios)
  const activeScenarioId = useApp((s) => s.activeScenarioId)
  const { offer, scenarioResults, rate } = useDerived()
  const { fmt } = useMoney()
  const uid = useId()

  const [label, setLabel] = useState<string>(QUICK_LABELS[Math.min(historyLength, QUICK_LABELS.length - 1)])
  const [notes, setNotes] = useState('')
  const [choice, setChoice] = useState<string>(CURRENT)

  const active = scenarios.find((s) => s.id === activeScenarioId)
  const showScenario = !!active && active.strategy !== 'none'
  const scenarioId = choice === CURRENT ? undefined : choice
  const recurring = scenarioId ? (scenarioResults.find((r) => r.scenario.id === scenarioId)?.result.recurring ?? offer.recurring) : offer.recurring

  const save = () => {
    useApp.getState().saveToHistory(label, notes, scenarioId)
    toast(`Recorded “${label.trim() || 'offer'}”`)
    onDone()
  }

  const options = [{ value: CURRENT, title: 'The current offer', desc: 'Exactly as entered in the offer panel' }]
  if (showScenario && active) options.push({ value: active.id, title: `Counteroffer: ${active.name}`, desc: 'The current offer plus this scenario’s adjustments' })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`${uid}-label`}>Label</Label>
        <Input id={`${uid}-label`} data-testid="save-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick labels">
          {QUICK_LABELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={label === l}
              onClick={() => setLabel(l)}
              className={cn(
                'min-h-10 rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                label === l ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line-strong bg-surface text-ink-soft hover:bg-surface-2',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${uid}-notes`}>Notes (optional)</Label>
        <Textarea id={`${uid}-notes`} data-testid="save-notes" value={notes} maxLength={1000} placeholder="e.g. Recruiter said the base is band-limited" onChange={(e) => setNotes(e.target.value)} />
      </div>

      {options.length > 1 && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[0.8125rem] font-semibold text-ink-soft">What to record</legend>
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                choice === o.value ? 'border-accent bg-accent-soft/50' : 'border-line-strong hover:bg-surface-2',
              )}
            >
              <input type="radio" name={`${uid}-what`} className="mt-1 size-4 accent-[var(--accent)]" checked={choice === o.value} onChange={() => setChoice(o.value)} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{o.title}</span>
                <span className="block text-xs text-muted">{o.desc}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-[0.8125rem] text-ink-soft" data-testid="save-preview">
        <span className="font-semibold tnum">{fmt(recurring)}</span> recurring per year. Recorded at 1 USD = <span className="tnum">{formatRate(rate)}</span> EGP.
      </p>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" data-testid="save-confirm">
          Save to history
        </Button>
      </div>
    </form>
  )
}

export function SaveOfferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Record this offer" description="Keep a snapshot of the offer as it stands, so you can compare revisions later." data-testid="save-dialog">
        <SaveForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
