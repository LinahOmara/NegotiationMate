import { test, expect } from '@playwright/test'
import { MINUS, STORAGE_KEY, expectNoBadNumbers, expectValue, menuAction, openFresh, setDisplay, setRate } from './helpers'

test.beforeEach(async ({ page }) => {
  await openFresh(page)
})

const hero = (page: import('@playwright/test').Page, id: string) => page.getByTestId(id)

test('1. default demo renders correct hero numbers', async ({ page }) => {
  await expectValue(hero(page, 'hero-target-total'), '$70,900')
  await expectValue(hero(page, 'hero-offer-total'), '$49,000')
  await expectValue(hero(page, 'hero-target-total-secondary'), 'EGP 3,757,700')
  await expectValue(hero(page, 'hero-offer-total-secondary'), 'EGP 2,597,000')
  await expectValue(hero(page, 'hero-gap-amount'), `${MINUS}$21,900`)
  await expect(hero(page, 'hero-gap-pct')).toHaveText(`${MINUS}30.9%`)
  await expect(hero(page, 'hero-reach')).toHaveText('Offer reaches 69% of your target.')
  await expect(page.getByTestId('demo-banner')).toBeVisible()
  await expect(page.getByTestId('rate-display')).toHaveText('1 USD = 53.00 EGP')
})

test('2. editing target total updates hero target and gap', async ({ page }) => {
  await page.getByTestId('target-total').fill('80000')
  await expectValue(hero(page, 'hero-target-total'), '$80,000')
  await expectValue(hero(page, 'hero-gap-amount'), `${MINUS}$31,000`)
})

test('3. editing offer total updates gap and reach', async ({ page }) => {
  await page.getByTestId('offer-total').fill('60000')
  await expectValue(hero(page, 'hero-offer-total'), '$60,000')
  await expectValue(hero(page, 'hero-gap-amount'), `${MINUS}$10,900`)
  await expect(hero(page, 'hero-reach')).toHaveText('Offer reaches 85% of your target.')
})

test('4. percentage mode rebalances and respects locks', async ({ page }) => {
  await page.getByTestId('target-pct-base').fill('80')
  await expect(page.getByTestId('target-pct-sum')).toHaveText('100% of 100%')
  await expectValue(hero(page, 'hero-target-total'), '$70,900')

  // Lock equity at its current value, then change base: equity must not move.
  const equity = page.getByTestId('target-pct-equity')
  const equityBefore = await equity.inputValue()
  const targetPanel = page.getByTestId('target-panel')
  await targetPanel.getByRole('button', { name: 'Lock Equity percentage' }).click()
  await expect(targetPanel.getByRole('button', { name: 'Unlock Equity percentage' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('target-pct-base').fill('70')
  await expect(page.getByTestId('target-pct-sum')).toHaveText('100% of 100%')
  await expect(equity).toHaveValue(equityBefore)
  const bonus = Number(await page.getByTestId('target-pct-bonus').inputValue())
  expect(bonus + 70 + Number(equityBefore)).toBeCloseTo(100, 0)
  await expectValue(hero(page, 'hero-target-total'), '$70,900')
})

test('5. amount mode carries values and switches back losslessly', async ({ page }) => {
  const mode = page.getByTestId('target-mode')
  await mode.getByRole('radio', { name: 'Amounts' }).click()
  await expectValue(hero(page, 'hero-target-total'), '$70,900')
  await expect(page.getByTestId('target-computed-total')).toHaveText('$70,900')
  await expect(page.getByTestId('target-base')).toHaveValue('60,265')

  await page.getByTestId('target-base').fill('70000')
  // 70,000 + 7,090 + 3,545
  await expect(page.getByTestId('target-computed-total')).toHaveText('$80,635')
  await expectValue(hero(page, 'hero-target-total'), '$80,635')

  await mode.getByRole('radio', { name: 'Percentages' }).click()
  await expect(page.getByTestId('target-total')).toHaveValue('80,635')
  await expect(page.getByTestId('target-pct-sum')).toHaveText('100% of 100%')
  await expectValue(hero(page, 'hero-target-total'), '$80,635')
})

test('6. offer by component: bonus % of base and grant vesting', async ({ page }) => {
  const panel = page.getByTestId('offer-panel')
  await page.getByTestId('offer-mode').getByRole('radio', { name: 'By component' }).click()
  await page.getByTestId('offer-base').fill('50000')

  await panel.getByRole('radio', { name: '% of base' }).click()
  await page.getByTestId('offer-bonus-pct').fill('10')

  await panel.getByRole('radio', { name: 'Grant & vesting' }).click()
  await page.getByTestId('offer-equity-grant').fill('20000')
  await expect(page.getByTestId('offer-equity-years')).toHaveValue('4')

  // 50,000 + 5,000 bonus + 5,000/yr equity (not 20,000)
  await expect(page.getByTestId('offer-computed-total')).toHaveText('$60,000')
  await expectValue(hero(page, 'hero-offer-total'), '$60,000')
})

test('7. display currency changes hero formatting', async ({ page }) => {
  await setDisplay(page, 'EGP')
  await expectValue(hero(page, 'hero-target-total'), 'EGP 3,757,700')
  await expectValue(hero(page, 'hero-offer-total'), 'EGP 2,597,000')
  await expect(hero(page, 'hero-target-total-secondary')).toHaveCount(0)

  await setDisplay(page, 'USD')
  await expectValue(hero(page, 'hero-target-total'), '$70,900')
  await expect(hero(page, 'hero-target-total-secondary')).toHaveCount(0)

  await setDisplay(page, 'Both')
  await expectValue(hero(page, 'hero-target-total'), '$70,900')
  await expectValue(hero(page, 'hero-target-total-secondary'), 'EGP 3,757,700')

  await page.getByTestId('swap-emphasis').click()
  await expectValue(hero(page, 'hero-target-total'), 'EGP 3,757,700')
  await expectValue(hero(page, 'hero-target-total-secondary'), '$70,900')
})

test('8. changing FX rate updates equivalents, and EGP-fixed offers move in USD', async ({ page }) => {
  await setRate(page, '60')
  await expect(page.getByTestId('rate-display')).toHaveText('1 USD = 60.00 EGP')
  await expectValue(hero(page, 'hero-target-total-secondary'), 'EGP 4,254,000')
  await expectValue(hero(page, 'hero-target-total'), '$70,900')

  // Back to 53, then enter the offer in EGP.
  await setRate(page, '53')
  await page.getByRole('radiogroup', { name: 'Total annual offer currency' }).getByRole('radio', { name: 'EGP' }).click()
  await page.getByTestId('offer-total').fill('2597000')
  await expectValue(hero(page, 'hero-offer-total'), '$49,000')

  await setRate(page, '60')
  await expectValue(hero(page, 'hero-offer-total'), '$43,283')
})

test('9. focus mode via button and "f", editing offer updates gap, Escape exits', async ({ page }) => {
  await page.getByTestId('focus-enter').click()
  await expect(page.getByTestId('focus-mode')).toBeVisible()
  await expectValue(page.getByTestId('focus-gap'), `${MINUS}$21,900`)

  await page.getByTestId('focus-offer-total').fill('60000')
  await expectValue(page.getByTestId('focus-gap'), `${MINUS}$10,900`)

  await page.keyboard.press('Escape') // focus is in an input: first blur, then exit
  if (await page.getByTestId('focus-mode').isVisible()) {
    await page.getByTestId('focus-mode').click({ position: { x: 2, y: 2 } })
    await page.keyboard.press('Escape')
  }
  await expect(page.getByTestId('focus-mode')).toBeHidden()
  await expectValue(hero(page, 'hero-offer-total'), '$60,000')

  // Keyboard shortcut in, exit button out.
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  await page.keyboard.press('f')
  await expect(page.getByTestId('focus-mode')).toBeVisible()
  await expect(page.getByTestId('focus-insights')).toBeVisible()
  await page.getByTestId('focus-exit').click()
  await expect(page.getByTestId('focus-mode')).toBeHidden()
  await page.keyboard.press('f')
  await expect(page.getByTestId('focus-mode')).toBeVisible()
  await page.getByTestId('focus-exit').click()
})

test('10. scenarios: balanced closes gap, sign-on closes year one only, current disables actions', async ({ page }) => {
  await page.getByTestId('scenario-tab-balanced').click()
  await expect(page.getByTestId('scenario-remaining-gap')).toContainText('$0')
  await expect(page.getByTestId('scenario-remaining-gap')).not.toContainText(MINUS)

  await page.getByTestId('scenario-tab-base-first').click()
  await page.getByTestId('solver-signOn').click()
  await expect(page.getByTestId('solver-note')).toBeVisible()
  await expect(page.getByTestId('solver-note')).toContainText(/sign-on/i)
  await expect(page.getByTestId('scenario-remaining-gap')).toContainText(`${MINUS}$21,900`)
  await expect(page.getByTestId('scenario-first-year')).toBeVisible()
  await expect(page.getByTestId('adj-signOn')).not.toHaveText('$0')

  await page.getByTestId('scenario-tab-current').click()
  for (const k of ['closeGap', 'baseFirst', 'equityOnly', 'signOn', 'matchMix']) {
    await expect(page.getByTestId(`solver-${k}`)).toBeDisabled()
  }
})

test('11. offer history persists across reload and compares', async ({ page }) => {
  await page.getByTestId('save-offer').click()
  await expect(page.getByTestId('save-dialog')).toBeVisible()
  await page.getByTestId('save-label').fill('Initial Offer')
  await page.getByTestId('save-notes').fill('first')
  await page.getByTestId('save-confirm').click()
  await expect(page.getByTestId('save-dialog')).toBeHidden()

  await page.getByTestId('offer-total').fill('55000')
  await expectValue(hero(page, 'hero-offer-total'), '$55,000')
  await page.getByTestId('save-offer').click()
  await page.getByTestId('save-label').fill('Revised Offer 1')
  await page.getByTestId('save-confirm').click()
  await expect(page.getByTestId('history-entry')).toHaveCount(2)
  // Persistence is debounced (250ms) in the store; wait for it to flush.
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}')?.data?.history?.length ?? 0, STORAGE_KEY))
    .toBe(2)

  await page.reload()
  await expect(page.getByTestId('history-entry')).toHaveCount(2)
  await expect(page.getByTestId('history-panel')).toContainText('Initial Offer')
  await expect(page.getByTestId('history-panel')).toContainText('Revised Offer 1')

  await page.getByTestId('history-select-0').click()
  await page.getByTestId('history-select-1').click()
  const cmp = page.getByTestId('history-compare')
  await expect(cmp).toBeVisible()
  await expect(cmp).toContainText('Improved')
  await expect(cmp.getByRole('row', { name: /Total recurring/ })).toContainText('Improved')
})

test('11b. history survives an immediate reload (no debounce data loss)', async ({ page }) => {
  await page.getByTestId('save-offer').click()
  await page.getByTestId('save-confirm').click()
  await expect(page.getByTestId('history-entry')).toHaveCount(1)
  await page.reload()
  await expect(page.getByTestId('history-entry')).toHaveCount(1)
})

test('12. JSON export / import round trip and invalid JSON', async ({ page }) => {
  await page.getByTestId('more-actions').click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-json').click()])
  expect(download.suggestedFilename()).toMatch(/\.json$/)
  const path = await download.path()
  const fs = await import('node:fs')
  const json = JSON.parse(fs.readFileSync(path, 'utf8'))
  expect(json.app).toBe('compensation-cockpit')
  json.data.target.distribution.total.amount = 90000
  const modified = Buffer.from(JSON.stringify(json))

  await menuAction(page, 'import-json')
  await expect(page.getByTestId('import-dialog')).toBeVisible()
  await expect(page.getByTestId('import-confirm')).toBeDisabled()
  await page.getByTestId('import-file').setInputFiles({ name: 'edited.json', mimeType: 'application/json', buffer: modified })
  await expect(page.getByTestId('import-summary')).toBeVisible()
  await page.getByTestId('import-confirm').click()
  await expect(page.getByTestId('import-dialog')).toBeHidden()
  await expectValue(hero(page, 'hero-target-total'), '$90,000')

  // Invalid JSON
  await menuAction(page, 'import-json')
  await page.getByTestId('import-text').fill('{ not json')
  await expect(page.getByTestId('import-errors')).toBeVisible()
  await expect(page.getByTestId('import-confirm')).toBeDisabled()
  await page.getByTestId('import-text').fill('{"app":"other"}')
  await expect(page.getByTestId('import-errors')).toBeVisible()
  await expect(page.getByTestId('import-confirm')).toBeDisabled()
})

test('13. start fresh clears values; reset restores demo', async ({ page }) => {
  await menuAction(page, 'start-fresh')
  await expectValue(hero(page, 'hero-target-total'), '$0')
  await expectValue(hero(page, 'hero-offer-total'), '$0')
  await expect(page.getByTestId('demo-banner')).toBeHidden()
  await expectNoBadNumbers(page)

  await menuAction(page, 'reset')
  await expectValue(hero(page, 'hero-target-total'), '$70,900')
  await expectValue(hero(page, 'hero-offer-total'), '$49,000')
  await expectValue(hero(page, 'hero-gap-amount'), `${MINUS}$21,900`)
  await expect(page.getByTestId('demo-banner')).toBeVisible()

  await page.getByTestId('banner-start-fresh').click()
  await expectValue(hero(page, 'hero-target-total'), '$0')
})

test('14. no NaN / Infinity in edge states', async ({ page }) => {
  await expectNoBadNumbers(page)

  await setRate(page, '0.5')
  await expectValue(hero(page, 'hero-target-total-secondary'), 'EGP 35,450')
  await expectNoBadNumbers(page)
  await setRate(page, '53')

  for (const k of ['base', 'bonus', 'equity']) {
    await page.getByTestId(`target-pct-${k}`).fill('0')
  }
  await expectNoBadNumbers(page)

  await menuAction(page, 'start-fresh')
  await expectNoBadNumbers(page)
  for (const k of ['base', 'bonus', 'equity']) {
    await page.getByTestId(`offer-pct-${k}`).fill('0')
  }
  await expectNoBadNumbers(page)
})

test('15. copy question copies the question text', async ({ page }) => {
  const insight = page.getByTestId('insight').first()
  await expect(insight).toBeVisible()
  const question = (await insight.getByTestId('insight-question').innerText()).trim().replace(/^[“"]|[”"]$/g, '')
  await insight.getByTestId('copy-question').click()
  await expect(insight.getByTestId('copy-question')).toContainText('Copied')
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe(question)
  expect(clip.length).toBeGreaterThan(10)
})

test('16. no horizontal page overflow at 1440', async ({ page }) => {
  const check = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(await check()).toBe(true)
  await page.getByTestId('offer-mode').getByRole('radio', { name: 'By component' }).click()
  await page.getByTestId('target-mode').getByRole('radio', { name: 'Amounts' }).click()
  expect(await check()).toBe(true)
})
