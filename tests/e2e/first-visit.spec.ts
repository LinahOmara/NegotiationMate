import { test, expect } from '@playwright/test'
import { MINUS, expectNoBadNumbers, expectValue, leaveFocus, openBlank } from './helpers'

test('first visit: opens in Focus Mode with no pre-filled numbers', async ({ page }) => {
  await openBlank(page)
  await expect(page.getByTestId('focus-offer-total')).toHaveValue('0')
  await expect(page.getByTestId('focus-target-total')).toHaveValue('0')
  await expect(page.getByTestId('focus-reach')).toHaveText('Enter a target to compare')
  await expect(page.getByTestId('demo-banner')).toHaveCount(0)
  await expectNoBadNumbers(page)
  await leaveFocus(page)
  await expect(page.getByTestId('demo-banner')).toBeHidden()
})

test('Focus Mode shows the target offer under the recruiter offer with the same breakdown', async ({ page }) => {
  await openBlank(page)
  const offer = page.getByRole('region', { name: 'Recruiter offer' })
  const target = page.getByRole('region', { name: 'Your target offer' })
  await expect(target).toBeVisible()
  const [o, t] = await Promise.all([offer.boundingBox(), target.boundingBox()])
  expect(t!.y).toBeGreaterThan(o!.y + o!.height - 1)
  for (const k of ['base', 'bonus', 'equity']) {
    await expect(page.getByTestId(`focus-offer-pct-${k}`)).toBeVisible()
    await expect(page.getByTestId(`focus-target-pct-${k}`)).toBeVisible()
  }
  await page.getByTestId('focus-target-total').fill('100000')
  await page.getByTestId('focus-offer-total').fill('80000')
  await expectValue(page.getByTestId('focus-gap'), `${MINUS}$20,000`)
  await target.getByRole('radio', { name: 'By component' }).click()
  await expect(page.getByTestId('focus-target-base')).toBeVisible()
  await expect(page.getByTestId('focus-offer-total')).toBeVisible()
})
