import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({ className, align = 'end', sideOffset = 8, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn('card z-50 w-[min(20rem,calc(100vw-24px))] p-4 shadow-xl focus:outline-none', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
