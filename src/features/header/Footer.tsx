import { ShieldCheck } from 'lucide-react'

export function Footer() {
  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 pb-24 pt-6 text-xs lg:pb-6 leading-relaxed text-muted sm:px-6 lg:px-8">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Your numbers are stored only in this browser (localStorage). Nothing is uploaded and no account is needed.
        </p>
        <p>
          All amounts are gross, before tax. Egyptian income tax and social insurance are not modelled. The exchange rate is your own
          assumption, not a live rate. Target bonuses and equity are not guaranteed, and equity value at vesting can differ from its grant value.
          Counteroffer scenarios model requests, not likely outcomes.
        </p>
      </div>
    </footer>
  )
}
