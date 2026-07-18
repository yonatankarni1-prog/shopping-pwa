import { createClient } from 'npm:@supabase/supabase-js@2'

const INGEST_SECRET = Deno.env.get('INGEST_SECRET')!
const HOUSEHOLD_ID = Deno.env.get('HOUSEHOLD_ID')!
// Test isolation: the test secret routes writes to a throwaway household,
// so integration tests never transit the family's live list.
const INGEST_TEST_SECRET = Deno.env.get('INGEST_TEST_SECRET')!
const TEST_HOUSEHOLD_ID = Deno.env.get('TEST_HOUSEHOLD_ID')!
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const secret = req.headers.get('x-ingest-secret')
  let householdId: string | null = null
  if (secret && timingSafeEqual(secret, INGEST_SECRET)) householdId = HOUSEHOLD_ID
  else if (secret && timingSafeEqual(secret, INGEST_TEST_SECRET)) householdId = TEST_HOUSEHOLD_ID
  if (!householdId) {
    console.log('ingest: rejected — bad or missing secret')
    return json(401, { error: 'unauthorized' })
  }

  let body: { items?: Array<{ name?: unknown }> } | null = null
  try { body = await req.json() } catch { /* fallthrough */ }
  const items = body?.items
  const valid = Array.isArray(items) && items.length >= 1 && items.length <= 25 &&
    items.every((i) => typeof i?.name === 'string' && i.name.trim().length > 0 && i.name.length <= 200)
  if (!valid) {
    console.log(`ingest: rejected — bad payload: ${JSON.stringify(body)?.slice(0, 300)}`)
    return json(400, { error: 'bad_payload' })
  }

  const results: Array<Record<string, unknown>> = []
  for (const item of items as Array<{ name: string }>) {
    const { data, error } = await supabase.rpc('add_item', {
      p_household_id: householdId,
      p_name: item.name.trim(),
      p_source: 'whatsapp',
    })
    if (error) {
      // Add-only pipe: earlier items in this batch are already committed, so
      // never fail the whole batch — report per-item and keep going (spec §8).
      console.log(`ingest: rpc failed for "${item.name}": ${error.message}`)
      results.push({ name: item.name, status: 'error' })
      continue
    }
    console.log(`ingest: accepted "${item.name}" -> ${data.status} (qty=${data.qty})`)
    results.push({ ...data, name: item.name })
  }
  const allOk = results.every((r) => r.status !== 'error')
  return json(allOk ? 200 : 207, { results })
})
