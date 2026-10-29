import { MotionConfig } from 'motion/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/toast'
import { useApp } from '@/state/store'
import { Header, ImportDialog, SaveOfferDialog, useHeaderDialogs } from '@/features/header/Header'
import { DemoBanner } from '@/features/header/DemoBanner'
import { HeroComparison } from '@/features/hero/HeroComparison'
import { MobileGapBar } from '@/features/hero/MobileGapBar'
import { TargetPanel } from '@/features/package/TargetPanel'
import { OfferPanel } from '@/features/package/OfferPanel'
import { BreakdownChart } from '@/features/breakdown/BreakdownChart'
import { GapAnalysis } from '@/features/gaps/GapAnalysis'
import { GuidancePanel } from '@/features/guidance/GuidancePanel'
import { ScenarioExplorer } from '@/features/scenarios/ScenarioExplorer'
import { FxSensitivity } from '@/features/fx/FxSensitivity'
import { OfferHistory } from '@/features/history/OfferHistory'
import { PrintSummary } from '@/features/print/PrintSummary'
import { FocusMode } from '@/features/focus/FocusMode'
import { useShortcuts } from '@/features/focus/useShortcuts'
import { Footer } from '@/features/header/Footer'

export function App() {
  const focus = useApp((s) => s.ui.focusMode)
  const dialogs = useHeaderDialogs()
  useShortcuts({ onSave: () => dialogs.setSaveOpen(true) })

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <div className="no-print min-h-dvh">
          {focus ? (
            <FocusMode onSave={() => dialogs.setSaveOpen(true)} />
          ) : (
            <>
              <Header onSave={() => dialogs.setSaveOpen(true)} onImport={() => dialogs.setImportOpen(true)} />
              <main id="main" className="mx-auto max-w-[90rem] space-y-4 px-4 pb-16 pt-4 sm:space-y-6 sm:px-6 sm:pt-6 lg:px-8">
                <DemoBanner />
                <div id="hero">
                  <HeroComparison />
                </div>
                <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.05fr)]">
                  <TargetPanel />
                  <OfferPanel />
                  <div className="min-w-0 lg:col-span-2 xl:col-span-1">
                    <GuidancePanel />
                  </div>
                </div>
                <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                  <BreakdownChart />
                  <GapAnalysis />
                </div>
                <ScenarioExplorer />
                <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-2">
                  <FxSensitivity />
                  <OfferHistory onSave={() => dialogs.setSaveOpen(true)} />
                </div>
              </main>
              <Footer />
              <MobileGapBar watchId="hero" />
            </>
          )}
        </div>
        <PrintSummary />
        <SaveOfferDialog open={dialogs.saveOpen} onOpenChange={dialogs.setSaveOpen} />
        <ImportDialog open={dialogs.importOpen} onOpenChange={dialogs.setImportOpen} />
        <Toaster />
      </TooltipProvider>
    </MotionConfig>
  )
}
