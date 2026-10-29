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
- [x] 1. Scaffold: Vite + React + TS, Tailwind v4, radix-ui, motion, recharts, zustand, zod, decimal.js, lucide; ESLint; Vitest; Playwright
- [x] 2. Design tokens (CSS variables, light theme palette, Fraunces/Manrope self-hosted fonts)
- [x] 3. Domain models (Money with explicit currency + FX arrangement, components, zod schemas)
- [x] 4. Calculation engine (TDD) — conversion, normalization, totals, gaps, variable %, bonus payout, equity vesting, first-year vs recurring, FX sensitivity, counteroffers; spec cases 1–6
- [x] 5. Guidance engine (TDD) — deterministic rules, prioritized insights
- [x] 6. Scenario solver (TDD) — quick actions (close gap, base-first, equity-only, sign-on, match target with mix)
- [x] 7. Store + persistence (zustand, versioned schema, migration, malformed state, JSON import/export)
- [x] 8. UI: header, target panel (percent/amount modes, linked sliders), offer panel (bonus & equity simple/advanced, sign-on)
- [x] 9. UI: hero comparison, breakdown chart + table, gap insights
- [x] 10. UI: Explore Your Next Move (scenarios, sliders, quick actions, compare)
- [x] 11. UI: guidance cards with copy, FX sensitivity section
- [x] 12. UI: offer history (save, compare two, timeline), print summary
- [x] 13. Focus Mode (signature feature) + keyboard shortcuts
- [x] 14. Playwright e2e interaction tests
- [x] 15. Visual tests at 320/375/430/768/1024/1440/1920 (dashboard + Focus); inspect screenshots, fix, re-run
- [x] 16. README, deployment docs (subdir base), screenshots in docs/
- [x] 17. Final gate: typecheck, lint, unit, e2e, build; commit + push

## Log
- 22:50 Scaffold + domain schema (zod) + calc engine (money, bonus, equity, package, distribution, fx, scenarios) — 84 unit tests green, spec cases 1–6 covered.
- 23:05 Guidance engine + gap analysis + persistence (versioned, migrations) + zustand store — TDD, 133 tests.
- 23:20 Full UI built: header, hero, target/offer panels, breakdown chart + table, gap analysis, guidance cards w/ copy, scenario explorer w/ solvers, FX sensitivity, Focus Mode + shortcuts, mobile sticky gap bar.
- 23:25 Delegated: Sonnet → offer history/compare, save dialog, JSON import dialog, print summary (reviewed: renders well; print = 1 A4 page). Haiku → README draft. Sonnet → Playwright interaction specs (in progress).
- 23:35 Screenshot review at 320/375/1366/1440: fixed title truncation, table clipping on narrow phones (compact amounts), copy-button wrapping, Focus Mode fits 1440×900 without scrolling.
- Push to GitHub blocked (403: Claude GitHub App lacks access to LinahOmara/BakerMate) — commits are local until access is fixed.
- 23:50 Sonnet e2e suite (17 tests) green; it found a real bug (debounced save lost on immediate reload) → fixed with pagehide/beforeunload/visibilitychange flush, test re-enabled.
- 23:55 Visual suite at 7 widths × (dashboard, Focus) green; fixed 768px header overlap, small scenario-name target. Screenshots in docs/screenshots.
- 00:00 Service worker for offline reopen (verified offline reload); vendor code splitting; subdirectory hosting verified. Final gate: typecheck ✓ lint ✓ 143 unit ✓ 32 Playwright ✓ build ✓.
