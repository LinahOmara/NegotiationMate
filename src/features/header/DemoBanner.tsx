import { FlaskConical } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '@/state/store'
import { Button } from '@/components/ui/button'

export function DemoBanner() {
  const isDemo = useApp((s) => s.settings.isDemo)
  const loadStatus = useApp((s) => s.ui.loadStatus)
  const startFresh = useApp((s) => s.startFresh)
  return (
    <AnimatePresence initial={false}>
      {(isDemo || loadStatus === 'recovered') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22 }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-bonus/30 bg-[#fbf3e6] px-4 py-3 text-sm" data-testid="demo-banner">
            <FlaskConical className="size-4 shrink-0 text-[#9a6a22]" aria-hidden />
            <p className="min-w-0 flex-1 text-ink-soft">
              {loadStatus === 'recovered' && !isDemo ? (
                <>Your saved data could not be read, so the demonstration example was loaded instead.</>
              ) : (
                <>
                  <strong className="font-semibold text-ink">Demonstration numbers.</strong> Every value is editable and none of it is real employer compensation data.
                </>
              )}
            </p>
            <Button size="sm" variant="outline" onClick={startFresh} data-testid="banner-start-fresh">
              Start fresh
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
