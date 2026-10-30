import { useState } from 'react'
import { Download, FileJson, MoreHorizontal, Printer, RotateCcw, Save, ScanEye, Sparkles, Upload } from 'lucide-react'
import { useApp } from '@/state/store'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Logo } from './Logo'
import { CurrencySwitcher } from './CurrencySwitcher'
import { RateControl } from './RateControl'
import { SaveOfferDialog } from '@/features/history/SaveOfferDialog'
import { ImportDialog } from '@/features/io/ImportDialog'
import { exportScenarioFile } from '@/features/io/exportFile'
import { toast } from '@/components/toast'

export function useHeaderDialogs() {
  const [saveOpen, setSaveOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  return { saveOpen, setSaveOpen, importOpen, setImportOpen }
}

export function Header({ onSave, onImport }: { onSave: () => void; onImport: () => void }) {
  const setFocusMode = useApp((s) => s.setFocusMode)
  const resetDemo = useApp((s) => s.resetDemo)
  const startFresh = useApp((s) => s.startFresh)

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Logo className="size-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display-tight text-[1.0625rem] font-semibold leading-tight xs:text-lg sm:text-xl">Compensation Cockpit</h1>
            <p className="truncate text-xs text-muted">Negotiate with clarity.</p>
          </div>
        </div>

        <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-2 lg:order-2 lg:w-auto">
          <CurrencySwitcher />
          <RateControl />
        </div>

        <div className="order-2 flex items-center gap-1.5 lg:order-3">
          <Button variant="accent" onClick={() => setFocusMode(true)} data-testid="focus-enter" aria-keyshortcuts="F">
            <ScanEye />
            <span className="hidden xs:inline">Focus Mode</span>
          </Button>
          <Button variant="outline" onClick={onSave} className="hidden xl:inline-flex" data-testid="save-offer" aria-keyshortcuts="S">
            <Save />
            Save offer
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions" data-testid="more-actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={onSave} className="xl:hidden">
                <Save /> Save offer to history
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.print()} data-testid="export-summary">
                <Printer /> Export summary (print / PDF)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  exportScenarioFile()
                  toast('Scenario file downloaded')
                }}
                data-testid="export-json"
              >
                <Download /> Export scenarios (JSON)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onImport} data-testid="import-json">
                <Upload /> Import scenarios (JSON)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  resetDemo()
                  toast('Reset to the demonstration example', 'info')
                }}
                data-testid="reset"
              >
                <RotateCcw /> Reset to demo example
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  startFresh()
                  toast('Cleared — start entering your numbers', 'info')
                }}
                data-testid="start-fresh"
              >
                <Sparkles /> Start fresh
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="flex items-start gap-2 px-3 py-2 text-xs text-muted">
                <FileJson className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Data stays in this browser. Nothing is uploaded.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export { SaveOfferDialog, ImportDialog }
