import { useEffect, useState } from 'react'

export function Toast({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!message) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(t)
  }, [message])
  if (!message || !visible) return null
  return <div className="toast" role="status">{message}</div>
}
