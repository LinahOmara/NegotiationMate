import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Copy, MessageSquareQuote } from 'lucide-react'
import type { Insight } from '@/guidance/engine'
import { copyText } from '@/lib/clipboard'
import { toast } from '@/components/toast'
import { cn } from '@/lib/cn'

function CopyButton({ text, label, size = 'md' }: { text: string; label: string; size?: 'md' | 'lg' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(text)
        if (ok) {
          setDone(true)
          toast('Copied to clipboard')
          setTimeout(() => setDone(false), 1600)
        } else toast('Copy is not available in this browser', 'error')
      }}
      aria-label={label}
      data-testid="copy-question"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold text-accent-ink transition-colors hover:bg-accent-soft',
        size === 'lg' ? 'h-11 px-3 text-sm' : 'h-9 px-2.5 text-xs',
      )}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

export function InsightCard({ insight, index, size = 'md', defaultOpen = false }: { insight: Insight; index: number; size?: 'md' | 'lg'; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const toneBar = insight.tone === 'attention' ? 'bg-negative' : insight.tone === 'positive' ? 'bg-positive' : 'bg-accent'
  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.12) }}
      className="relative overflow-hidden rounded-2xl border border-line bg-surface"
      data-testid="insight"
      data-insight-id={insight.id}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', toneBar)} aria-hidden />
      <div className={cn('pl-5 pr-4', size === 'lg' ? 'py-4' : 'py-3.5')}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">
              {insight.tone === 'attention' ? 'Priority' : insight.tone === 'positive' ? 'On track' : 'Consider'} · {index + 1}
            </p>
            <h3 className={cn('mt-0.5 font-semibold text-ink', size === 'lg' ? 'text-lg' : 'text-[0.9375rem]')}>{insight.title}</h3>
            <p className={cn('mt-1 leading-relaxed text-ink-soft', size === 'lg' ? 'text-[0.9375rem]' : 'text-sm')}>{insight.explanation}</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-surface-2/80 p-3">
          <div className="flex items-start gap-2">
            <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <p className={cn('min-w-0 flex-1 font-medium text-ink', size === 'lg' ? 'text-base' : 'text-sm')} data-testid="insight-question">
              “{insight.question}”
            </p>
            <CopyButton text={insight.question} label={`Copy suggested question: ${insight.title}`} size={size} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-2 inline-flex h-9 items-center gap-1 rounded-lg px-1 text-xs font-semibold text-muted hover:text-ink"
        >
          Why it matters{insight.phrase ? ' · phrase' : ''}
          <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
              <div className="space-y-2 pb-1 pt-1">
                <p className="text-sm leading-relaxed text-ink-soft">{insight.why}</p>
                {insight.phrase && (
                  <div className="flex items-start gap-2 rounded-xl border border-dashed border-line-strong p-3">
                    <p className="min-w-0 flex-1 text-sm italic text-ink-soft">“{insight.phrase}”</p>
                    <CopyButton text={insight.phrase} label="Copy negotiation phrase" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  )
}
