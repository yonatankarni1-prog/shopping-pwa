import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Usage: npx tsx --env-file=.env.test seed/seed.ts seed/keep_export.txt
const filePath = process.argv[2]
if (!filePath) { console.log('❌ usage: seed.ts <file>'); process.exit(1) }

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const hid = process.env.PROD_HOUSEHOLD_ID!
const lines = readFileSync(filePath, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

let created = 0, existing = 0, failed = 0
for (const name of lines) {
  const { data, error } = await supabase.rpc('add_item', {
    p_household_id: hid, p_name: name, p_source: 'manual',
  })
  if (error) { failed++; console.log(`❌ ${name}: ${error.message}`); continue }
  if (data.status === 'created') created++; else existing++
  console.log(`✅ ${name} (${data.status})`)
}
console.log(`📊 input=${lines.length} created=${created} existing=${existing} failed=${failed}`)
