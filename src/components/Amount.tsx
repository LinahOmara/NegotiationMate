/** Full amount on wider screens, compact (e.g. $60.3K) on narrow phones so table columns never clip. */
export function ResponsiveAmount({ full, compact }: { full: string; compact: string }) {
  return (
    <>
      <span className="xs:hidden" aria-hidden>
        {compact}
      </span>
      <span className="hidden xs:inline">{full}</span>
      <span className="sr-only xs:hidden">{full}</span>
    </>
  )
}
