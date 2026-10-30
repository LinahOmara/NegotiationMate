import { useEffect } from 'react'
import { useApp } from '@/state/store'
import { toast } from '@/components/toast'

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'F', action: 'Enter / leave Focus Mode' },
  { keys: 'Esc', action: 'Leave Focus Mode' },
  { keys: 'U · E · B', action: 'Show USD · EGP · Both' },
  { keys: 'X', action: 'Swap emphasized currency' },
  { keys: '1 · 2 · 3', action: 'Select scenario' },
  { keys: 'S', action: 'Save offer to history' },
  { keys: '?', action: 'Show shortcuts' },
]

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/** Global keyboard shortcuts. Ignored while typing, with modifiers, or while a dialog is open. */
export function useShortcuts({ onSave, onHelp }: { onSave: () => void; onHelp?: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      const s = useApp.getState()
      if (e.key === 'Escape') {
        if (s.ui.focusMode && !isTyping(e.target)) s.setFocusMode(false)
        return
      }
      if (isTyping(e.target)) return
      const k = e.key.toLowerCase()
      const act = (fn: () => void) => {
        e.preventDefault()
        fn()
      }
      if (k === 'f') act(() => s.setFocusMode(!s.ui.focusMode))
      else if (k === 'u') act(() => s.setSettings({ displayMode: 'USD' }))
      else if (k === 'e') act(() => s.setSettings({ displayMode: 'EGP' }))
      else if (k === 'b') act(() => s.setSettings({ displayMode: 'BOTH' }))
      else if (k === 'x') act(() => s.setSettings({ emphasis: s.settings.emphasis === 'USD' ? 'EGP' : 'USD' }))
      else if (k === 's') act(onSave)
      else if (e.key === '?') act(() => (onHelp ? onHelp() : toast(SHORTCUTS.map((x) => `${x.keys}: ${x.action}`).join(' · '), 'info')))
      else if (/^[1-9]$/.test(k)) {
        const sc = s.scenarios[Number(k) - 1]
        if (sc) act(() => s.setActiveScenario(sc.id))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave, onHelp])
}
