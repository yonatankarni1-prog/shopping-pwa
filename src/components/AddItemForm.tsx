import { type FormEvent, useState } from 'react'

type Props = { onAdd: (name: string) => Promise<void>; disabled: boolean }

export function AddItemForm({ onAdd, disabled }: Props) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const name = value.trim()
    if (!name || busy) return
    setBusy(true)
    try {
      await onAdd(name)
      setValue('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <input
        type="text"
        value={value}
        placeholder="מה להוסיף?"
        disabled={disabled || busy}
        onChange={(e) => setValue(e.target.value)}
        enterKeyHint="done"
      />
      <button type="submit" disabled={disabled || busy}>הוסף</button>
    </form>
  )
}
