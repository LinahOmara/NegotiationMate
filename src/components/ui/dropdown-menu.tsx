import * as React from 'react'
import { DropdownMenu as Menu } from 'radix-ui'
import { cn } from '@/lib/cn'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger

export function DropdownMenuContent({ className, align = 'end', ...props }: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className={cn('card z-50 min-w-56 p-1.5 shadow-xl', className)}
        {...props}
      />
    </Menu.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        'flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-ink outline-none data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-muted',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-line" />
}
