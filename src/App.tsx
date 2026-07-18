import { type FormEvent, useEffect, useState } from 'react'
import { ensureSession, ensureHousehold, joinWithCode } from './lib/session'
import { useItems } from './lib/useItems'
import { ItemList } from './components/ItemList'

// Manual join fallback — survives iOS Safari↔standalone storage isolation
// even if the launch URL lost the ?invite= param.
function JoinScreen({ onJoined }: { onJoined: (hid: string) => void }) {
  const [code, setCode] = useState('')
  const [failed, setFailed] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
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
  const { items, connected } = useItems(householdId)
  return (
    <main className="app">
      <h1>רשימת קניות 🛒</h1>
      {!connected && <div className="banner warn">עדכון חי מנותק — הרשימה מתרעננת בפתיחה</div>}
      <ItemList items={items} onToggle={() => {}} onDelete={() => {}} disabled={false} />
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
