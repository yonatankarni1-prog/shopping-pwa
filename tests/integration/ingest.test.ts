import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { adminClient } from '../helpers'

const URL = `${process.env.SUPABASE_URL}/functions/v1/ingest`
// Test secret routes to the TEST household — production family list is
// never touched by this suite (codex G-gate finding 3).
const SECRET = process.env.INGEST_TEST_SECRET!
const HID = process.env.TEST_HOUSEHOLD_ID!
const admin = adminClient()
// Unique per run: a leftover active row from a crashed prior run would
// otherwise flip the 'created' assertion to 'existing' (flaky).
const PREFIX = 'טסט-אינגסט-'
const TEST_ITEM = PREFIX + Date.now()

async function cleanup() {
  await admin.from('items').delete().eq('household_id', HID).ilike('name', `${PREFIX}%`)
}
beforeAll(cleanup)
afterAll(cleanup)

async function post(body: unknown, secret?: string) {
  return fetch(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(secret ? { 'x-ingest-secret': secret } : {}) },
    body: JSON.stringify(body),
  })
}

describe('ingest edge function (spec §4.2, §8)', () => {
  it('rejects missing/wrong secret with 401', async () => {
    expect((await post({ items: [{ name: TEST_ITEM }] })).status).toBe(401)
    expect((await post({ items: [{ name: TEST_ITEM }] }, 'wrong')).status).toBe(401)
  })

  it('rejects malformed payloads with 400', async () => {
    expect((await post({}, SECRET)).status).toBe(400)
    expect((await post({ items: [] }, SECRET)).status).toBe(400)
    expect((await post({ items: [{ name: '' }] }, SECRET)).status).toBe(400)
    expect((await post({ items: 'חלב' }, SECRET)).status).toBe(400)
  })

  it('accepts a valid batch, lands via add_item with source=whatsapp, dedups', async () => {
    const r1 = await post({ items: [{ name: TEST_ITEM }] }, SECRET)
    expect(r1.status).toBe(200)
    const body1 = await r1.json()
    expect(body1.results[0].status).toBe('created')

    const r2 = await post({ items: [{ name: ` ${TEST_ITEM} ` }] }, SECRET)
    const body2 = await r2.json()
    expect(body2.results[0].status).toBe('existing')
    expect(body2.results[0].qty).toBe(2)

    const { data } = await admin.from('items')
      .select('source, qty').eq('household_id', HID).eq('name', TEST_ITEM).eq('bought', false).single()
    expect(data!.source).toBe('whatsapp')
    expect(data!.qty).toBe(2)
  })
})
