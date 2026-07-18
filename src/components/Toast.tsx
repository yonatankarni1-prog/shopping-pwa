import { useEffect, useState } from 'react'

type ToastState = { text: string; nonce: number } | null

export function Toast({ toast }: { toast: ToastState }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!toast) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast || !visible) return null
  return <div className="toast" role="status">{toast.text}</div>
}
