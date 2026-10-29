import * as React from 'react'
import { ToggleGroup } from 'radix-ui'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: React.ReactNode
  title?: string
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  ariaLabel: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Unique id so the sliding indicator animates within this control only. */
  layoutId: string
  testId?: string
}

/** Segmented control (single-select toggle group) with a sliding indicator. */
export function Segmented<T extends string>({ value, onChange, options, ariaLabel, size = 'md', className, layoutId, testId }: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn('inline-flex min-w-0 items-center rounded-xl bg-surface-2 p-1', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          title={o.title}
          className={cn(
            'relative flex-1 whitespace-nowrap rounded-lg font-semibold text-muted transition-colors duration-150 hover:text-ink data-[state=on]:text-ink',
            size === 'sm' && 'h-7 px-2.5 text-xs',
            size === 'md' && 'h-8 px-3 text-[0.8125rem]',
            size === 'lg' && 'h-10 px-4 text-sm',
          )}
        >
          {o.value === value && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-lg bg-surface shadow-[0_1px_2px_rgb(23_39_35/0.08),0_0_0_1px_rgb(23_39_35/0.04)]"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
