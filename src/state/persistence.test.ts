import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, exportJson, importJson, loadFromStorage, saveToStorage } from './persistence'
import { demoData } from '@/domain/factories'

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  }
}

describe('persistence', () => {
  it('round-trips through storage', () => {
    const s = memoryStorage()
    const data = demoData()
    data.settings.rate = 61.5
    saveToStorage(s, data)
    const r = loadFromStorage(s)
    expect(r.status).toBe('loaded')
    expect(r.data.settings.rate).toBe(61.5)
  })
  it('returns demo data when nothing is stored', () => {
    const r = loadFromStorage(memoryStorage())
    expect(r.status).toBe('empty')
    expect(r.data.settings.isDemo).toBe(true)
  })
  it('recovers gracefully from malformed JSON', () => {
    const r = loadFromStorage(memoryStorage({ [STORAGE_KEY]: '{not json' }))
    expect(r.status).toBe('recovered')
    expect(r.data).toEqual(demoData())
  })
  it('recovers from schema-invalid data (negative amounts)', () => {
    const bad = JSON.parse(exportJson(demoData()))
    bad.data.target.distribution.total.amount = -5
    const r = loadFromStorage(memoryStorage({ [STORAGE_KEY]: JSON.stringify(bad) }))
    expect(r.status).toBe('recovered')
  })
  it('migrates an outdated version-0 envelope', () => {
    const v0 = JSON.parse(exportJson(demoData()))
    v0.version = 0
    delete v0.data.settings.isDemo
    v0.data.history = [{ id: 'h1', label: 'Initial', timestamp: '2026-01-01T00:00:00Z', notes: '', rate: 50, offer: v0.data.offer }]
    const r = loadFromStorage(memoryStorage({ [STORAGE_KEY]: JSON.stringify(v0) }))
    expect(r.status).toBe('loaded')
    expect(r.data.settings.isDemo).toBe(false)
    expect(r.data.history[0].adjustments).toEqual({ base: 0, bonus: 0, equity: 0, signOn: 0 })
  })
  it('repairs a dangling active scenario id', () => {
    const d = demoData()
    d.activeScenarioId = 'missing'
    const s = memoryStorage()
    saveToStorage(s, d)
    expect(loadFromStorage(s).data.activeScenarioId).toBe(d.scenarios[0].id)
  })
  it('survives storage that throws', () => {
    const throwing = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') }, removeItem: () => {} }
    expect(loadFromStorage(throwing).status).toBe('empty')
    expect(() => saveToStorage(throwing, demoData())).not.toThrow()
  })
})

describe('JSON import/export', () => {
  it('exports a versioned envelope that re-imports identically', () => {
    const d = demoData()
    const json = exportJson(d)
    expect(JSON.parse(json)).toMatchObject({ app: 'compensation-cockpit', version: 1 })
    const r = importJson(json)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toEqual(d)
  })
  it('rejects invalid JSON with a readable message', () => {
    const r = importJson('nope')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/not valid JSON/i)
  })
  it('rejects files from other apps', () => {
    const r = importJson(JSON.stringify({ hello: 'world' }))
    expect(r.ok).toBe(false)
  })
  it('rejects future versions explicitly', () => {
    const env = JSON.parse(exportJson(demoData()))
    env.version = 99
    const r = importJson(JSON.stringify(env))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toMatch(/newer version/i)
  })
  it('lists field paths for schema errors', () => {
    const env = JSON.parse(exportJson(demoData()))
    env.data.settings.rate = 0
    const r = importJson(JSON.stringify(env))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('settings.rate')
  })
})
