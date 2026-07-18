import { describe, it, expect, vi } from 'vitest'
import { resolveHousehold } from '../../src/lib/session'

function memStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(), key: () => null, length: 0,
  } as Storage
}

describe('resolveHousehold', () => {
  it('redeems ?invite= and persists the household id', async () => {
    const storage = memStorage()
    const rpc = vi.fn().mockResolvedValue('hid-123')
    const hid = await resolveHousehold('?invite=abcd1234abcd1234', storage, rpc)
    expect(rpc).toHaveBeenCalledWith('abcd1234abcd1234')
    expect(hid).toBe('hid-123')
    expect(storage.getItem('household_id')).toBe('hid-123')
  })

  it('returns stored household when no invite in URL', async () => {
    const storage = memStorage()
    storage.setItem('household_id', 'hid-777')
    const rpc = vi.fn()
    expect(await resolveHousehold('', storage, rpc)).toBe('hid-777')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('falls back to stored household when redemption fails', async () => {
    const storage = memStorage()
    storage.setItem('household_id', 'hid-old')
    const rpc = vi.fn().mockRejectedValue(new Error('invalid_invite'))
    expect(await resolveHousehold('?invite=bad', storage, rpc)).toBe('hid-old')
  })

  it('returns null when nothing available', async () => {
    expect(await resolveHousehold('', memStorage(), vi.fn())).toBeNull()
  })
})
