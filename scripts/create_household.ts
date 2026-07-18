import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Usage: npx tsx --env-file=.env.test scripts/create_household.ts
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data, error } = await supabase.from('households').insert({}).select().single()
if (error) throw error
console.log(`✅ household created`)
console.log(`📊 id=${data.id}`)
console.log(`📊 invite_code=${data.invite_code}`)
