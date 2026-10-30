import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  title: React.ReactNode
  summary?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  testId?: string
}

/** Expandable section with an interruptible height animation. */
export function Disclosure({ title, summary, defaultOpen = false, children, className, testId }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const reduce = useReducedMotion()
  return (
    <div className={cn('rounded-2xl border border-line', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        data-testid={testId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left hover:bg-surface-2/60"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {summary && <span className="block truncate text-xs text-muted">{summary}</span>}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
