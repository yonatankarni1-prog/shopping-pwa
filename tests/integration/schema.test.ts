import { describe, it, expect, afterAll } from 'vitest'
import { adminClient, makeHousehold } from '../helpers'

const admin = adminClient()
const created: string[] = []

afterAll(async () => {
  for (const id of created) await admin.from('households').delete().eq('id', id)
})

describe('schema', () => {
  it('creates a household with an invite code', async () => {
    const h = await makeHousehold(admin)
    created.push(h.id)
    expect(h.invite_code).toMatch(/^[0-9a-f]{16}$/)
  })

  it('normalize_name: trims, collapses spaces, strips niqqud and punctuation, keeps Hebrew', async () => {
    const cases: Array<[string, string | null]> = [
      ['  חלב  ', 'חלב'],
      ['חָלָב', 'חלב'],                 // niqqud stripped
      ["קוטג'", 'קוטג'],               // ascii apostrophe stripped
      ['במבה!!!', 'במבה'],
      ['מלפפון   חמוץ', 'מלפפון חמוץ'],
      ['Milk', 'milk'],
      ['   ', null],                    // empty after normalization
    ]
    for (const [input, expected] of cases) {
      const { data, error } = await admin.rpc('normalize_name', { p_input: input })
      expect(error).toBeNull()
      expect(data).toBe(expected)
    }
  })

  it('rejects invalid source and qty<1', async () => {
    const h = await makeHousehold(admin)
    created.push(h.id)
    const bad1 = await admin.from('items').insert({
      household_id: h.id, name: 'x', normalized: 'x', source: 'email',
    })
    expect(bad1.error).not.toBeNull()
    const bad2 = await admin.from('items').insert({
      household_id: h.id, name: 'x', normalized: 'x', source: 'manual', qty: 0,
    })
    expect(bad2.error).not.toBeNull()
  })
})
