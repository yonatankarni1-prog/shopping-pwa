import { supabase } from './supabase'

const HOUSEHOLD_KEY = 'household_id'

export async function ensureSession(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

export async function resolveHousehold(
  search: string,
  storage: Storage,
  rpc: (code: string) => Promise<string>,
): Promise<string | null> {
  const invite = new URLSearchParams(search).get('invite')
  if (invite) {
    try {
      const hid = await rpc(invite)
      storage.setItem(HOUSEHOLD_KEY, hid)
      return hid
    } catch {
      // invalid/expired invite — fall back to whatever we already have
    }
  }
  return storage.getItem(HOUSEHOLD_KEY)
}

export async function joinWithCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_household', { p_invite_code: code.trim() })
  if (error) throw error
  localStorage.setItem(HOUSEHOLD_KEY, data as string)
  return data as string
}

// NOTE: the ?invite= param is deliberately NOT stripped from the URL.
// join_household is idempotent, and an iOS "Add to Home Screen" install has a
// SEPARATE storage context from Safari — keeping the param in the installed
// URL lets the standalone app re-redeem the invite on its first launch.
export async function ensureHousehold(): Promise<string | null> {
  return resolveHousehold(location.search, localStorage, (code) => joinWithCode(code))
}
