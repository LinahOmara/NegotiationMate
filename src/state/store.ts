import { create } from 'zustand'
import type {
  Adjustments,
  AppData,
  ComponentKey,
  OfferInput,
  PackageInput,
  Scenario,
  Settings,
} from '@/domain/schema'
import { blankData, defaultScenarios, demoData, zeroAdjustments } from '@/domain/factories'
import { switchPackageMode } from '@/calc/distribution'
import { evaluateOffer, evaluatePackage } from '@/calc/package'
import { resolveScenario, solve, type SolverKind, type SolverResult } from '@/calc/scenarios'
import { loadFromStorage, safeLocalStorage, saveToStorage } from './persistence'

export type ChartMode = 'amount' | 'percent'

export interface UiState {
  focusMode: boolean
  chartMode: ChartMode
  targetLocks: ComponentKey[]
  offerLocks: ComponentKey[]
  /** Last solver explanation per scenario id. */
  solverNotes: Record<string, SolverResult>
  loadStatus: 'loaded' | 'empty' | 'recovered'
}

export interface Actions {
  setSettings(patch: Partial<Settings>): void
  updateTarget(fn: (t: PackageInput) => PackageInput): void
  updateOffer(fn: (o: OfferInput) => OfferInput): void
  setTargetMode(mode: PackageInput['mode']): void
  setOfferMode(mode: PackageInput['mode']): void
  toggleLock(which: 'target' | 'offer', key: ComponentKey): void
  setActiveScenario(id: string): void
  updateScenario(id: string, patch: Partial<Omit<Scenario, 'id'>>): void
  setScenarioAdjustment(id: string, key: keyof Adjustments, value: number): void
  applySolver(id: string, kind: SolverKind): SolverResult
  resetScenario(id: string): void
  saveToHistory(label: string, notes: string, scenarioId?: string): string
  updateHistory(id: string, patch: { label?: string; notes?: string }): void
  removeHistory(id: string): void
  loadHistoryOffer(id: string): void
  setFocusMode(on: boolean): void
  setChartMode(mode: ChartMode): void
  resetDemo(): void
  startFresh(): void
  replaceData(data: AppData): void
}

export type Store = AppData & { ui: UiState } & Actions

const pickData = (s: Store): AppData => ({
  settings: s.settings,
  target: s.target,
  offer: s.offer,
  scenarios: s.scenarios,
  activeScenarioId: s.activeScenarioId,
  history: s.history,
})

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`

function initialUi(loadStatus: UiState['loadStatus']): UiState {
  return { focusMode: false, chartMode: 'amount', targetLocks: [], offerLocks: [], solverNotes: {}, loadStatus }
}

/** Effective adjustments for a scenario given the current data. */
export function scenarioAdjustments(data: AppData, scenario: Scenario): Adjustments {
  const rate = data.settings.rate
  return resolveScenario(scenario, evaluateOffer(data.offer, rate), evaluatePackage(data.target, rate)).adjustments
}

export function createAppStore(storage = safeLocalStorage()) {
  const loaded = loadFromStorage(storage)
  const store = create<Store>()((set, get) => {
    const markEdited = (s: Partial<AppData>): Partial<Store> =>
      get().settings.isDemo && (s.target || s.offer) ? { ...s, settings: { ...get().settings, ...(s.settings ?? {}), isDemo: false } } : s

    return {
      ...loaded.data,
      ui: initialUi(loaded.status),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateTarget: (fn) => set((s) => markEdited({ target: fn(s.target) })),
      updateOffer: (fn) => set((s) => markEdited({ offer: fn(s.offer) })),
      setTargetMode: (mode) => set((s) => ({ target: switchPackageMode(s.target, mode, s.settings.rate) })),
      setOfferMode: (mode) => set((s) => ({ offer: switchPackageMode(s.offer, mode, s.settings.rate) })),
      toggleLock: (which, key) =>
        set((s) => {
          const k = which === 'target' ? 'targetLocks' : 'offerLocks'
          const cur = s.ui[k]
          return { ui: { ...s.ui, [k]: cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key] } }
        }),

      setActiveScenario: (id) => set({ activeScenarioId: id }),
      updateScenario: (id, patch) => set((s) => ({ scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)) })),
      setScenarioAdjustment: (id, key, value) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== id) return sc
            // Editing an auto scenario freezes its current values into a custom one.
            const current = scenarioAdjustments(pickData(s), sc)
            return { ...sc, strategy: 'custom', adjustments: { ...current, [key]: value } }
          }),
          ui: { ...s.ui, solverNotes: Object.fromEntries(Object.entries(s.ui.solverNotes).filter(([k]) => k !== id)) },
        })),
      applySolver: (id, kind) => {
        const s = get()
        const result = solve(kind, evaluateOffer(s.offer, s.settings.rate), evaluatePackage(s.target, s.settings.rate))
        set({
          scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, strategy: 'custom', adjustments: result.adjustments } : sc)),
          ui: { ...s.ui, solverNotes: { ...s.ui.solverNotes, [id]: result } },
        })
        return result
      },
      resetScenario: (id) =>
        set((s) => {
          const def = defaultScenarios().find((d) => d.id === id)
          return {
            scenarios: s.scenarios.map((sc) => (sc.id === id ? (def ?? { ...sc, strategy: 'none', adjustments: zeroAdjustments() }) : sc)),
            ui: { ...s.ui, solverNotes: Object.fromEntries(Object.entries(s.ui.solverNotes).filter(([k]) => k !== id)) },
          }
        }),

      saveToHistory: (label, notes, scenarioId) => {
        const s = get()
        const sc = s.scenarios.find((x) => x.id === scenarioId)
        const id = uid()
        const entry = {
          id,
          label: label.trim().slice(0, 60) || `Offer ${s.history.length + 1}`,
          timestamp: new Date().toISOString(),
          notes: notes.slice(0, 1000),
          rate: s.settings.rate,
          offer: structuredClone(s.offer),
          adjustments: sc ? scenarioAdjustments(pickData(s), sc) : zeroAdjustments(),
        }
        set({ history: [...s.history, entry] })
        return id
      },
      updateHistory: (id, patch) => set((s) => ({ history: s.history.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
      removeHistory: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      loadHistoryOffer: (id) =>
        set((s) => {
          const h = s.history.find((x) => x.id === id)
          return h ? { offer: structuredClone(h.offer) } : {}
        }),

      setFocusMode: (on) => set((s) => ({ ui: { ...s.ui, focusMode: on } })),
      setChartMode: (mode) => set((s) => ({ ui: { ...s.ui, chartMode: mode } })),
      resetDemo: () => set((s) => ({ ...demoData(), ui: { ...initialUi('loaded'), focusMode: s.ui.focusMode } })),
      startFresh: () =>
        set((s) => {
          const b = blankData()
          return { ...b, settings: { ...b.settings, rate: s.settings.rate, displayMode: s.settings.displayMode, emphasis: s.settings.emphasis }, ui: { ...initialUi('loaded'), focusMode: s.ui.focusMode } }
        }),
      replaceData: (data) => set((s) => ({ ...data, ui: { ...initialUi('loaded'), focusMode: s.ui.focusMode } })),
    }
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  store.subscribe((s, prev) => {
    if (pickDataChanged(s, prev)) {
      clearTimeout(timer)
      timer = setTimeout(() => saveToStorage(storage, pickData(store.getState())), 250)
    }
  })
  return store
}

function pickDataChanged(a: Store, b: Store) {
  return (
    a.settings !== b.settings ||
    a.target !== b.target ||
    a.offer !== b.offer ||
    a.scenarios !== b.scenarios ||
    a.activeScenarioId !== b.activeScenarioId ||
    a.history !== b.history
  )
}

export { pickData }
export const useApp = createAppStore()
