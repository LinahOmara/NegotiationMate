import { expect, type Locator, type Page } from '@playwright/test'

export const STORAGE_KEY = 'compensation-cockpit/state'
export const MINUS = '−'

/** Start from a clean browser state once per test (survives in-test reloads). */
export async function openFresh(page: Page) {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__e2e_seeded')) {
        localStorage.clear()
        sessionStorage.setItem('__e2e_seeded', '1')
      }
    } catch {
      /* ignore */
    }
  })
  await page.goto('/')
  await expect(page.getByTestId('hero-target-total')).toBeVisible()
}

/** Assert on the FINAL value of an animated number. */
export async function expectValue(loc: Locator, value: string | RegExp) {
  await expect(loc).toHaveAttribute('data-value', value)
}

export async function setField(input: Locator, value: string) {
  await input.fill(value)
}

export async function openMenu(page: Page) {
  await page.getByTestId('more-actions').click()
}

export async function menuAction(page: Page, testId: string) {
  await openMenu(page)
  await page.getByTestId(testId).click()
}

export async function setRate(page: Page, rate: string) {
  await page.getByTestId('rate-trigger').click()
  await page.getByTestId('rate-input').fill(rate)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('rate-input')).toBeHidden()
}

export async function expectNoBadNumbers(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/NaN/)
  expect(text).not.toMatch(/Infinity/)
}

export async function setDisplay(page: Page, name: 'USD' | 'EGP' | 'Both') {
  await page.getByTestId('display-currency').getByRole('radio', { name, exact: true }).click()
}
