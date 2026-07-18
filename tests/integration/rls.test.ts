import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import { adminClient, anonClient, makeHousehold } from '../helpers'

const admin = adminClient()
let hA: { id: string; invite_code: string }
let hB: { id: string; invite_code: string }
let userA: SupabaseClient // member of household A
let userB: SupabaseClient // member of household B
let stranger: SupabaseClient // anonymous, no membership

const anonUserIds: string[] = []

async function signInAnon(c: SupabaseClient) {
  const { data, error } = await c.auth.signInAnonymously()
  if (error) throw error
  anonUserIds.push(data.user!.id)
}

beforeAll(async () => {
  hA = await makeHousehold(admin)
  hB = await makeHousehold(admin)
  userA = anonClient(); userB = anonClient(); stranger = anonClient()
  await signInAnon(userA); await signInAnon(userB); await signInAnon(stranger)
  const ja = await userA.rpc('join_household', { p_invite_code: hA.invite_code })
  expect(ja.error).toBeNull()
  const jb = await userB.rpc('join_household', { p_invite_code: hB.invite_code })
  expect(jb.error).toBeNull()
  const seeded = await userA.rpc('add_item', { p_household_id: hA.id, p_name: 'חלב' })
  expect(seeded.error).toBeNull()
})

afterAll(async () => {
  await admin.from('households').delete().eq('id', hA.id)
  await admin.from('households').delete().eq('id', hB.id)
  // Anonymous users accumulate in auth.users forever and count against the
  // ~30/hour anon sign-in IP limit — delete them so TDD reruns stay green.
  for (const id of anonUserIds) await admin.auth.admin.deleteUser(id)
})

describe('RLS isolation (spec §5, §9)', () => {
  it('member reads own household items; other household sees zero rows', async () => {
    const mine = await userA.from('items').select('*').eq('household_id', hA.id)
    expect(mine.data).toHaveLength(1)
    const theirs = await userB.from('items').select('*').eq('household_id', hA.id)
    expect(theirs.data).toHaveLength(0) // filtered by RLS, not an error
  })

  it('anon user without membership sees nothing and cannot add via RPC', async () => {
    const read = await stranger.from('items').select('*').eq('household_id', hA.id)
    expect(read.data).toHaveLength(0)
    const write = await stranger.rpc('add_item', { p_household_id: hA.id, p_name: 'פריצה' })
    expect(write.error?.message).toContain('not_a_member')
  })

  it('cross-household writes are blocked (update/delete affect 0 rows)', async () => {
    const { data: row } = await userA.from('items').select('id').eq('household_id', hA.id).single()
    await userB.from('items').update({ bought: true }).eq('id', row!.id)
    const after = await admin.from('items').select('bought').eq('id', row!.id).single()
    expect(after.data!.bought).toBe(false)
    await userB.from('items').delete().eq('id', row!.id)
    const still = await admin.from('items').select('id').eq('id', row!.id)
    expect(still.data).toHaveLength(1)
  })

  it('direct INSERT into items is denied even for a member', async () => {
    const ins = await userA.from('items').insert({
      household_id: hA.id, name: 'עוקף', normalized: 'עוקף', source: 'manual',
    })
    expect(ins.error).not.toBeNull() // no INSERT policy → 42501
  })

  it('member can toggle bought and delete own-household item', async () => {
    const r = await userA.rpc('add_item', { p_household_id: hA.id, p_name: 'קפה' })
    const upd = await userA.from('items').update({ bought: true }).eq('id', r.data.id).select().single()
    expect(upd.error).toBeNull()
    expect(upd.data!.bought).toBe(true)
    const del = await userA.from('items').delete().eq('id', r.data.id)
    expect(del.error).toBeNull()
  })

  it('invalid invite code is rejected', async () => {
    const bad = await stranger.rpc('join_household', { p_invite_code: 'deadbeefdeadbeef' })
    expect(bad.error?.message).toContain('invalid_invite')
  })

  it('join_household is idempotent — joining twice is not an error and yields the same household', async () => {
    const again = await userA.rpc('join_household', { p_invite_code: hA.invite_code })
    expect(again.error).toBeNull()
    expect(again.data).toBe(hA.id)
    const { data: rows } = await admin.from('household_members')
      .select('user_id').eq('household_id', hA.id)
    const mine = rows!.filter((r) => r.user_id === anonUserIds[0])
    expect(mine).toHaveLength(1)
  })
})
