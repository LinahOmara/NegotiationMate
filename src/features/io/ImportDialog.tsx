import { useId, useState } from 'react'
import { AlertCircle, FileJson, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/toast'
import { useApp } from '@/state/store'
import { importJson } from '@/state/persistence'
import { evaluatePackage } from '@/calc/package'
import { formatMoney } from '@/lib/format'
import type { AppData } from '@/domain/schema'

type Parsed = { kind: 'idle' } | { kind: 'ok'; data: AppData } | { kind: 'error'; errors: string[] }

function ImportForm({ onDone }: { onDone: () => void }) {
  const uid = useId()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<Parsed>({ kind: 'idle' })

  const validate = (value: string) => {
    if (value.trim() === '') return setParsed({ kind: 'idle' })
    const r = importJson(value)
    setParsed(r.ok ? { kind: 'ok', data: r.data } : { kind: 'error', errors: r.errors })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const content = await file.text()
      setFileName(file.name)
      setText(content)
      validate(content)
    } catch {
      setParsed({ kind: 'error', errors: ['The file could not be read.'] })
    }
  }

  const confirm = () => {
    if (parsed.kind !== 'ok') return
    useApp.getState().replaceData(parsed.data)
    toast('Imported. Your data was replaced.')
    onDone()
  }

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-[0.8125rem] text-ink-soft">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <span>Your data stays on this device. The file is read in your browser and is never uploaded.</span>
      </p>

      <div className="space-y-2">
        <Label htmlFor={`${uid}-file`}>Choose a .json export</Label>
        <input
          id={`${uid}-file`}
          type="file"
          accept="application/json,.json"
          data-testid="import-file"
          onChange={(e) => void onFile(e.target.files?.[0])}
          className="block min-h-11 w-full min-w-0 cursor-pointer rounded-xl border border-line-strong bg-surface text-sm text-ink file:mr-3 file:h-11 file:cursor-pointer file:border-0 file:bg-surface-2 file:px-4 file:text-sm file:font-semibold file:text-ink hover:file:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        {fileName && (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <FileJson className="size-3.5" aria-hidden />
            <span className="min-w-0 break-all">{fileName}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${uid}-text`}>Or paste JSON</Label>
        <Textarea
          id={`${uid}-text`}
          data-testid="import-text"
          value={text}
          spellCheck={false}
          placeholder='{"app":"compensation-cockpit", ...}'
          className="min-h-32 font-mono text-xs"
          onChange={(e) => {
            setText(e.target.value)
            setFileName(null)
            validate(e.target.value)
          }}
        />
      </div>

      {parsed.kind === 'error' && (
        <div role="alert" data-testid="import-errors" className="rounded-xl border border-negative/30 bg-negative-soft px-3 py-2.5 text-[0.8125rem] text-negative">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="size-4" aria-hidden /> This data can’t be imported
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 break-words">
            {parsed.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {parsed.kind === 'ok' && <Summary data={parsed.data} />}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="accent" data-testid="import-confirm" disabled={parsed.kind !== 'ok'} onClick={confirm}>
          Import and replace current data
        </Button>
      </div>
    </div>
  )
}

function Summary({ data }: { data: AppData }) {
  const target = evaluatePackage(data.target, data.settings.rate)
  return (
    <div className="rounded-xl border border-positive/30 bg-positive-soft px-3 py-2.5 text-[0.8125rem] text-ink" data-testid="import-summary">
      <p className="font-semibold text-positive">Valid file. Ready to import.</p>
      <ul className="mt-1 space-y-0.5 text-ink-soft">
        <li>
          {data.history.length} recorded {data.history.length === 1 ? 'offer' : 'offers'} in history
        </li>
        <li className="tnum">Target total: {formatMoney(target.recurring, 'USD')} per year</li>
        <li className="tnum">Exchange rate: 1 USD = {data.settings.rate.toFixed(2)} EGP</li>
      </ul>
      <p className="mt-1.5 text-xs text-muted">Importing replaces everything currently in the app.</p>
    </div>
  )
}

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Import data" description="Restore a Compensation Cockpit export from a file or pasted JSON." data-testid="import-dialog">
        <ImportForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
