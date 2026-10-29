import { describe, expect, it, vi } from 'vitest'
import { createAppStore, scenarioAdjustments, pickData } from './store'
import { STORAGE_KEY } from './persistence'

function mem() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
}

describe('app store', () => {
  it('starts with demo data and marks it edited after the first change', () => {
    const s = createAppStore(mem())
    expect(s.getState().settings.isDemo).toBe(true)
    s.getState().updateOffer((o) => ({ ...o, distribution: { ...o.distribution, total: { ...o.distribution.total, amount: 50000 } } }))
    expect(s.getState().settings.isDemo).toBe(false)
  })

  it('editing an auto scenario slider freezes it into a custom scenario', () => {
    const s = createAppStore(mem())
    const before = scenarioAdjustments(pickData(s.getState()), s.getState().scenarios[1])
    s.getState().setScenarioAdjustment('balanced', 'signOn', 5000)
    const sc = s.getState().scenarios.find((x) => x.id === 'balanced')!
    expect(sc.strategy).toBe('custom')
    expect(sc.adjustments.base).toBeCloseTo(before.base, 6)
    expect(sc.adjustments.signOn).toBe(5000)
  })

  it('records offers to history with the rate at the time', () => {
    const s = createAppStore(mem())
    s.getState().setSettings({ rate: 55 })
    s.getState().saveToHistory('Initial Offer', 'first call')
    s.getState().setSettings({ rate: 60 })
    const h = s.getState().history[0]
    expect(h.label).toBe('Initial Offer')
    expect(h.rate).toBe(55)
    expect(h.notes).toBe('first call')
  })

  it('persists to storage (debounced) and reloads', async () => {
    vi.useFakeTimers()
    const storage = mem()
    const s = createAppStore(storage)
    s.getState().setSettings({ rate: 58 })
    vi.advanceTimersByTime(300)
    expect(storage.m.get(STORAGE_KEY)).toContain('58')
    const s2 = createAppStore(storage)
    expect(s2.getState().settings.rate).toBe(58)
    vi.useRealTimers()
  })

  it('start fresh clears inputs but keeps the exchange-rate assumption', () => {
    const s = createAppStore(mem())
    s.getState().setSettings({ rate: 57 })
    s.getState().startFresh()
    expect(s.getState().target.distribution.total.amount).toBe(0)
    expect(s.getState().settings.rate).toBe(57)
    expect(s.getState().settings.isDemo).toBe(false)
  })

  it('reset restores the demo', () => {
    const s = createAppStore(mem())
    s.getState().startFresh()
    s.getState().resetDemo()
    expect(s.getState().target.distribution.total.amount).toBe(70900)
  })
})
