import { useEffect, useState } from 'react'
import { ensureSession, ensureHousehold, joinWithCode } from './lib/session'

// Throwaway proof screen for the walking-skeleton gate (Task 6.5) — replaced
// by the real ListScreen in Task 7.
function SkeletonScreen({ householdId }: { householdId: string }) {
  return (
    <main className="app" style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>רשימת קניות 🛒</h1>
      <p>מחובר ✓ (משק-בית …{householdId.slice(-6)})</p>
    </main>
  )
}

// Minimal inline join fallback — Task 7 brings the real JoinScreen + stylesheet.
function JoinScreen({ onJoined }: { onJoined: (householdId: string) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleJoin() {
    setError(null)
    setBusy(true)
    try {
      const hid = await joinWithCode(code)
      onJoined(hid)
    } catch {
      setError('קוד הזמנה שגוי, נסו שוב')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="app" style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>הצטרפות למשק בית</h1>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="קוד הזמנה"
        style={{ fontSize: '1rem', padding: '0.5rem', marginInlineEnd: '0.5rem' }}
      />
      <button type="button" onClick={handleJoin} disabled={busy || !code.trim()}>
        הצטרף
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  )
}

function App() {
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await ensureSession()
      const hid = await ensureHousehold()
      if (cancelled) return
      setHouseholdId(hid)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) return null

  if (householdId) return <SkeletonScreen householdId={householdId} />

  return <JoinScreen onJoined={setHouseholdId} />
}

export default App
