export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#172723" />
      <path d="M8 21a8 8 0 1 1 16 0" fill="none" stroke="#3f5a53" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 21a8 8 0 0 1 11.6-7.1" fill="none" stroke="#0C8F83" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 21l4.2-5.6" stroke="#F7F6F2" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="21" r="1.8" fill="#D49A44" />
    </svg>
  )
}
