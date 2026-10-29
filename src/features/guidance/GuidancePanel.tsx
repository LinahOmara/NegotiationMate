import { AnimatePresence } from 'motion/react'
import { Compass } from 'lucide-react'
import { useDerived } from '@/lib/useDerived'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InsightCard } from './InsightCard'

export function GuidancePanel() {
  const { guidance } = useDerived()
  const top = guidance.slice(0, 4)
  return (
    <Card aria-labelledby="guidance-title" data-testid="guidance" className="xl:sticky xl:top-24">
      <CardHeader className="mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-ink text-white">
              <Compass className="size-4" aria-hidden />
            </span>
            <CardTitle id="guidance-title">Negotiation guidance</CardTitle>
          </div>
          <CardDescription>Prioritized for your numbers. Questions, not scripts — and never a guarantee.</CardDescription>
        </div>
      </CardHeader>
      {top.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">Guidance appears once you enter a target and an offer.</p>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {top.map((g, i) => (
              <InsightCard key={g.id} insight={g} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  )
}
