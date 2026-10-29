import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  rangeClassName?: string
  thumbLabel?: string
}

export function Slider({ className, rangeClassName, thumbLabel, ...props }: SliderProps) {
  const count = (props.value ?? props.defaultValue ?? [0]).length
  return (
    <SliderPrimitive.Root
      className={cn('relative flex h-8 w-full touch-none select-none items-center data-[disabled]:opacity-50', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-3">
        <SliderPrimitive.Range className={cn('absolute h-full bg-accent', rangeClassName)} />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={thumbLabel}
          className="relative block size-5 rounded-full border-2 border-accent bg-white shadow-sm transition-[box-shadow,transform] duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 before:absolute before:-inset-2.5 before:content-['']"
        />
      ))}
    </SliderPrimitive.Root>
  )
}
