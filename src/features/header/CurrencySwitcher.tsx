import { Repeat } from 'lucide-react'
import { useApp } from '@/state/store'
import { Segmented } from '@/components/ui/segmented'
import { Tooltip } from '@/components/ui/tooltip'
import type { DisplayMode } from '@/domain/schema'
import { cn } from '@/lib/cn'

export function CurrencySwitcher({ layoutId = 'display-currency', size = 'md' }: { layoutId?: string; size?: 'md' | 'lg' }) {
  const displayMode = useApp((s) => s.settings.displayMode)
  const emphasis = useApp((s) => s.settings.emphasis)
  const setSettings = useApp((s) => s.setSettings)
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Segmented<DisplayMode>
        layoutId={layoutId}
        ariaLabel="Display currency"
        size={size}
        value={displayMode}
        onChange={(displayMode) => setSettings({ displayMode })}
        testId="display-currency"
        options={[
          { value: 'USD', label: 'USD' },
          { value: 'EGP', label: 'EGP' },
          { value: 'BOTH', label: 'Both' },
        ]}
      />
      {displayMode === 'BOTH' && (
        <Tooltip content={`Emphasize ${emphasis === 'USD' ? 'EGP' : 'USD'}`}>
          <button
            type="button"
            data-testid="swap-emphasis"
            onClick={() => setSettings({ emphasis: emphasis === 'USD' ? 'EGP' : 'USD' })}
            aria-label={`Emphasize ${emphasis === 'USD' ? 'EGP' : 'USD'} (currently ${emphasis})`}
            className={cn('inline-flex shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink', size === 'lg' ? 'size-12' : 'size-10')}
          >
            <Repeat className="size-4" />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
