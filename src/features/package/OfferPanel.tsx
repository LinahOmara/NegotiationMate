import { Briefcase } from 'lucide-react'
import { useApp } from '@/state/store'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { MoneyField } from '@/components/MoneyField'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Disclosure } from '@/components/Disclosure'
import { DistributionEditor } from './DistributionEditor'
import { BonusEditor } from './BonusEditor'
import { EquityEditor } from './EquityEditor'
import { SignOnEditor } from './SignOnEditor'
import { useDerived } from '@/lib/useDerived'
import { useMoney } from '@/lib/useMoney'
import type { OfferInput } from '@/domain/schema'

export function OfferPanel() {
  const offer = useApp((s) => s.offer)
  const locks = useApp((s) => s.ui.offerLocks)
  const rate = useApp((s) => s.settings.rate)
  const { updateOffer, setOfferMode, toggleLock } = useApp.getState()
  const { offer: o } = useDerived()
  const { fmt } = useMoney()
  const setComponents = (patch: Partial<OfferInput['components']>) => updateOffer((p) => ({ ...p, components: { ...p.components, ...patch } }))
  const hasUsd =
    offer.mode === 'distribution'
      ? offer.distribution.total.currency === 'USD'
      : [offer.components.base, offer.components.bonus.fixed].some((m) => m.currency === 'USD')

  return (
    <Card aria-labelledby="offer-title" data-testid="offer-panel">
      <CardHeader>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-surface-2 text-ink">
              <Briefcase className="size-4" aria-hidden />
            </span>
            <CardTitle id="offer-title">The Offer</CardTitle>
          </div>
          <CardDescription>What the recruiter has put on the table.</CardDescription>
        </div>
        <Segmented
          layoutId="offer-mode"
          ariaLabel="Offer entry mode"
          size="sm"
          value={offer.mode}
          onChange={setOfferMode}
          testId="offer-mode"
          options={[
            { value: 'distribution', label: 'Total & split' },
            { value: 'components', label: 'By component' },
          ]}
        />
      </CardHeader>

      <div className="space-y-4">
        {offer.mode === 'distribution' ? (
          <DistributionEditor
            idPrefix="offer"
            totalLabel="Total annual offer"
            value={offer.distribution}
            onChange={(distribution) => updateOffer((p) => ({ ...p, distribution }))}
            locks={locks}
            onToggleLock={(k) => toggleLock('offer', k)}
          />
        ) : (
          <>
            <MoneyField label="Base salary" value={offer.components.base} onChange={(base) => setComponents({ base })} testId="offer-base" hint="Guaranteed cash." />
            <div className="rounded-2xl border border-line p-4">
              <BonusEditor idPrefix="offer" value={offer.components.bonus} onChange={(bonus) => setComponents({ bonus })} baseUsd={o.base} targetUsd={o.bonusTarget} />
            </div>
            <div className="rounded-2xl border border-line p-4">
              <EquityEditor idPrefix="offer" value={offer.components.equity} onChange={(equity) => setComponents({ equity })} rate={rate} />
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
              <span className="text-sm font-semibold text-ink-soft">Recurring annual total</span>
              <span className="font-display-tight text-lg font-semibold tnum" data-testid="offer-computed-total">
                {fmt(o.recurring)}
              </span>
            </div>
          </>
        )}

        <Disclosure title="Sign-on bonus" summary={o.signOnTotal > 0 ? `${fmt(o.signOnTotal)} one-time` : 'None recorded'} testId="offer-signon-toggle">
          <SignOnEditor value={offer.signOn} onChange={(signOn) => updateOffer((p) => ({ ...p, signOn }))} />
        </Disclosure>

        <Disclosure
          title="Currency arrangement & constraints"
          summary={offer.usdPayment === 'usdLinkedEgp' ? 'USD-linked, paid in EGP' : 'USD amounts paid in USD; EGP amounts fixed in EGP'}
          testId="offer-arrangement-toggle"
        >
          <div className="space-y-2">
            <span className="block text-[0.8125rem] font-semibold text-ink-soft">USD amounts are…</span>
            <Segmented
              size="sm"
              className="w-full"
              layoutId="offer-usd-payment"
              ariaLabel="How USD amounts are paid"
              value={offer.usdPayment}
              onChange={(usdPayment) => updateOffer((p) => ({ ...p, usdPayment }))}
              options={[
                { value: 'usd', label: 'Paid in USD' },
                { value: 'usdLinkedEgp', label: 'USD-linked, paid in EGP' },
              ]}
            />
            <p className="text-xs leading-relaxed text-muted">
              {hasUsd
                ? offer.usdPayment === 'usd'
                  ? 'USD-denominated pay: its USD value is fixed; the EGP equivalent changes with the rate.'
                  : 'USD-linked pay: the EGP you receive is recalculated at the prevailing rate, so its USD value stays constant.'
                : 'Amounts entered in EGP are treated as contractually fixed in EGP: their USD-equivalent moves with the exchange rate.'}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="offer-band" className="font-medium">
              Recruiter said base has limited flexibility
            </Label>
            <Switch id="offer-band" checked={offer.baseBandLimited} onCheckedChange={(baseBandLimited) => updateOffer((p) => ({ ...p, baseBandLimited }))} />
          </div>
        </Disclosure>
      </div>
    </Card>
  )
}
