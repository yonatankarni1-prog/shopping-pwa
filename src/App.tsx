import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ensureSession, ensureHousehold, joinWithCode } from './lib/session'
import { useItems, type Item } from './lib/useItems'
import { useOnline } from './lib/useOnline'
import { addItem, toggleBought, deleteItem } from './lib/mutations'
import { ItemList } from './components/ItemList'
import { AddItemForm } from './components/AddItemForm'
import { OfflineBanner } from './components/OfflineBanner'
import { Toast } from './components/Toast'

// Manual join fallback — survives iOS Safari↔standalone storage isolation
// even if the launch URL lost the ?invite= param.
function JoinScreen({ onJoined }: { onJoined: (hid: string) => void }) {
  const [code, setCode] = useState('')
  const [failed, setFailed] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFailed(false)
    try {
      await ensureSession() // idempotent — reuses an existing session; recovers from a failed startup session
      onJoined(await joinWithCode(code))
    } catch {
      setFailed(true)
    }
  }

  return (
    <main className="app">
      <h1>רשימת קניות 🛒</h1>
      <p>פתחו את לינק ההזמנה שקיבלתם, או הקלידו כאן את קוד ההזמנה:</p>
      <form className="add-form" onSubmit={submit}>
        <input type="text" value={code} placeholder="קוד הזמנה" dir="ltr"
          onChange={(e) => setCode(e.target.value)} />
        <button type="submit" disabled={!code.trim()}>הצטרפות</button>
      </form>
      {failed && <p className="error">הקוד לא נכון — בדקו ונסו שוב</p>}
    </main>
  )
}

function ListScreen({ householdId }: { householdId: string }) {
  const { items, refetch, connected, applyLocal } = useItems(householdId)
  const online = useOnline()
  const [toast, setToast] = useState<{ text: string; nonce: number } | null>(null)
  const wasConnected = useRef(false)

  useEffect(() => {
    if (connected) wasConnected.current = true
  }, [connected])

  function showToast(text: string) {
    setToast((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 }))
  }

  async function handleAdd(name: string) {
    try {
      const result = await addItem(householdId, name)
      if (result.status === 'existing') showToast(`"${result.name}" כבר ברשימה ✓ (×${result.qty})`)
      await refetch()
    } catch (e) {
      showToast('ההוספה נכשלה — נסו שוב')
      throw e
    }
  }

  async function handleToggle(item: Item) {
    let snapshot: Item[] = []
    applyLocal((prev) => {
      snapshot = prev
      return prev.map((i) => (i.id === item.id ? { ...i, bought: !item.bought } : i))
    })
    try {
      await toggleBought(item)
    } catch {
      applyLocal(() => snapshot)
      showToast('העדכון נכשל — נסו שוב')
    }
    await refetch() // server truth — rolls the optimistic patch back on failure
  }

  async function handleDelete(item: Item) {
    let snapshot: Item[] = []
    applyLocal((prev) => {
      snapshot = prev
      return prev.filter((i) => i.id !== item.id)
    })
    try {
      await deleteItem(item.id)
    } catch {
      applyLocal(() => snapshot)
      showToast('המחיקה נכשלה — נסו שוב')
    }
    await refetch()
  }

  return (
    <main className="app">
      <h1>רשימת קניות 🛒</h1>
      {!online && <OfflineBanner />}
      {online && !connected && wasConnected.current && <div className="banner warn">עדכון חי מנותק — הרשימה מתרעננת בפתיחה</div>}
      <AddItemForm onAdd={handleAdd} disabled={!online} />
      <ItemList items={items} onToggle={handleToggle} onDelete={handleDelete} disabled={!online} />
      <Toast toast={toast} />
    </main>
  )
}

export default function App() {
  const [householdId, setHouseholdId] = useState<string | null | 'loading'>('loading')

  useEffect(() => {
    (async () => {
      await ensureSession()
      setHouseholdId(await ensureHousehold())
    })().catch(() => setHouseholdId(null))
  }, [])

  if (householdId === 'loading') return <main className="app"><p>טוען…</p></main>
  if (householdId === null) return <JoinScreen onJoined={setHouseholdId} />
  return <ListScreen householdId={householdId} />
}
