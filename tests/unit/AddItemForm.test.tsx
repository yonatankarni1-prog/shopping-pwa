// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddItemForm } from '../../src/components/AddItemForm'

describe('AddItemForm', () => {
  it('submits trimmed value and clears the input', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined)
    render(<AddItemForm onAdd={onAdd} disabled={false} />)
    const input = screen.getByPlaceholderText('מה להוסיף?')
    await userEvent.type(input, '  חלב  {enter}')
    expect(onAdd).toHaveBeenCalledWith('חלב')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('ignores empty submissions', async () => {
    const onAdd = vi.fn()
    render(<AddItemForm onAdd={onAdd} disabled={false} />)
    await userEvent.type(screen.getByPlaceholderText('מה להוסיף?'), '   {enter}')
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('is fully disabled when offline', () => {
    render(<AddItemForm onAdd={vi.fn()} disabled={true} />)
    expect((screen.getByPlaceholderText('מה להוסיף?') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'הוסף' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
