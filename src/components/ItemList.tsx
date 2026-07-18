import type { Item } from '../lib/useItems'

type Props = {
  items: Item[]
  onToggle: (item: Item) => void
  onDelete: (item: Item) => void
  disabled: boolean
}

export function ItemList({ items, onToggle, onDelete, disabled }: Props) {
  const active = items.filter((i) => !i.bought)
  const bought = items.filter((i) => i.bought)

  const row = (item: Item) => (
    <li key={item.id} className={item.bought ? 'item bought' : 'item'}>
      <label className="item-main">
        <input
          type="checkbox"
          checked={item.bought}
          disabled={disabled}
          onChange={() => onToggle(item)}
        />
        <span className="item-name">{item.name}</span>
        {item.qty > 1 && <span className="qty-badge">×{item.qty}</span>}
        {item.source === 'whatsapp' && <span className="source-badge" title="נוסף מוואטסאפ">💬</span>}
      </label>
      <button className="delete-btn" disabled={disabled} onClick={() => onDelete(item)} aria-label={`מחק ${item.name}`}>
        🗑
      </button>
    </li>
  )

  return (
    <div className="lists">
      <ul className="list-active">{active.map(row)}</ul>
      {bought.length > 0 && (
        <>
          <h2 className="bought-header">נקנו ({bought.length})</h2>
          <ul className="list-bought">{bought.map(row)}</ul>
        </>
      )}
      {items.length === 0 && <p className="empty">הרשימה ריקה — תוסיפו משהו 🛒</p>}
    </div>
  )
}
