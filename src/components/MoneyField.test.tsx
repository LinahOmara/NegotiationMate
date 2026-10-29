import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoneyField } from './MoneyField'

describe('MoneyField', () => {
  const value = { amount: 70900, currency: 'USD' as const, period: 'annual' as const }

  it('formats the amount and emits parsed values', () => {
    const onChange = vi.fn()
    render(<MoneyField label="Total" value={value} onChange={onChange} testId="f" />)
    const input = screen.getByTestId('f') as HTMLInputElement
    expect(input.value).toBe('70,900')
    fireEvent.change(input, { target: { value: '80k' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...value, amount: 80000 })
  })

  it('rejects negative values with an inline message', () => {
    const onChange = vi.fn()
    render(<MoneyField label="Total" value={value} onChange={onChange} testId="f" />)
    fireEvent.change(screen.getByTestId('f'), { target: { value: '-5' } })
    expect(screen.getByRole('alert')).toHaveTextContent(/negative/i)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByTestId('f')).toHaveAttribute('aria-invalid', 'true')
  })

  it('switches currency and period without changing the amount', () => {
    const onChange = vi.fn()
    render(<MoneyField label="Total" value={value} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'EGP' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...value, currency: 'EGP' })
    fireEvent.click(screen.getByRole('radio', { name: '/mo' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...value, period: 'monthly' })
  })
})
