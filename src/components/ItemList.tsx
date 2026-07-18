import type { CSSProperties } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Item } from '../lib/useItems'

type Props = {
  items: Item[]
  onToggle: (item: Item) => void
  onDelete: (item: Item) => void
  onReorder: (itemId: string, newPosition: number) => void
  disabled: boolean
}

type RowProps = {
  item: Item
  disabled: boolean
  onToggle: (item: Item) => void
  onDelete: (item: Item) => void
}

// Shared row markup (checkbox + name + qty badge + delete button) for both
// the sortable active rows and the plain bought rows.
function ItemRow({ item, disabled, onToggle, onDelete }: RowProps) {
  return (
    <>
      <label className="item-main">
        <input
          type="checkbox"
          checked={item.bought}
          disabled={disabled}
          onChange={() => onToggle(item)}
        />
        <span className="item-name">{item.name}</span>
        {item.qty > 1 && <span className="qty-badge">×{item.qty}</span>}
      </label>
      <button className="delete-btn" disabled={disabled} onClick={() => onDelete(item)} aria-label={`מחק ${item.name}`}>
        🗑
      </button>
    </>
  )
}

// Active-list rows only — bought section is never sortable (spec). Drag
// handle sits at the left edge (opposite the checkbox, which is at the RTL
// start/right edge inside item-main) so plain taps on checkbox/delete keep
// working — only the handle carries the drag listeners.
function SortableItemRow({ item, disabled, onToggle, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.6 : undefined,
  }
  return (
    <li ref={setNodeRef} style={style} className="item">
      <ItemRow item={item} disabled={disabled} onToggle={onToggle} onDelete={onDelete} />
      <span
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`גררו לסידור מחדש: ${item.name}`}
      >
        ⠿
      </span>
    </li>
  )
}

export function ItemList({ items, onToggle, onDelete, onReorder, disabled }: Props) {
  const active = items.filter((i) => !i.bought).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const bought = items.filter((i) => i.bought)
    .sort((a, b) => (b.bought_at ?? '').localeCompare(a.bought_at ?? ''))

  // 250ms hold + 5px tolerance: lets normal scrolling/taps through, only a
  // deliberate hold starts a drag. TouchSensor mirrors it in case a device
  // doesn't route touch through PointerSensor correctly.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event
    if (!over || dragged.id === over.id) return
    const oldIndex = active.findIndex((i) => i.id === dragged.id)
    const newIndex = active.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(active, oldIndex, newIndex)
    const draggedIndex = reordered.findIndex((i) => i.id === dragged.id)
    const above = reordered[draggedIndex - 1]
    const below = reordered[draggedIndex + 1]

    let newPosition: number
    if (!above) newPosition = below.position - 1
    else if (!below) newPosition = above.position + 1
    else newPosition = (above.position + below.position) / 2

    if (!Number.isFinite(newPosition)) return

    onReorder(String(dragged.id), newPosition)
  }

  return (
    <div className="lists">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={active.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="list-active">
            {active.map((item) => (
              <SortableItemRow key={item.id} item={item} disabled={disabled} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {bought.length > 0 && (
        <>
          <h2 className="bought-header">נקנו ({bought.length})</h2>
          <ul className="list-bought">
            {bought.map((item) => (
              <li key={item.id} className="item bought">
                <ItemRow item={item} disabled={disabled} onToggle={onToggle} onDelete={onDelete} />
              </li>
            ))}
          </ul>
        </>
      )}
      {items.length === 0 && <p className="empty">הרשימה ריקה — תוסיפו משהו 🛒</p>}
    </div>
  )
}
