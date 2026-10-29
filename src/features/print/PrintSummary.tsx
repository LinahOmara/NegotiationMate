import { useMemo } from 'react'
import { useApp } from '@/state/store'
import { useDerived } from '@/lib/useDerived'
import { convert } from '@/calc/money'
import { evaluateHistoryEntry } from '@/calc/history'
import { formatMoney, formatPct, formatRate } from '@/lib/format'
import type { Currency } from '@/domain/schema'

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d)
}

const th = 'border border-black px-1.5 py-1 text-left font-bold'
const td = 'border border-black px-1.5 py-1 text-right tabular-nums'
const tdl = 'border border-black px-1.5 py-1 text-left'

export function PrintSummary() {
  const { target, offer, comparison: c, guidance, facts, active, rate } = useDerived()
  const history = useApp((s) => s.history)
  const m = (usd: number, cur: Currency, signed = false) => formatMoney(convert(usd, 'USD', cur, rate), cur, { signed })
  const historyRows = useMemo(() => history.map((h) => ({ h, v: evaluateHistoryEntry(h, target) })), [history, target])

  const rows: [string, number, number][] = [
    ['Base salary (guaranteed)', target.base, offer.base],
    ['Target bonus', target.bonusTarget, offer.bonusTarget],
    ['Equity (annualized)', target.equityAnnual, offer.equityAnnual],
    ['Recurring total / year', target.recurring, offer.recurring],
    ['Monthly equivalent', target.monthly, offer.monthly],
    ['First year (incl. sign-on)', target.recurring, offer.firstYear],
  ]
  const gapWord = (g: number) => (Math.abs(g) < 0.5 ? 'on target' : g < 0 ? 'below target' : 'above target')
  const sc = active.result

  return (
    <div className="print-only bg-white text-[10.5pt] leading-snug text-black" data-testid="print-summary">
      <header className="border-b-2 border-black pb-2">
        <h1 className="font-display-tight text-[18pt] font-bold">Compensation Negotiation Summary</h1>
        <p className="text-[9.5pt]">
          Prepared {dateFmt.format(new Date())}. Exchange rate assumption (user-provided, not a live rate): 1 USD = {formatRate(rate)} EGP.
        </p>
      </header>

      <section className="mt-3" style={{ breakInside: 'avoid' }}>
        <h2 className="mb-1 text-[11.5pt] font-bold">Target vs offer (annual, gross)</h2>
        <table className="w-full border-collapse text-[9.5pt]" style={{ breakInside: 'avoid' }}>
          <thead>
            <tr>
              <th className={th} rowSpan={2}>Component</th>
              <th className={`${th} text-center`} colSpan={2}>Target</th>
              <th className={`${th} text-center`} colSpan={2}>Offer</th>
            </tr>
            <tr>
              <th className={th}>USD</th>
              <th className={th}>EGP</th>
              <th className={th}>USD</th>
              <th className={th}>EGP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, t, o]) => (
              <tr key={name} className={name.startsWith('Recurring') ? 'font-bold' : undefined}>
                <th scope="row" className={`${tdl} font-semibold`}>{name}</th>
                <td className={td}>{m(t, 'USD')}</td>
                <td className={td}>{m(t, 'EGP')}</td>
                <td className={td}>{m(o, 'USD')}</td>
                <td className={td}>{m(o, 'EGP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5">
          <strong>Gap:</strong> {m(c.totalGap, 'USD', true)} / {m(c.totalGap, 'EGP', true)} per year ({formatPct(c.totalGapPct, { signed: true })}, {gapWord(c.totalGap)}).
        </p>
      </section>

      <section className="mt-3" style={{ breakInside: 'avoid' }}>
        <h2 className="mb-1 text-[11.5pt] font-bold">Active counteroffer scenario: {active.scenario.name}</h2>
        <p>
          Recurring total {m(sc.recurring, 'USD')} ({m(sc.recurring, 'EGP')}); base {m(sc.base, 'USD')}; first year {m(sc.firstYear, 'USD')}. Remaining gap to target:{' '}
          <strong>
            {m(sc.remainingGap, 'USD', true)} ({formatPct(sc.remainingGapPct, { signed: true })}, {gapWord(sc.remainingGap)})
          </strong>
          . This models a request, not a likely outcome.
        </p>
      </section>

      {guidance.length > 0 && (
        <section className="mt-3" style={{ breakInside: 'avoid' }}>
          <h2 className="mb-1 text-[11.5pt] font-bold">Top guidance</h2>
          <ol className="list-decimal space-y-1 pl-5">
            {guidance.slice(0, 3).map((g) => (
              <li key={g.id}>
                <strong>{g.title}.</strong> Question to ask: {g.question}
              </li>
            ))}
          </ol>
        </section>
      )}

      {facts.length > 0 && (
        <section className="mt-3" style={{ breakInside: 'avoid' }}>
          <h2 className="mb-1 text-[11.5pt] font-bold">Gap facts</h2>
          <ul className="list-disc space-y-0.5 pl-5">
            {facts.map((f) => (
              <li key={f.id}>
                <strong>{f.title}:</strong> {f.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {historyRows.length > 0 && (
        <section className="mt-3" style={{ breakInside: 'avoid' }}>
          <h2 className="mb-1 text-[11.5pt] font-bold">Recorded offers</h2>
          <table className="w-full border-collapse text-[9.5pt]">
            <thead>
              <tr>
                <th className={th}>Offer</th>
                <th className={th}>Date</th>
                <th className={th}>Rate</th>
                <th className={th}>Recurring total (USD)</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map(({ h, v }) => (
                <tr key={h.id} style={{ breakInside: 'avoid' }}>
                  <td className={tdl}>{h.label}</td>
                  <td className={tdl}>{fmtDate(h.timestamp)}</td>
                  <td className={td}>{formatRate(h.rate)}</td>
                  <td className={td}>{formatMoney(v.recurring, 'USD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="mt-4 border-t border-black pt-1.5 text-[8.5pt]">
        All amounts are gross, before tax and deductions. The exchange rate is an assumption you provided. Percentages show the offer relative to your target and are not a likelihood of approval. Equity and variable bonus are not guaranteed, and equity value at vesting can differ. Data stays on your device.
      </footer>
    </div>
  )
}
