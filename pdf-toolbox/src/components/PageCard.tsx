import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PageItem } from '../lib/types'

const COLORS = [
  'border-blue-500',
  'border-green-500',
  'border-orange-500',
  'border-purple-500',
  'border-pink-500',
  'border-teal-500',
]

const BADGE_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-teal-500',
]

type Props = {
  item: PageItem
  order: number
  onRotate: (id: string) => void
  onDelete: (id: string) => void
}

export default function PageCard({ item, order, onRotate, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const c = item.fileColor % COLORS.length

  // กันไม่ให้การกดปุ่มไปเริ่มลาก
  const stop = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative cursor-grab touch-none rounded border-2 bg-white p-1 shadow-sm active:cursor-grabbing ${COLORS[c]} ${
        isDragging ? 'z-10 opacity-40' : ''
      }`}
    >
      <span
        className={`absolute left-1 top-1 z-10 rounded px-1.5 text-xs font-bold text-white ${BADGE_COLORS[c]}`}
      >
        {order}
      </span>

      {/* ปุ่มหมุนและลบ */}
      <div className="absolute right-1 top-1 z-10 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
        <button
          onPointerDown={stop}
          onClick={() => onRotate(item.id)}
          title="หมุน 90°"
          className="rounded bg-black/60 px-1.5 text-sm text-white hover:bg-black/80"
        >
          ↻
        </button>
        <button
          onPointerDown={stop}
          onClick={() => onDelete(item.id)}
          title="ลบหน้านี้"
          className="rounded bg-red-600/80 px-1.5 text-sm text-white hover:bg-red-700"
        >
          ✕
        </button>
      </div>

      {/* กล่องรูป: หมุนรูปด้วย CSS */}
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden">
        <img
          src={item.thumb}
          alt={`หน้า ${order}`}
          draggable={false}
          className="max-h-full max-w-full select-none transition-transform"
          style={{ transform: `rotate(${item.rotation}deg)` }}
        />
      </div>

      <p className="mt-1 truncate text-center text-[10px] text-gray-500">
        {item.fileName} · หน้า {item.pageIndex + 1}
      </p>
    </div>
  )
}