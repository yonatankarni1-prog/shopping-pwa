// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Toast } from '../../src/components/Toast'

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('re-displays an identical message when nonce changes', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Toast toast={{ text: 'שגיאה', nonce: 1 }} />)
    expect(screen.getByRole('status').textContent).toBe('שגיאה')

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.queryByRole('status')).toBeNull()

    rerender(<Toast toast={{ text: 'שגיאה', nonce: 2 }} />)
    expect(screen.getByRole('status').textContent).toBe('שגיאה')
  })
})
