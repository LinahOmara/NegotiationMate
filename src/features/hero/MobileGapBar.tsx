import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useDerived } from '@/lib/useDerived'
import { useMoney } from '@/lib/useMoney'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/cn'

/** On small screens, keeps the critical numbers visible once the hero scrolls away. */
export function MobileGapBar({ watchId }: { watchId: string }) {
  const [show, setShow] = useState(false)
  const { offer, comparison: c } = useDerived()
  const { fmt, primary } = useMoney()

  useEffect(() => {
    const el = document.getElementById(watchId)
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [watchId])

  const below = c.totalGap < -0.5
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden"
          data-testid="mobile-gap-bar"
        >
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">Offer</p>
              <p className="truncate font-semibold tnum">{fmt(offer.recurring)}</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">Gap · {c.reachPct === null ? '—' : `${Math.round(c.reachPct)}% of target`}</p>
              <p className={cn('truncate font-semibold tnum', below ? 'text-negative' : 'text-positive')}>
                {fmt(c.totalGap, primary, { signed: true })} <span className="text-xs font-medium text-muted">({formatPct(c.totalGapPct, { signed: true })})</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
