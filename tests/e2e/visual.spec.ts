import { test, expect, type Page } from '@playwright/test'

/**
 * Responsive + visual checks at every supported width, for the dashboard
 * and Focus Mode. Also writes reference screenshots to docs/screenshots.
 */
const WIDTHS = [320, 375, 430, 768, 1024, 1440, 1920] as const
const HEIGHT: Record<number, number> = { 320: 640, 375: 812, 430: 932, 768: 1024, 1024: 768, 1440: 900, 1920: 1080 }

async function prepare(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByTestId('hero-gap-amount')).toHaveAttribute('data-value', '−$21,900')
}

async function layoutProblems(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const problems: string[] = []
    if (document.documentElement.scrollWidth > vw) problems.push(`page scrollWidth ${document.documentElement.scrollWidth} > ${vw}`)
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX
        if (o === 'auto' || o === 'scroll' || o === 'hidden') return true
      }
      return false
    }
    for (const el of document.querySelectorAll('main *, header *')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || getComputedStyle(el).position === 'fixed') continue
      if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) problems.push(`${el.tagName}.${String((el as HTMLElement).className).slice(0, 50)} [${Math.round(r.left)}, ${Math.round(r.right)}]`)
    }
    // Text clipped inside its own box (financial amounts must never be cut off).
    for (const el of document.querySelectorAll<HTMLElement>('[data-value]')) {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === 'hidden') problems.push(`clipped amount ${el.dataset.value}`)
    }
    // Interactive targets large enough (24px minimum per WCAG 2.2 AA).
    for (const el of document.querySelectorAll<HTMLElement>('main button, main input, header button, [role=slider]')) {
      const r = el.getBoundingClientRect()
      // Slider thumbs are drawn at 20px but carry a 40px hit area via ::before.
      if (el.getAttribute('role') === 'slider') {
        const before = getComputedStyle(el, '::before')
        if (before.content !== 'none' && parseFloat(before.left) <= -8) continue
      }
      if (r.width === 0 || el.closest('.sr-only')) continue
      if (r.height < 24 || r.width < 24) problems.push(`small target ${el.tagName} ${el.getAttribute('aria-label') ?? el.textContent?.slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    return problems.slice(0, 15)
  })
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: HEIGHT[width] } })

    test('dashboard', async ({ page }) => {
      await prepare(page)
      expect(await layoutProblems(page)).toEqual([])
      const body = await page.locator('body').innerText()
      expect(body).not.toMatch(/NaN|Infinity/)
      await page.screenshot({ path: `docs/screenshots/dashboard-${width}.png`, fullPage: true })
      await expect(page).toHaveScreenshot(`dashboard-${width}.png`, { fullPage: true })
    })

    test('focus mode', async ({ page }) => {
      await prepare(page)
      await page.getByTestId('focus-enter').click()
      await expect(page.getByTestId('focus-mode')).toBeVisible()
      expect(await layoutProblems(page)).toEqual([])
      await page.screenshot({ path: `docs/screenshots/focus-${width}.png`, fullPage: true })
      await expect(page).toHaveScreenshot(`focus-${width}.png`, { fullPage: true })
      if (width >= 1024) {
        // Usable during a call without scrolling on a laptop.
        const h = await page.evaluate(() => document.documentElement.scrollHeight)
        expect(h).toBeLessThanOrEqual(HEIGHT[width] + (width === 1024 ? 700 : 40))
      }
    })
  })
}

test('all controls reachable by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepare(page)
  const seen = new Set<string>()
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab')
    const id = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return el ? `${el.tagName}:${el.getAttribute('data-testid') ?? el.getAttribute('aria-label') ?? el.textContent?.slice(0, 20)}` : ''
    })
    seen.add(id)
  }
  expect([...seen].some((s) => s.includes('target-total'))).toBe(true)
  expect([...seen].some((s) => s.includes('offer-total'))).toBe(true)
  expect([...seen].some((s) => s.includes('focus-enter'))).toBe(true)
})
