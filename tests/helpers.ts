import { createClient, SupabaseClient } from '@supabase/supabase-js'

export function adminClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export function anonClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
}

// Creates a throwaway household; caller deletes it (cascades to members+items).
export async function makeHousehold(admin: SupabaseClient) {
  const { data, error } = await admin.from('households').insert({}).select().single()
  if (error) throw error
  return data as { id: string; invite_code: string }
}
