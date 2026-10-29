import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, Coins, CalendarClock, Gem, Landmark, Scale } from 'lucide-react'
import { useDerived } from '@/lib/useDerived'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { GapFact } from '@/guidance/gapAnalysis'
import { cn } from '@/lib/cn'

const ICONS: Record<GapFact['id'], typeof Coins> = {
  'total-gap': Scale,
  'base-gap': Landmark,
  'variable-share': Coins,
  'equity-reliance': Gem,
  'first-year': CalendarClock,
  'fx-effect': ArrowUpRight,
}

export function GapAnalysis() {
  const { facts } = useDerived()
  return (
    <Card aria-labelledby="gaps-title" data-testid="gap-analysis">
      <CardHeader>
        <div>
          <CardTitle id="gaps-title">Gap analysis</CardTitle>
          <CardDescription>What the numbers say, in plain English.</CardDescription>
        </div>
      </CardHeader>
      {facts.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">Enter a target and an offer to see how they compare.</p>
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {facts.map((f) => {
              const Icon = f.id === 'total-gap' && f.tone === 'negative' ? ArrowDownRight : ICONS[f.id]
              return (
                <motion.li
                  key={f.id}
                  layout="position"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.22 }}
                  className="flex gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                  data-testid={`fact-${f.id}`}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl',
                      f.tone === 'negative' ? 'bg-negative-soft text-negative' : f.tone === 'positive' ? 'bg-positive-soft text-positive' : 'bg-surface-2 text-ink-soft',
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{f.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink">{f.text}</p>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  )
}
