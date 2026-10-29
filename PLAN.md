# Compensation Negotiation Cockpit — Build Plan

Living plan. Each task is checked off when finished (TDD: tests first, then implementation).

Location: `compensation-cockpit/` (new standalone Vite app inside this repo).
Branch: `claude/compensation-negotiation-cockpit-5tlo32`.

## Environment notes
- Node 22, npm 10. Playwright 1.63 + Chromium preinstalled at /opt/pw-browsers (pin `@playwright/test@1.63.0`).
- `ui.shadcn.com` and `motion.dev` are blocked by the network policy → shadcn/ui components are
  hand-authored in shadcn style on top of `radix-ui` primitives (same API/pattern as the CLI output).
  `npx motion-ai` cannot reach its hosted MCP/skill endpoints; Motion is used directly from `motion/react`.

## Tasks
- [ ] 1. Scaffold: Vite + React + TS, Tailwind v4, radix-ui, motion, recharts, zustand, zod, decimal.js, lucide; ESLint; Vitest; Playwright
- [ ] 2. Design tokens (CSS variables, light theme palette, Fraunces/Manrope self-hosted fonts)
- [ ] 3. Domain models (Money with explicit currency + FX arrangement, components, zod schemas)
- [ ] 4. Calculation engine (TDD) — conversion, normalization, totals, gaps, variable %, bonus payout, equity vesting, first-year vs recurring, FX sensitivity, counteroffers; spec cases 1–6
- [ ] 5. Guidance engine (TDD) — deterministic rules, prioritized insights
- [ ] 6. Scenario solver (TDD) — quick actions (close gap, base-first, equity-only, sign-on, match target with mix)
- [ ] 7. Store + persistence (zustand, versioned schema, migration, malformed state, JSON import/export)
- [ ] 8. UI: header, target panel (percent/amount modes, linked sliders), offer panel (bonus & equity simple/advanced, sign-on)
- [ ] 9. UI: hero comparison, breakdown chart + table, gap insights
- [ ] 10. UI: Explore Your Next Move (scenarios, sliders, quick actions, compare)
- [ ] 11. UI: guidance cards with copy, FX sensitivity section
- [ ] 12. UI: offer history (save, compare two, timeline), print summary
- [ ] 13. Focus Mode (signature feature) + keyboard shortcuts
- [ ] 14. Playwright e2e interaction tests
- [ ] 15. Visual tests at 320/375/430/768/1024/1440/1920 (dashboard + Focus); inspect screenshots, fix, re-run
- [ ] 16. README, deployment docs (subdir base), screenshots in docs/
- [ ] 17. Final gate: typecheck, lint, unit, e2e, build; commit + push

## Log
