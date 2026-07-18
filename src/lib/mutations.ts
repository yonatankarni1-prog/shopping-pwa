import { supabase } from './supabase'
import { type Item } from './useItems'

export type AddResult = { status: 'created' | 'existing'; id: string; name: string; qty: number }

export async function addItem(householdId: string, name: string): Promise<AddResult> {
  const { data, error } = await supabase.rpc('add_item', {
    p_household_id: householdId,
    p_name: name,
  })
  if (error) throw error
  return data as AddResult
}

export async function toggleBought(item: Item): Promise<void> {
  const { error } = await supabase.from('items').update({ bought: !item.bought }).eq('id', item.id)
  if (error) throw error
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

export async function updatePosition(id: string, position: number): Promise<void> {
  const { error } = await supabase.from('items').update({ position }).eq('id', id)
  if (error) throw error
}
