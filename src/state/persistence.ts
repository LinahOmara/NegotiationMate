import { SCHEMA_VERSION, persistedSchema, type AppData, type PersistedEnvelope } from '@/domain/schema'
import { demoData, zeroAdjustments } from '@/domain/factories'

/**
 * Local-only persistence. Nothing here performs network requests:
 * compensation data never leaves the browser.
 */

export const STORAGE_KEY = 'compensation-cockpit/state'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type Raw = Record<string, unknown>

/** Migrations from version N to N + 1, applied in order. */
const migrations: Record<number, (env: Raw) => Raw> = {
  0: (env) => {
    const data = { ...(env.data as Raw) }
    const settings = { isDemo: false, ...(data.settings as Raw) }
    const history = Array.isArray(data.history)
      ? data.history.map((h: Raw) => ({ adjustments: zeroAdjustments(), ...h }))
      : []
    return { ...env, version: 1, data: { ...data, settings, history } }
  },
}

function repair(data: AppData): AppData {
  if (!data.scenarios.some((s) => s.id === data.activeScenarioId)) {
    return { ...data, activeScenarioId: data.scenarios[0].id }
  }
  return data
}

export type ParseResult = { ok: true; data: AppData } | { ok: false; errors: string[] }

export function parseEnvelope(value: unknown): ParseResult {
  if (!value || typeof value !== 'object' || (value as Raw).app !== 'compensation-cockpit') {
    return { ok: false, errors: ['This file is not a Compensation Cockpit export.'] }
  }
  let env = value as Raw
  const version = typeof env.version === 'number' ? env.version : -1
  if (version > SCHEMA_VERSION) {
    return { ok: false, errors: [`This file was created by a newer version (v${version}). Update the app to import it.`] }
  }
  if (version < 0) return { ok: false, errors: ['The file has no schema version.'] }
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const migrate = migrations[v]
    if (!migrate) return { ok: false, errors: [`No migration available from version ${v}.`] }
    env = migrate(env)
  }
  const parsed = persistedSchema.safeParse(env)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 8).map((i) => `${i.path.filter((p) => p !== 'data').join('.') || '(root)'}: ${i.message}`),
    }
  }
  return { ok: true, data: repair(parsed.data.data) }
}

export function envelope(data: AppData): PersistedEnvelope {
  return { app: 'compensation-cockpit', version: SCHEMA_VERSION, savedAt: new Date().toISOString(), data }
}

export function exportJson(data: AppData): string {
  return JSON.stringify(envelope(data), null, 2)
}

export function importJson(text: string): ParseResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['The file is not valid JSON.'] }
  }
  return parseEnvelope(value)
}

export interface LoadResult {
  data: AppData
  status: 'loaded' | 'empty' | 'recovered'
}

export function loadFromStorage(storage: StorageLike | undefined): LoadResult {
  let raw: string | null = null
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return { data: demoData(), status: 'empty' }
  }
  if (raw === null) return { data: demoData(), status: 'empty' }
  const r = importJson(raw)
  return r.ok ? { data: r.data, status: 'loaded' } : { data: demoData(), status: 'recovered' }
}

export function saveToStorage(storage: StorageLike | undefined, data: AppData): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(envelope(data)))
    return true
  } catch {
    return false
  }
}

export function safeLocalStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}
