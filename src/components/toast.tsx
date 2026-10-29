import { create } from 'zustand'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'

type Tone = 'success' | 'info' | 'error'
interface ToastItem {
  id: number
  message: string
  tone: Tone
}

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }))
let seq = 0

export function toast(message: string, tone: Tone = 'success') {
  const id = ++seq
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, message, tone }] }))
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), tone === 'error' ? 6000 : 3200)
}

const ICON = { success: CheckCircle2, info: Info, error: TriangleAlert }

export function Toaster() {
  const items = useToasts((s) => s.items)
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const Icon = ICON[t.tone]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-xl"
              data-testid="toast"
            >
              <Icon className={t.tone === 'error' ? 'size-4 text-[#f0a48f]' : 'size-4 text-[#7fd6cc]'} aria-hidden />
              {t.message}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
