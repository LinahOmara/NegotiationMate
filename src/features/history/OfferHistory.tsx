import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, Check, Equal, History, Pencil, Plus, Trash2, Undo2, X } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/toast'
import { useApp } from '@/state/store'
import { useDerived } from '@/lib/useDerived'
import { useMoney } from '@/lib/useMoney'
import { COMPONENT_META } from '@/lib/componentMeta'
import { formatRate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { compareHistory, evaluateHistoryEntry, type Delta, type Direction, type HistoryValues } from '@/calc/history'
import type { ComponentKey, HistoryEntry } from '@/domain/schema'

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })
const formatWhen = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d)
}

const DIRECTION: Record<Direction, { label: string; Icon: typeof Equal; tone: string }> = {
  improved: { label: 'Improved', Icon: ArrowUpRight, tone: 'text-positive' },
  worse: { label: 'Lower', Icon: ArrowDownRight, tone: 'text-negative' },
  same: { label: 'No change', Icon: Equal, tone: 'text-muted' },
}

function MiniBar({ values, max, label }: { values: HistoryValues; max: number; label: string }) {
  const { fmt } = useMoney()
  const parts: [ComponentKey, number][] = [
    ['base', values.guaranteedAnnual],
    ['bonus', values.bonus],
    ['equity', values.equity],
  ]
  const widthPct = max > 0 ? (values.recurring / max) * 100 : 0
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3"
      role="img"
      aria-label={`${label}: base ${fmt(values.guaranteedAnnual)}, bonus ${fmt(values.bonus)}, equity ${fmt(values.equity)}`}
    >
      <motion.div
        className="flex h-full overflow-hidden rounded-full"
        initial={false}
        animate={{ width: `${widthPct}%` }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {parts.map(([k, v]) => (
          <div key={k} style={{ flexGrow: v, flexBasis: 0, background: COMPONENT_META[k].fill }} />
        ))}
      </motion.div>
    </div>
  )
}

function EntryRow({
  entry,
  index,
  values,
  max,
  selected,
  selectionFull,
  onToggle,
  isLast,
}: {
  entry: HistoryEntry
  index: number
  values: HistoryValues
  max: number
  selected: boolean
  selectionFull: boolean
  onToggle: () => void
  isLast: boolean
}) {
  const { fmt } = useMoney()
  const [editingLabel, setEditingLabel] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [labelDraft, setLabelDraft] = useState(entry.label)
  const [notesDraft, setNotesDraft] = useState(entry.notes)

  const saveLabel = () => {
    const v = labelDraft.trim()
    if (v) useApp.getState().updateHistory(entry.id, { label: v.slice(0, 60) })
    setEditingLabel(false)
  }
  const saveNotes = () => {
    useApp.getState().updateHistory(entry.id, { notes: notesDraft.slice(0, 1000) })
    setEditingNotes(false)
  }

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex min-w-0 gap-3"
      data-testid="history-entry"
    >
      <div className="flex flex-col items-center" aria-hidden>
        <span className={cn('mt-4 size-3 shrink-0 rounded-full border-2', selected ? 'border-accent bg-accent' : 'border-line-strong bg-surface')} />
        {!isLast && <span className="w-px flex-1 bg-line" />}
      </div>

      <div className={cn('mb-3 min-w-0 flex-1 rounded-2xl border p-3 sm:p-4', selected ? 'border-accent/50 bg-accent-soft/30' : 'border-line bg-surface')}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editingLabel ? (
              <form
                className="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault()
                  saveLabel()
                }}
              >
                <Input aria-label="Entry label" autoFocus value={labelDraft} maxLength={60} onChange={(e) => setLabelDraft(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setEditingLabel(false)} />
                <Button type="submit" size="icon" variant="secondary" aria-label="Save label">
                  <Check />
                </Button>
              </form>
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <h3 className="min-w-0 break-words font-display-tight text-base font-semibold text-ink">{entry.label}</h3>
                <Button
                  size="icon"
                  variant="subtle"
                  aria-label={`Rename ${entry.label}`}
                  onClick={() => {
                    setLabelDraft(entry.label)
                    setEditingLabel(true)
                  }}
                >
                  <Pencil />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted">
              <time dateTime={entry.timestamp}>{formatWhen(entry.timestamp)}</time>
              <span aria-hidden> · </span>
              <span className="tnum">1 USD = {formatRate(entry.rate)} EGP</span>
            </p>
          </div>
          <button
            type="button"
            aria-pressed={selected}
            data-testid={`history-select-${index}`}
            onClick={onToggle}
            title={selected ? 'Remove from comparison' : selectionFull ? 'Replaces the earliest selected entry' : 'Select to compare'}
            className={cn(
              'inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-[0.8125rem] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              selected ? 'border-accent bg-accent text-white' : 'border-line-strong bg-surface text-ink-soft hover:bg-surface-2',
            )}
          >
            {selected ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            {selected ? 'Selected' : 'Compare'}
          </button>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.8125rem]">
          <div className="min-w-0">
            <dt className="text-muted">Recurring total</dt>
            <dd className="break-words font-semibold tnum">{fmt(values.recurring)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted">Guaranteed base</dt>
            <dd className="break-words font-semibold tnum">{fmt(values.guaranteedAnnual)}</dd>
          </div>
        </dl>
        <div className="mt-2.5">
          <MiniBar values={values} max={max} label={entry.label} />
        </div>

        {editingNotes ? (
          <div className="mt-3 space-y-2">
            <Textarea aria-label="Entry notes" autoFocus value={notesDraft} maxLength={1000} onChange={(e) => setNotesDraft(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={saveNotes}>
                Save notes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2">
            <p className={cn('min-w-0 flex-1 whitespace-pre-wrap break-words text-[0.8125rem]', entry.notes ? 'text-ink-soft' : 'text-muted italic')}>{entry.notes || 'No notes'}</p>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                setNotesDraft(entry.notes)
                setEditingNotes(true)
              }}
            >
              <Pencil /> {entry.notes ? 'Edit notes' : 'Add notes'}
            </Button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              useApp.getState().loadHistoryOffer(entry.id)
              toast(`Loaded “${entry.label}” into the offer panel`, 'info')
            }}
          >
            <Undo2 /> Load into offer
          </Button>
          {confirmDelete ? (
            <span className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirm delete ${entry.label}`}>
              <span className="text-[0.8125rem] font-semibold text-negative">Delete this entry?</span>
              <Button size="sm" variant="primary" onClick={() => useApp.getState().removeHistory(entry.id)}>
                <Trash2 /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                <X /> Keep
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="subtle" aria-label={`Delete ${entry.label}`} onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </div>
    </motion.li>
  )
}

function DeltaCell({ d }: { d: Delta }) {
  const { fmt } = useMoney()
  const { label, Icon, tone } = DIRECTION[d.direction]
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={cn('font-semibold tnum', tone)}>{d.direction === 'same' ? fmt(0) : fmt(d.delta, undefined, { signed: true })}</span>
      <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', tone)}>
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
    </div>
  )
}

function ComparePanel({ a, b, target }: { a: HistoryEntry; b: HistoryEntry; target: Parameters<typeof compareHistory>[2] }) {
  const { fmt } = useMoney()
  const c = useMemo(() => compareHistory(a, b, target), [a, b, target])
  const rows: [string, Delta][] = [
    ['Guaranteed base', c.guaranteed],
    ['Equity', c.equity],
    ['Total recurring', c.recurring],
    ['First year', c.firstYear],
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-5 rounded-2xl border border-line bg-surface-2/60 p-3 sm:p-4"
      data-testid="history-compare"
      role="region"
      aria-label="Comparison of selected offers"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="outline">A</Badge>
        <span className="min-w-0 break-words font-semibold">{a.label}</span>
        <span className="text-muted">to</span>
        <Badge tone="accent">B</Badge>
        <span className="min-w-0 break-words font-semibold">{b.label}</span>
      </div>
      <p className="mb-2 text-xs text-muted">Each offer is valued at the exchange rate recorded with it.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-[0.8125rem]">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th scope="col" className="py-1.5 pr-2 font-semibold">Measure</th>
              <th scope="col" className="px-2 py-1.5 text-right font-semibold">A</th>
              <th scope="col" className="px-2 py-1.5 text-right font-semibold">B</th>
              <th scope="col" className="py-1.5 pl-2 text-right font-semibold">Change (B − A)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, d]) => (
              <tr key={name} className="border-t border-line align-top">
                <th scope="row" className="py-2 pr-2 text-left font-semibold text-ink-soft">{name}</th>
                <td className="px-2 py-2 text-right tnum">{fmt(d.a)}</td>
                <td className="px-2 py-2 text-right tnum">{fmt(d.b)}</td>
                <td className="py-2 pl-2"><DeltaCell d={d} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

export function OfferHistory({ onSave }: { onSave?: () => void } = {}) {
  const history = useApp((s) => s.history)
  const { target } = useDerived()
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const values = useMemo(() => history.map((h) => evaluateHistoryEntry(h, target)), [history, target])
  const max = useMemo(() => Math.max(0, ...values.map((v) => v.recurring)), [values])

  // Drop selections for entries that no longer exist; order by timeline position.
  const selected = history.filter((h) => selectedIds.includes(h.id))
  const pair = selected.length === 2 ? selected : null

  const toggle = (id: string) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.filter((x) => history.some((h) => h.id === x)), id].slice(-2)))

  return (
    <Card data-testid="history-panel" aria-labelledby="history-title">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle id="history-title">Offer History</CardTitle>
          <CardDescription>Oldest first. Select two entries to compare revisions.</CardDescription>
        </div>
        {history.length > 0 && onSave && (
          <Button size="sm" variant="outline" onClick={onSave}>
            <Plus /> Record current offer
          </Button>
        )}
      </CardHeader>

      {history.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center">
          <History className="size-7 text-muted" aria-hidden />
          <p className="max-w-sm text-sm text-ink-soft">
            Record each offer during the call, such as the initial offer and every revision. You will be able to compare them side by side and see how the package changed.
          </p>
          {onSave && (
            <Button variant="accent" onClick={onSave}>
              <Plus /> Record the current offer
            </Button>
          )}
        </div>
      ) : (
        <>
          <ol className="m-0 list-none p-0">
            <AnimatePresence initial={false}>
              {history.map((h, i) => (
                <EntryRow
                  key={h.id}
                  entry={h}
                  index={i}
                  values={values[i]}
                  max={max}
                  selected={selectedIds.includes(h.id)}
                  selectionFull={selected.length >= 2}
                  onToggle={() => toggle(h.id)}
                  isLast={i === history.length - 1}
                />
              ))}
            </AnimatePresence>
          </ol>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" aria-hidden>
            {(['base', 'bonus', 'equity'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: COMPONENT_META[k].fill }} />
                {COMPONENT_META[k].short}
              </span>
            ))}
            <span>Bars share one scale</span>
          </div>
          <AnimatePresence>{pair && <ComparePanel a={pair[0]} b={pair[1]} target={target} />}</AnimatePresence>
          {!pair && history.length > 1 && <p className="mt-4 text-xs text-muted">{selected.length === 1 ? 'Select one more entry to compare.' : 'Select two entries to see what changed.'}</p>}
        </>
      )}
    </Card>
  )
}
