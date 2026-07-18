import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export type Item = {
  id: string
  household_id: string
  name: string
  normalized: string
  qty: number
  bought: boolean
  source: 'manual' | 'whatsapp'
  added_by: string | null
  created_at: string
  bought_at: string | null
}

function readCache(key: string): Item[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}

export function useItems(householdId: string) {
  const cacheKey = `items_cache_${householdId}`
  const [items, setItems] = useState<Item[]>(() => readCache(cacheKey))
  const [connected, setConnected] = useState(false)
  const alive = useRef(true)

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
    if (!error && data && alive.current) {
      setItems(data as Item[])
      localStorage.setItem(cacheKey, JSON.stringify(data))
    }
  }, [householdId, cacheKey])

  useEffect(() => {
    alive.current = true
    refetch()

    // Realtime is an optimization only (spec §4.1): every event triggers a
    // refetch; the list is always refetch-derived, never patched from payloads.
    const channel = supabase
      .channel(`items-${householdId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `household_id=eq.${householdId}` },
        () => refetch())
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') refetch() // covers reconnect gaps
      })

    const onVisible = () => { if (document.visibilityState === 'visible') refetch() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', refetch)

    return () => {
      alive.current = false
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', refetch)
    }
  }, [householdId, refetch])

  // applyLocal = optimistic patches only; every refetch overwrites with server truth
  return { items, refetch, connected, applyLocal: setItems }
}
