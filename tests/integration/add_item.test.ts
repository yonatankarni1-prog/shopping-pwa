import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient, makeHousehold } from '../helpers'

const admin = adminClient()
let hid: string

beforeAll(async () => {
  const h = await makeHousehold(admin)
  hid = h.id
})

afterAll(async () => {
  await admin.from('households').delete().eq('id', hid)
})

describe('add_item RPC', () => {
  it('creates a new item, then increments qty on duplicate (normalized match)', async () => {
    const first = await admin.rpc('add_item', { p_household_id: hid, p_name: 'חלב', p_source: 'manual' })
    expect(first.error).toBeNull()
    expect(first.data.status).toBe('created')
    expect(first.data.qty).toBe(1)

    const dup = await admin.rpc('add_item', { p_household_id: hid, p_name: '  חָלָב ', p_source: 'whatsapp' })
    expect(dup.error).toBeNull()
    expect(dup.data.status).toBe('existing')
    expect(dup.data.id).toBe(first.data.id)
    expect(dup.data.qty).toBe(2)

    // original text preserved, not normalized
    const { data: row } = await admin.from('items').select('name').eq('id', first.data.id).single()
    expect(row!.name).toBe('חלב')
  })

  it('bought item does not absorb a new add — a fresh active row is created', async () => {
    const a = await admin.rpc('add_item', { p_household_id: hid, p_name: 'לחם' })
    await admin.from('items').update({ bought: true }).eq('id', a.data.id)
    const b = await admin.rpc('add_item', { p_household_id: hid, p_name: 'לחם' })
    expect(b.data.status).toBe('created')
    expect(b.data.id).not.toBe(a.data.id)
  })

  it('race: two concurrent adds of the same name yield one row with qty 2', async () => {
    const [r1, r2] = await Promise.all([
      admin.rpc('add_item', { p_household_id: hid, p_name: 'ביצים' }),
      admin.rpc('add_item', { p_household_id: hid, p_name: 'ביצים' }),
    ])
    expect(r1.error).toBeNull()
    expect(r2.error).toBeNull()
    const statuses = [r1.data.status, r2.data.status].sort()
    expect(statuses).toEqual(['created', 'existing'])
    const { data: rows } = await admin
      .from('items').select('qty').eq('household_id', hid).eq('normalized', 'ביצים').eq('bought', false)
    expect(rows).toHaveLength(1)
    expect(rows![0].qty).toBe(2)
  })

  it('rejects empty-after-normalization names and invalid source', async () => {
    const empty = await admin.rpc('add_item', { p_household_id: hid, p_name: ' !!! ' })
    expect(empty.error?.message).toContain('empty_name')
    const badSrc = await admin.rpc('add_item', { p_household_id: hid, p_name: 'גבינה', p_source: 'email' })
    expect(badSrc.error?.message).toContain('invalid_source')
  })

  it('update trigger keeps normalized in sync and stamps bought_at', async () => {
    const r = await admin.rpc('add_item', { p_household_id: hid, p_name: 'עגבניות' })
    await admin.from('items').update({ bought: true }).eq('id', r.data.id)
    const { data: bought } = await admin.from('items').select('bought_at').eq('id', r.data.id).single()
    expect(bought!.bought_at).not.toBeNull()
    await admin.from('items').update({ bought: false }).eq('id', r.data.id)
    const { data: unbought } = await admin.from('items').select('bought_at').eq('id', r.data.id).single()
    expect(unbought!.bought_at).toBeNull()
  })
})
