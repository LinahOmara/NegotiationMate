import { useMemo } from 'react'
import { useApp } from '@/state/store'
import { compareToTarget, evaluateOffer, evaluatePackage } from '@/calc/package'
import { applyAdjustments, resolveScenario } from '@/calc/scenarios'
import { buildGuidance } from '@/guidance/engine'
import { gapAnalysis } from '@/guidance/gapAnalysis'
import type { Currency } from '@/domain/schema'

/** All derived numbers, memoized on the inputs they depend on. Annual USD unless noted. */
export function useDerived() {
  const target = useApp((s) => s.target)
  const offer = useApp((s) => s.offer)
  const rate = useApp((s) => s.settings.rate)
  const emphasis = useApp((s) => s.settings.emphasis)
  const displayMode = useApp((s) => s.settings.displayMode)
  const scenarios = useApp((s) => s.scenarios)
  const activeScenarioId = useApp((s) => s.activeScenarioId)

  const core = useMemo(() => {
    const t = evaluatePackage(target, rate)
    const o = evaluateOffer(offer, rate)
    return { target: t, offer: o, comparison: compareToTarget(o, t) }
  }, [target, offer, rate])

  const copyCurrency: Currency = displayMode === 'BOTH' ? emphasis : displayMode

  const insights = useMemo(() => {
    const gi = { ...core, offerInput: offer, rate, currency: copyCurrency }
    return { guidance: buildGuidance(gi, 5), facts: gapAnalysis(gi) }
  }, [core, offer, rate, copyCurrency])

  const scenarioResults = useMemo(
    () =>
      scenarios.map((scenario) => {
        const { adjustments, solver } = resolveScenario(scenario, core.offer, core.target)
        return { scenario, solver, result: applyAdjustments(core.offer, adjustments, core.target) }
      }),
    [scenarios, core],
  )
  const active = scenarioResults.find((s) => s.scenario.id === activeScenarioId) ?? scenarioResults[0]

  return { ...core, ...insights, scenarioResults, active, rate }
}

export type Derived = ReturnType<typeof useDerived>
