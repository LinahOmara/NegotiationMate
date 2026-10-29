import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'

interface Props {
  value: number
  format: (v: number) => string
  className?: string
  /** Tween duration, seconds. Kept short so numbers stay readable on a call. */
  duration?: number
  testId?: string
}

/**
 * Tweens between values without re-rendering React on each frame. The
 * final value is always exposed to assistive tech and tests via a hidden
 * span, so screen readers never hear intermediate numbers.
 */
export function AnimatedNumber({ value, format, className, duration = 0.32, testId }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const from = useRef(value)
  const reduce = useReducedMotion()
  const safe = Number.isFinite(value) ? value : 0

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce || from.current === safe) {
      el.textContent = format(safe)
      from.current = safe
      return
    }
    const controls = animate(from.current, safe, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = format(v)
        from.current = v
      },
    })
    return () => controls.stop()
  }, [safe, format, duration, reduce])

  const final = format(safe)
  return (
    <span className={cn('tnum', className)} data-testid={testId} data-value={final}>
      <span ref={ref} aria-hidden="true">
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  )
}
